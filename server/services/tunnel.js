const { spawn } = require('child_process');

class TunnelService {
  constructor() {
    this.process = null;
    this.url = null;
  }

  start(port) {
    return new Promise((resolve) => {
      let resolved = false;

      try {
        this.process = spawn('cloudflared', ['tunnel', '--url', `http://127.0.0.1:${port}`], {
          stdio: ['ignore', 'pipe', 'pipe'],
        });
      } catch (err) {
        console.warn('[Tunnel] Failed to spawn cloudflared:', err.message);
        resolve(null);
        return;
      }

      const urlRegex = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/;

      const onData = (data) => {
        const text = data.toString();
        const match = urlRegex.exec(text);
        if (match && !resolved) {
          resolved = true;
          this.url = match[0];
          console.log(`[Tunnel] Connected: ${this.url}`);
          resolve(this.url);
        }
      };

      this.process.stdout.on('data', onData);
      this.process.stderr.on('data', onData);

      this.process.on('error', (err) => {
        console.warn('[Tunnel] cloudflared not available:', err.message);
        if (!resolved) {
          resolved = true;
          resolve(null);
        }
      });

      this.process.on('exit', (code) => {
        console.log(`[Tunnel] Process exited with code ${code}`);
        this.url = null;
        this.process = null;
        if (!resolved) {
          resolved = true;
          resolve(null);
        }
      });

      // Timeout after 15s
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          console.warn('[Tunnel] Timed out waiting for URL');
          resolve(null);
        }
      }, 15000);
    });
  }

  stop() {
    if (this.process) {
      this.process.kill();
      this.process = null;
      this.url = null;
    }
  }

  getUrl() {
    return this.url;
  }
}

module.exports = TunnelService;
