const { execSync } = require('child_process');
const crypto = require('crypto');

const SPAWN_ENV = {
  ...process.env,
  PATH: `/usr/local/bin:/opt/homebrew/bin:${process.env.PATH || ''}`
};
delete SPAWN_ENV.TMUX;
delete SPAWN_ENV.TMUX_PANE;

class DescriptionService {
  constructor(sessionManager) {
    this.sessionManager = sessionManager;
    this.interval = null;
    this.lastHashes = new Map();
    this.anthropicClient = null;

    this.model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';
    this.scanIntervalMs = parseInt(process.env.DESCRIPTION_SCAN_INTERVAL_MS || '10000', 10);
    this.captureLines = parseInt(process.env.DESCRIPTION_LINES || '200', 10);
  }

  async start() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.warn('[Description] No ANTHROPIC_API_KEY set — service disabled');
      return;
    }

    try {
      const Anthropic = require('@anthropic-ai/sdk');
      this.anthropicClient = new Anthropic({ apiKey });
    } catch (err) {
      console.warn('[Description] Failed to load @anthropic-ai/sdk — service disabled:', err.message);
      return;
    }

    console.log(`[Description] Starting, scanning every ${this.scanIntervalMs}ms`);
    this.interval = setInterval(() => this.scanAll(), this.scanIntervalMs);
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
    if (!apiKey) {
      console.warn('[Description] No API key — service disabled');
      return;
    }
    try {
      const Anthropic = require('@anthropic-ai/sdk');
      this.anthropicClient = new Anthropic({ apiKey });
    } catch (err) {
      console.warn('[Description] Failed to load @anthropic-ai/sdk — service disabled:', err.message);
      return;
    }
    console.log(`[Description] Reinitialized, scanning every ${this.scanIntervalMs}ms`);
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

    const description = await this.generateDescription(snapshot);
    this.sessionManager.updateDescription(name, description);
  }

  capturePane(name) {
    try {
      const output = execSync(
        `tmux capture-pane -t ${name} -b _desccheck -S -${this.captureLines} && tmux show-buffer -b _desccheck && tmux delete-buffer -b _desccheck`,
        { encoding: 'utf-8', timeout: 3000, env: SPAWN_ENV }
      );
      return output;
    } catch {
      return null;
    }
  }

  async generateDescription(snapshot) {
    if (!this.anthropicClient) return null;

    // Check if pane is empty / idle
    const trimmed = snapshot.replace(/\s+/g, '');
    if (!trimmed) return 'Shell idle';

    // Use last ~80 lines for LLM context
    const lines = snapshot.split('\n');
    const tail = lines.slice(-80).join('\n');

    try {
      const response = await this.anthropicClient.messages.create({
        model: this.model,
        max_tokens: 100,
        messages: [
          {
            role: 'user',
            content: `You are analyzing a terminal session snapshot. Generate a very brief 1-line summary (max 80 chars) of what is currently happening in this terminal. Examples: "Running npm install", "Editing server.js with vim", "Shell idle at prompt", "Building project with make", "Running test suite".

Terminal snapshot (last lines):
\`\`\`
${tail}
\`\`\`

Respond with ONLY the summary text, no quotes, no explanation.`
          }
        ]
      });

      let text = response.content[0].text.trim();
      // Truncate to 80 chars
      if (text.length > 80) text = text.slice(0, 77) + '...';
      return text || null;
    } catch (err) {
      console.warn('[Description] LLM call failed:', err.message);
      return null;
    }
  }
}

module.exports = DescriptionService;
