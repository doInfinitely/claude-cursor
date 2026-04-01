const { spawn } = require('child_process');

class TunnelService {
  constructor() {
    this.process = null;
    this.url = null;
    this.tokenMode = false;
  }

  start(port) {
    const token = process.env.CLOUDFLARE_TUNNEL_TOKEN;
    if (token) {
      return this._startWithToken(token, port);
    }
    return this._startQuickTunnel(port);
  }

  _startWithToken(token, port) {
    this.tokenMode = true;
    return new Promise((resolve) => {
      let resolved = false;

      try {
        this.process = spawn('cloudflared', ['tunnel', 'run', '--token', token], {
          stdio: ['ignore', 'pipe', 'pipe'],
        });
      } catch (err) {
        console.warn('[Tunnel] Failed to spawn cloudflared:', err.message);
        resolve(null);
        return;
      }

      const connRegex = /Registered tunnel connection|Connection .* registered|INF \|/i;

      const onData = (data) => {
        const text = data.toString();
        if (connRegex.test(text) && !resolved) {
          resolved = true;
          this.url = process.env.BASE_URL || null;
          console.log(`[Tunnel] Named tunnel connected${this.url ? `: ${this.url}` : ''}`);
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

      // Timeout after 30s (named tunnels can take longer to register)
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          // Named tunnel may still be connecting — use BASE_URL if available
          this.url = process.env.BASE_URL || null;
          if (this.url) {
            console.warn('[Tunnel] Timed out waiting for connection confirmation, using BASE_URL');
            resolve(this.url);
          } else {
            console.warn('[Tunnel] Timed out waiting for connection');
            resolve(null);
          }
        }
      }, 30000);
    });
  }

  _startQuickTunnel(port) {
    this.tokenMode = false;
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
      this.process.removeAllListeners();
      this.process.stdout.removeAllListeners();
      this.process.stderr.removeAllListeners();
      this.process.kill();
      this.process = null;
      this.url = null;
    }
  }

  async restart(port) {
    this.stop();
    return this.start(port);
  }

  getUrl() {
    if (this.tokenMode) {
      return process.env.BASE_URL || this.url;
    }
    return this.url;
  }

  isTokenMode() {
    return this.tokenMode;
  }
}

module.exports = TunnelService;
