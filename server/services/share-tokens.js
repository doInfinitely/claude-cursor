const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const WORDLIST = require('../data/wordlist.json');

class ShareTokenStore {
  constructor(dataDir) {
    // Map<token, { sessionName, expiresAt }>
    this.tokens = new Map();
    this.filePath = null;

    if (dataDir) {
      fs.mkdirSync(dataDir, { recursive: true });
      this.filePath = path.join(dataDir, 'share-tokens.json');
      this._load();
    }

    // Cleanup expired tokens every 10 minutes
    this._cleanupInterval = setInterval(() => this._cleanup(), 10 * 60 * 1000);
  }

  _load() {
    if (!this.filePath) return;
    try {
      const data = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
      const now = new Date();
      for (const entry of data) {
        const expiresAt = new Date(entry.expiresAt);
        if (expiresAt > now) {
          this.tokens.set(entry.token, { sessionName: entry.sessionName, expiresAt });
        }
      }
      console.log(`[ShareTokens] Loaded ${this.tokens.size} token(s) from disk`);
    } catch (err) {
      if (err.code !== 'ENOENT') {
        console.warn('[ShareTokens] Failed to load tokens:', err.message);
      }
    }
  }

  _save() {
    if (!this.filePath) return;
    try {
      const entries = [];
      for (const [token, { sessionName, expiresAt }] of this.tokens) {
        entries.push({ token, sessionName, expiresAt: expiresAt.toISOString() });
      }
      fs.writeFileSync(this.filePath, JSON.stringify(entries, null, 2));
    } catch (err) {
      console.warn('[ShareTokens] Failed to save tokens:', err.message);
    }
  }

  /**
   * Create a share token for a session
   * @param {string} sessionName
   * @param {number} expiresInMinutes - Time to live in minutes (default 24h)
   * @returns {{ token: string, expiresAt: string }}
   */
  create(sessionName, expiresInMinutes = 1440) {
    const token = Array.from({ length: 4 }, () =>
      WORDLIST[crypto.randomInt(WORDLIST.length)]
    ).join('-');
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
    this.tokens.set(token, { sessionName, expiresAt });
    this._save();
    return { token, expiresAt: expiresAt.toISOString() };
  }

  /**
   * Validate a token — returns { sessionName } if valid, null if expired/invalid
   * @param {string} token
   * @returns {{ sessionName: string } | null}
   */
  validate(token) {
    const entry = this.tokens.get(token);
    if (!entry) return null;
    if (new Date() > entry.expiresAt) {
      this.tokens.delete(token);
      this._save();
      return null;
    }
    return { sessionName: entry.sessionName };
  }

  /**
   * List active (non-expired) tokens for a session
   */
  listForSession(sessionName) {
    const result = [];
    for (const [token, entry] of this.tokens) {
      if (entry.sessionName === sessionName && new Date() <= entry.expiresAt) {
        result.push({ token, expiresAt: entry.expiresAt.toISOString() });
      }
    }
    return result;
  }

  /**
   * Revoke a single token
   */
  revoke(token) {
    const deleted = this.tokens.delete(token);
    if (deleted) this._save();
    return deleted;
  }

  /**
   * Revoke all tokens for a session
   */
  revokeForSession(sessionName) {
    let changed = false;
    for (const [token, entry] of this.tokens) {
      if (entry.sessionName === sessionName) {
        this.tokens.delete(token);
        changed = true;
      }
    }
    if (changed) this._save();
  }

  _cleanup() {
    const now = new Date();
    let changed = false;
    for (const [token, entry] of this.tokens) {
      if (now > entry.expiresAt) {
        this.tokens.delete(token);
        changed = true;
      }
    }
    if (changed) this._save();
  }

  stop() {
    if (this._cleanupInterval) {
      clearInterval(this._cleanupInterval);
      this._cleanupInterval = null;
    }
  }
}

module.exports = ShareTokenStore;
