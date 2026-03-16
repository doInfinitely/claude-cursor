const crypto = require('crypto');

class ShareTokenStore {
  constructor() {
    // Map<token, { sessionName, expiresAt }>
    this.tokens = new Map();
    // Cleanup expired tokens every 10 minutes
    this._cleanupInterval = setInterval(() => this._cleanup(), 10 * 60 * 1000);
  }

  /**
   * Create a share token for a session
   * @param {string} sessionName
   * @param {number} expiresInMinutes - Time to live in minutes (default 24h)
   * @returns {{ token: string, expiresAt: string }}
   */
  create(sessionName, expiresInMinutes = 1440) {
    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
    this.tokens.set(token, { sessionName, expiresAt });
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
    return this.tokens.delete(token);
  }

  /**
   * Revoke all tokens for a session
   */
  revokeForSession(sessionName) {
    for (const [token, entry] of this.tokens) {
      if (entry.sessionName === sessionName) {
        this.tokens.delete(token);
      }
    }
  }

  _cleanup() {
    const now = new Date();
    for (const [token, entry] of this.tokens) {
      if (now > entry.expiresAt) {
        this.tokens.delete(token);
      }
    }
  }

  stop() {
    if (this._cleanupInterval) {
      clearInterval(this._cleanupInterval);
      this._cleanupInterval = null;
    }
  }
}

module.exports = ShareTokenStore;
