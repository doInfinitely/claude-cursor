const { execSync } = require('child_process');
const crypto = require('crypto');

const SPAWN_ENV = {
  ...process.env,
  PATH: `/usr/local/bin:/opt/homebrew/bin:${process.env.PATH || ''}`
};
delete SPAWN_ENV.TMUX;
delete SPAWN_ENV.TMUX_PANE;

// High-priority: Claude Code tool approval prompts
const APPROVAL_PATTERNS = [
  /This command requires approval/i,
  /requires? (?:your )?approval/i,
  /Allow (?:this )?(?:tool|command|action)/i,
  /Do you want to proceed/i,
];

// Completion: Claude Code finished working
const COMPLETED_PATTERNS = [
  /Churned for \d+/i,
  /Total cost:.*\$/i,
  /session (?:completed|finished|done)/i,
];

// Generic prompts that suggest a session is waiting for human input
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

  reinitialize(apiKey) {
    this.stop();
    this.anthropicClient = null;
    this.mode = process.env.NEEDS_ACTION_MODE || 'hybrid';
    if (apiKey && this.mode !== 'regex') {
      try {
        const Anthropic = require('@anthropic-ai/sdk');
        this.anthropicClient = new Anthropic({ apiKey });
      } catch (err) {
        console.warn('[NeedsAction] Failed to load @anthropic-ai/sdk — falling back to regex mode:', err.message);
        this.mode = 'regex';
      }
    } else if (!apiKey) {
      this.mode = 'regex';
    }
    console.log(`[NeedsAction] Reinitialized in "${this.mode}" mode`);
    this.interval = setInterval(() => this.scanAll(), this.scanIntervalMs);
    this.scanAll();
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
      // Strip ANSI escape sequences so regex patterns match clean text
      return output.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').replace(/\x1b\].*?\x07/g, '');
    } catch {
      return null;
    }
  }

  classifyWithRegex(snapshot) {
    // Look at the last portion of the snapshot for prompt patterns
    // Use last 80 lines — Claude Code approval prompts can be long
    const lines = snapshot.split('\n');
    const tail = lines.slice(-80).join('\n');

    if (process.env.DEBUG_NEEDS_ACTION) {
      console.log('[NeedsAction] Tail (last 20 lines):\n---\n' + tail + '\n---');
    }

    // Check tiered patterns in priority order
    const tiers = [
      { patterns: APPROVAL_PATTERNS, actionType: 'approval', confidence: 0.95 },
      { patterns: COMPLETED_PATTERNS, actionType: 'completed', confidence: 0.9 },
      { patterns: PROMPT_PATTERNS, actionType: 'prompt', confidence: 0.6 },
    ];

    for (const tier of tiers) {
      for (const pattern of tier.patterns) {
        if (pattern.test(tail)) {
          const snippet = this._extractSnippet(tail);
          return {
            needsAction: true,
            actionType: tier.actionType,
            confidence: tier.confidence,
            snippet: snippet.slice(0, 120)
          };
        }
      }
    }

    return { needsAction: false, actionType: null, confidence: 0.9, snippet: null };
  }

  _extractSnippet(tail) {
    const tailLines = tail.split('\n');
    for (let i = tailLines.length - 1; i >= 0; i--) {
      if (tailLines[i].trim()) {
        return tailLines[i].trim();
      }
    }
    return '';
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
            content: `You are analyzing a terminal session snapshot. Determine if the terminal is currently waiting for human input OR if a task has just completed.

Classify into one of these actionType categories:
- "approval": A tool or command requires explicit approval (e.g. "This command requires approval", "Allow this action")
- "completed": A long-running task just finished (e.g. "Churned for 6m 55s", "Total cost: $0.12", a cost/time summary line)
- "prompt": Any other interactive prompt waiting for input (questions, y/n, password, etc.)
- null: No action needed — the terminal is running normally or idle

Terminal snapshot (last lines):
\`\`\`
${tail}
\`\`\`

Respond with ONLY a JSON object (no markdown, no explanation):
{"needsAction": true/false, "actionType": "approval"|"completed"|"prompt"|null, "confidence": 0.0-1.0, "snippet": "the prompt line or null"}`
          }
        ]
      });

      let text = response.content[0].text.trim();
      // Strip markdown code fences if present
      text = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?\s*```$/g, '').trim();
      const parsed = JSON.parse(text);
      const validTypes = ['approval', 'completed', 'prompt'];
      return {
        needsAction: Boolean(parsed.needsAction),
        actionType: validTypes.includes(parsed.actionType) ? parsed.actionType : (parsed.needsAction ? 'prompt' : null),
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
