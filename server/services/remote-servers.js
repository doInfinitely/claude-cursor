const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function getConfigPath() {
  try {
    const { app } = require('electron');
    return path.join(app.getPath('userData'), 'remote-servers.json');
  } catch {
    return path.join(__dirname, '..', '..', '.remote-servers.json');
  }
}

class RemoteServers {
  constructor() {
    this.servers = new Map();
    this._load();
  }

  _load() {
    try {
      const data = JSON.parse(fs.readFileSync(getConfigPath(), 'utf-8'));
      for (const entry of data) {
        this.servers.set(entry.id, entry);
      }
    } catch {
      // No saved config
    }
  }

  _save() {
    const p = getConfigPath();
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, JSON.stringify([...this.servers.values()], null, 2));
  }

  parseUrl(url) {
    // Detect share link: https://host/s/TOKEN
    const shareMatch = url.match(/^(https?:\/\/[^/]+)\/s\/([a-zA-Z0-9_-]+)\/?$/);
    if (shareMatch) {
      return { type: 'share', baseUrl: shareMatch[1], token: shareMatch[2] };
    }
    // Full instance URL: strip trailing slash
    const baseUrl = url.replace(/\/+$/, '');
    return { type: 'instance', baseUrl };
  }

  add({ url, label }) {
    const id = crypto.randomBytes(8).toString('hex');
    const parsed = this.parseUrl(url);
    const entry = {
      id,
      label: label || url,
      url,
      baseUrl: parsed.baseUrl,
      type: parsed.type,
      token: parsed.token || null,
    };
    this.servers.set(id, entry);
    this._save();
    return entry;
  }

  remove(id) {
    const existed = this.servers.delete(id);
    if (existed) this._save();
    return existed;
  }

  list() {
    return [...this.servers.values()];
  }

  get(id) {
    return this.servers.get(id) || null;
  }
}

module.exports = RemoteServers;
