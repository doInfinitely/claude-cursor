const { execSync } = require('child_process');
const crypto = require('crypto');

const SPAWN_ENV = {
  ...process.env,
  PATH: `/usr/local/bin:/opt/homebrew/bin:${process.env.PATH || ''}`
};
delete SPAWN_ENV.TMUX;
delete SPAWN_ENV.TMUX_PANE;

// Regex patterns that suggest a session is waiting for human input
const PROMPT_PATTERNS = [
  // Generic prompts ending with ?
  /\?\s*$/m,
  // Yes/no prompts
  /\[y\/n\]/i,
  /\(y\/n\)/i,
  /\(yes\/no\)/i,
  // Press enter / continue prompts
  /press enter/i,
  /press any key/i,
  /hit enter/i,
  // Claude Code specific patterns
  /Do you want to proceed/i,
  /Allow this action/i,
  /approve|deny|reject/i,
  // Common CLI prompts
  /\[Y\/n\]/,
  /\[n\/Y\]/,
  /Continue\?/i,
  /Proceed\?/i,
  /Are you sure/i,
  /confirm/i,
  /password:/i,
  /passphrase:/i,
  // Waiting input patterns
  /waiting for input/i,
  /enter (?:a |your )?(?:value|choice|selection|option|response|answer|name|number)/i,
];

class NeedsActionService {
  constructor(sessionManager) {
    this.sessionManager = sessionManager;
    this.interval = null;
    this.lastHashes = new Map();
    this.anthropicClient = null;

    this.mode = process.env.NEEDS_ACTION_MODE || 'hybrid';
    this.model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';
    this.scanIntervalMs = parseInt(process.env.NEEDS_ACTION_SCAN_INTERVAL_MS || '3000', 10);
    this.captureLines = parseInt(process.env.NEEDS_ACTION_LINES || '200', 10);
  }

  async start() {
    if (this.mode !== 'regex') {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        console.warn('[NeedsAction] No ANTHROPIC_API_KEY set — falling back to regex mode');
        this.mode = 'regex';
      } else {
        try {
          const Anthropic = require('@anthropic-ai/sdk');
          this.anthropicClient = new Anthropic({ apiKey });
        } catch (err) {
          console.warn('[NeedsAction] Failed to load @anthropic-ai/sdk — falling back to regex mode:', err.message);
          this.mode = 'regex';
        }
      }
    }

    console.log(`[NeedsAction] Starting in "${this.mode}" mode, scanning every ${this.scanIntervalMs}ms`);
    this.interval = setInterval(() => this.scanAll(), this.scanIntervalMs);
    // Run first scan immediately
    this.scanAll();
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  async scanAll() {
    const sessions = this.sessionManager.list();
    for (const session of sessions) {
      if (session.status !== 'running') continue;
      try {
        await this.scanSession(session.name);
      } catch (err) {
        // Silently skip — session may have stopped between list and scan
      }
    }
  }

  async scanSession(name) {
    const snapshot = this.capturePane(name);
    if (snapshot === null) return;

    const hash = crypto.createHash('md5').update(snapshot).digest('hex');
    if (this.lastHashes.get(name) === hash) return;
    this.lastHashes.set(name, hash);

    let result;
    if (this.mode === 'regex') {
      result = this.classifyWithRegex(snapshot);
    } else if (this.mode === 'anthropic') {
      result = await this.classifyWithLLM(snapshot);
    } else {
      // hybrid: regex prefilter, then LLM confirmation
      const regexResult = this.classifyWithRegex(snapshot);
      if (regexResult.needsAction) {
        result = await this.classifyWithLLM(snapshot);
      } else {
        result = regexResult;
      }
    }

    this.sessionManager.updateNeedsAction(name, result);
  }

  capturePane(name) {
    try {
      // Use a named buffer and delete it immediately to avoid overwriting
      // the tmux paste buffer (which can sync to system clipboard via OSC 52)
      const output = execSync(
        `tmux capture-pane -t ${name} -b _nacheck -S -${this.captureLines} && tmux show-buffer -b _nacheck && tmux delete-buffer -b _nacheck`,
        { encoding: 'utf-8', timeout: 3000, env: SPAWN_ENV }
      );
      return output;
    } catch {
      return null;
    }
  }

  classifyWithRegex(snapshot) {
    // Look at the last portion of the snapshot (last ~20 lines) for prompt patterns
    const lines = snapshot.split('\n');
    const tail = lines.slice(-20).join('\n');

    for (const pattern of PROMPT_PATTERNS) {
      if (pattern.test(tail)) {
        // Extract the matching line as snippet
        const tailLines = tail.split('\n');
        let snippet = '';
        for (let i = tailLines.length - 1; i >= 0; i--) {
          if (tailLines[i].trim()) {
            snippet = tailLines[i].trim();
            break;
          }
        }
        return {
          needsAction: true,
          confidence: 0.6,
          snippet: snippet.slice(0, 120)
        };
      }
    }

    return { needsAction: false, confidence: 0.9, snippet: null };
  }

  async classifyWithLLM(snapshot) {
    if (!this.anthropicClient) {
      return this.classifyWithRegex(snapshot);
    }

    // Use last ~80 lines for LLM context to save tokens
    const lines = snapshot.split('\n');
    const tail = lines.slice(-80).join('\n');

    try {
      const response = await this.anthropicClient.messages.create({
        model: this.model,
        max_tokens: 150,
        messages: [
          {
            role: 'user',
            content: `You are analyzing a terminal session snapshot. Determine if the terminal is currently waiting for human input (e.g., a confirmation prompt, a question, password entry, approval request, or any interactive prompt that blocks until the user types something).

Terminal snapshot (last lines):
\`\`\`
${tail}
\`\`\`

Respond with ONLY a JSON object (no markdown, no explanation):
{"needsAction": true/false, "confidence": 0.0-1.0, "snippet": "the prompt line or null"}`
          }
        ]
      });

      let text = response.content[0].text.trim();
      // Strip markdown code fences if present
      text = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?\s*```$/g, '').trim();
      const parsed = JSON.parse(text);
      return {
        needsAction: Boolean(parsed.needsAction),
        confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0.5)),
        snippet: parsed.snippet ? String(parsed.snippet).slice(0, 120) : null
      };
    } catch (err) {
      console.warn('[NeedsAction] LLM classification failed:', err.message);
      // Fall back to regex on LLM failure
      return this.classifyWithRegex(snapshot);
    }
  }
}

module.exports = NeedsActionService;
