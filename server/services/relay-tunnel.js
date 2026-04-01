const WebSocket = require('ws');
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const WORDLIST = require('../data/wordlist.json');

class RelayTunnel {
  constructor(relayUrl, localPort, dataDir) {
    this.relayUrl = relayUrl.replace(/\/$/, '');
    this.localPort = localPort;
    this.dataDir = dataDir;
    this.ws = null;
    this.instanceId = this._loadOrCreateInstanceId();
    this.connected = false;
    this.reconnectDelay = 1000;
    this.maxReconnectDelay = 30000;
    this.reconnectTimer = null;
    this.stopped = false;
  }

  _loadOrCreateInstanceId() {
    const filePath = path.join(this.dataDir, 'instance-id');
    try {
      const id = fs.readFileSync(filePath, 'utf-8').trim();
      if (id) return id;
    } catch {}
    return this._regenerateInstanceId();
  }

  _regenerateInstanceId() {
    const filePath = path.join(this.dataDir, 'instance-id');
    const id = Array.from({ length: 4 }, () =>
      WORDLIST[crypto.randomInt(WORDLIST.length)]
    ).join('-');
    fs.mkdirSync(this.dataDir, { recursive: true });
    fs.writeFileSync(filePath, id);
    console.log(`[RelayTunnel] Generated new instanceId: ${id}`);
    return id;
  }

  resetInstanceId() {
    this.instanceId = this._regenerateInstanceId();
    // Reconnect with new identity
    if (this.ws) {
      this.ws.close();
    }
    return this.instanceId;
  }

  start() {
    this.stopped = false;
    this._connect();
  }

  _connect() {
    if (this.stopped) return;

    const wsUrl = this.relayUrl.replace(/^http/, 'ws') + '/tunnel';
    console.log(`[RelayTunnel] Connecting to ${wsUrl}...`);

    try {
      this.ws = new WebSocket(wsUrl);
    } catch (err) {
      console.warn(`[RelayTunnel] Failed to create WebSocket:`, err.message);
      this._scheduleReconnect();
      return;
    }

    this.ws.on('open', () => {
      console.log(`[RelayTunnel] Connected, sending hello`);
      this.ws.send(JSON.stringify({ type: 'hello', instanceId: this.instanceId }));
      this.reconnectDelay = 1000;
    });

    this.ws.on('message', (raw) => {
      let msg;
      try { msg = JSON.parse(raw); } catch { return; }

      switch (msg.type) {
        case 'welcome':
          this.connected = true;
          console.log(`[RelayTunnel] Connected to relay as ${this.instanceId}`);
          break;
        case 'http':
          this._handleHttpRequest(msg);
          break;
        case 'ws-open':
          this._handleWsOpen(msg);
          break;
        case 'ws-data':
          this._handleWsData(msg);
          break;
        case 'ws-close':
          this._handleWsClose(msg);
          break;
      }
    });

    this.ws.on('close', () => {
      this.connected = false;
      this._cleanupChannels();
      if (!this.stopped) {
        console.log(`[RelayTunnel] Disconnected, will reconnect...`);
        this._scheduleReconnect();
      }
    });

    this.ws.on('error', (err) => {
      console.warn(`[RelayTunnel] WebSocket error:`, err.message);
    });

    // Respond to pings (ws library does this automatically, but be explicit)
    this.ws.on('ping', () => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.pong();
      }
    });
  }

  _scheduleReconnect() {
    if (this.stopped) return;
    const delay = this.reconnectDelay;
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
    console.log(`[RelayTunnel] Reconnecting in ${delay}ms...`);
    this.reconnectTimer = setTimeout(() => this._connect(), delay);
  }

  // ── Handle proxied HTTP request ──
  _handleHttpRequest(msg) {
    const { id, method, url, headers, body } = msg;

    const options = {
      hostname: '127.0.0.1',
      port: this.localPort,
      path: url,
      method: method,
      headers: headers || {},
    };

    const req = http.request(options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const responseBody = Buffer.concat(chunks);
        const respHeaders = {};
        for (const [key, val] of Object.entries(res.headers)) {
          respHeaders[key] = val;
        }
        this._send({
          type: 'http',
          id,
          status: res.statusCode,
          headers: respHeaders,
          body: responseBody.toString('base64'),
        });
      });
      res.on('error', (err) => {
        console.error(`[RelayTunnel] Response stream error for ${id}:`, err.message);
        this._send({ type: 'http', id, status: 502, headers: {}, body: Buffer.from('Local proxy error').toString('base64') });
      });
    });

    req.on('error', (err) => {
      console.error(`[RelayTunnel] Local request error for ${id}:`, err.message);
      this._send({ type: 'http', id, status: 502, headers: {}, body: Buffer.from('Local server unreachable').toString('base64') });
    });

    req.setTimeout(25000, () => {
      req.destroy();
      this._send({ type: 'http', id, status: 504, headers: {}, body: Buffer.from('Local request timeout').toString('base64') });
    });

    if (body) {
      req.end(Buffer.from(body, 'base64'));
    } else {
      req.end();
    }
  }

  // ── WebSocket channel management ──
  // channels: channelId → local WebSocket
  _channels = new Map();

  _handleWsOpen(msg) {
    const { id, url } = msg;
    const wsUrl = `ws://127.0.0.1:${this.localPort}${url}`;

    let localWs;
    try {
      localWs = new WebSocket(wsUrl);
    } catch (err) {
      console.error(`[RelayTunnel] Failed to open local WS for channel ${id}:`, err.message);
      this._send({ type: 'ws-close', id });
      return;
    }

    this._channels.set(id, localWs);

    localWs.on('open', () => {
      this._send({ type: 'ws-opened', id });
    });

    localWs.on('message', (data) => {
      const encoded = Buffer.isBuffer(data) ? data.toString('base64') : Buffer.from(data).toString('base64');
      this._send({ type: 'ws-data', id, data: encoded });
    });

    localWs.on('close', () => {
      this._channels.delete(id);
      this._send({ type: 'ws-close', id });
    });

    localWs.on('error', (err) => {
      console.warn(`[RelayTunnel] Local WS error for channel ${id}:`, err.message);
      this._channels.delete(id);
      this._send({ type: 'ws-close', id });
    });
  }

  _handleWsData(msg) {
    const localWs = this._channels.get(msg.id);
    if (localWs && localWs.readyState === WebSocket.OPEN) {
      localWs.send(Buffer.from(msg.data, 'base64'));
    }
  }

  _handleWsClose(msg) {
    const localWs = this._channels.get(msg.id);
    if (localWs) {
      this._channels.delete(msg.id);
      if (localWs.readyState === WebSocket.OPEN) {
        localWs.close();
      }
    }
  }

  _cleanupChannels() {
    for (const [id, localWs] of this._channels) {
      if (localWs.readyState === WebSocket.OPEN) {
        localWs.close();
      }
    }
    this._channels.clear();
  }

  _send(msg) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  isConnected() {
    return this.connected;
  }

  getInstanceId() {
    return this.instanceId;
  }

  stop() {
    this.stopped = true;
    this.connected = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this._cleanupChannels();
    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws.close();
      this.ws = null;
    }
  }
}

module.exports = RelayTunnel;
