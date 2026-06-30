const express = require('express');
const http = require('http');
const crypto = require('crypto');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ noServer: true });

// JSON parsing must NOT apply to the tunnel proxy routes (/a/*, /p/*):
// it consumes the request stream, so the proxy helpers' 'data'/'end'
// listeners never fire and proxied POSTs hang forever. Scope it to the
// relay's own API routes instead (see app.post below).

// ── Tunnel connections: instanceId → WebSocket ──
const tunnels = new Map();

// ── Token store: token → { instanceId, sessionName, expiresAt } ──
const tokens = new Map();

// Cleanup expired tokens every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [token, entry] of tokens) {
    if (now > entry.expiresAt) tokens.delete(token);
  }
}, 10 * 60 * 1000);

function getEntry(token) {
  const entry = tokens.get(token);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    tokens.delete(token);
    return null;
  }
  return entry;
}

// ── Tunnel WebSocket endpoint ──
wss.on('connection', (ws) => {
  let instanceId = null;

  // Heartbeat
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === 'hello' && msg.instanceId) {
      instanceId = msg.instanceId;
      // Close any existing connection for this instance
      const existing = tunnels.get(instanceId);
      if (existing && existing !== ws && existing.readyState === WebSocket.OPEN) {
        existing.close(1000, 'replaced');
      }
      tunnels.set(instanceId, ws);
      console.log(`[Tunnel] Instance connected: ${instanceId}`);
      ws.send(JSON.stringify({ type: 'welcome' }));
      return;
    }

    // Route responses back to pending requests
    if (msg.type === 'http' && msg.id) {
      const resolve = pendingRequests.get(msg.id);
      if (resolve) {
        pendingRequests.delete(msg.id);
        resolve(msg);
      }
      return;
    }

    // WebSocket channel data from desktop → relay → browser client
    if (msg.type === 'ws-opened' && msg.id) {
      const channel = wsChannels.get(msg.id);
      if (channel) channel.ready = true;
      return;
    }

    if (msg.type === 'ws-data' && msg.id) {
      const channel = wsChannels.get(msg.id);
      if (channel && channel.clientWs && channel.clientWs.readyState === WebSocket.OPEN) {
        channel.clientWs.send(Buffer.from(msg.data, 'base64'));
      }
      return;
    }

    if (msg.type === 'ws-close' && msg.id) {
      const channel = wsChannels.get(msg.id);
      if (channel) {
        if (channel.clientWs && channel.clientWs.readyState === WebSocket.OPEN) {
          channel.clientWs.close();
        }
        wsChannels.delete(msg.id);
      }
      return;
    }
  });

  ws.on('close', () => {
    if (instanceId && tunnels.get(instanceId) === ws) {
      tunnels.delete(instanceId);
      console.log(`[Tunnel] Instance disconnected: ${instanceId}`);
    }
    // Clean up any channels associated with this tunnel
    for (const [id, channel] of wsChannels) {
      if (channel.tunnelWs === ws) {
        if (channel.clientWs && channel.clientWs.readyState === WebSocket.OPEN) {
          channel.clientWs.close();
        }
        wsChannels.delete(id);
      }
    }
  });
});

// Heartbeat interval — ping every 30s, close dead connections
const heartbeat = setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) { ws.terminate(); continue; }
    ws.isAlive = false;
    ws.ping();
  }
}, 30000);

wss.on('close', () => clearInterval(heartbeat));

// ── Pending HTTP requests: reqId → resolve function ──
const pendingRequests = new Map();

// ── WebSocket channels: channelId → { clientWs, tunnelWs, ready } ──
const wsChannels = new Map();

// ── Helper: proxy an HTTP request through a tunnel WebSocket ──
function proxyHttpThroughTunnel(tunnelWs, targetUrl, req, res) {
  const reqId = crypto.randomBytes(8).toString('hex');

  const bodyChunks = [];
  req.on('data', (chunk) => bodyChunks.push(chunk));
  req.on('end', () => {
    const body = bodyChunks.length > 0 ? Buffer.concat(bodyChunks).toString('base64') : undefined;

    const headers = {};
    for (const [key, val] of Object.entries(req.headers)) {
      if (['host', 'connection', 'upgrade'].includes(key.toLowerCase())) continue;
      headers[key] = val;
    }

    tunnelWs.send(JSON.stringify({
      type: 'http',
      id: reqId,
      method: req.method,
      url: targetUrl,
      headers,
      body,
    }));

    const timeout = setTimeout(() => {
      pendingRequests.delete(reqId);
      if (!res.headersSent) res.status(504).send('Tunnel timeout');
    }, 30000);

    pendingRequests.set(reqId, (response) => {
      clearTimeout(timeout);
      try {
        const respHeaders = response.headers || {};
        delete respHeaders['transfer-encoding'];
        res.writeHead(response.status || 200, respHeaders);
        if (response.body) {
          res.end(Buffer.from(response.body, 'base64'));
        } else {
          res.end();
        }
      } catch (err) {
        console.error('[Proxy] Error sending response:', err.message);
        if (!res.headersSent) res.status(500).end();
      }
    });
  });
}

// ── Helper: proxy an HTTP request, rewriting HTML for path prefix ──
function proxyHttpWithRewrite(tunnelWs, targetUrl, req, res, pathPrefix) {
  const reqId = crypto.randomBytes(8).toString('hex');

  const bodyChunks = [];
  req.on('data', (chunk) => bodyChunks.push(chunk));
  req.on('end', () => {
    const body = bodyChunks.length > 0 ? Buffer.concat(bodyChunks).toString('base64') : undefined;

    const headers = {};
    for (const [key, val] of Object.entries(req.headers)) {
      if (['host', 'connection', 'upgrade'].includes(key.toLowerCase())) continue;
      headers[key] = val;
    }

    tunnelWs.send(JSON.stringify({
      type: 'http',
      id: reqId,
      method: req.method,
      url: targetUrl,
      headers,
      body,
    }));

    const timeout = setTimeout(() => {
      pendingRequests.delete(reqId);
      if (!res.headersSent) res.status(504).send('Tunnel timeout');
    }, 30000);

    pendingRequests.set(reqId, (response) => {
      clearTimeout(timeout);
      try {
        const respHeaders = response.headers || {};
        delete respHeaders['transfer-encoding'];
        // Rewrite Location header for redirects
        if (respHeaders['location'] && respHeaders['location'].startsWith('/') && !respHeaders['location'].startsWith(pathPrefix + '/')) {
          respHeaders['location'] = pathPrefix + respHeaders['location'];
        }
        const contentType = (respHeaders['content-type'] || '');

        if (contentType.includes('text/html') && response.body) {
          // Rewrite HTML: inject base path rewriter script before </head>
          let html = Buffer.from(response.body, 'base64').toString('utf-8');
          const rewriteScript = `<script>(function(){var B="${pathPrefix}";function rw(u){return typeof u==="string"&&u.startsWith("/")&&!u.startsWith(B+"/")?B+u:u}var F=window.fetch;window.fetch=function(u,o){return F.call(this,rw(u),o)};var X=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(m,u){arguments[1]=rw(u);return X.apply(this,arguments)};var W=window.WebSocket;window.WebSocket=function(u,p){if(typeof u==="string"){try{var o=new URL(u);if(!o.pathname.startsWith(B+"/")){o.pathname=B+o.pathname;u=o.toString()}}catch(e){u=rw(u)}}return p!==undefined?new W(u,p):new W(u)};window.WebSocket.prototype=W.prototype;window.WebSocket.CONNECTING=W.CONNECTING;window.WebSocket.OPEN=W.OPEN;window.WebSocket.CLOSING=W.CLOSING;window.WebSocket.CLOSED=W.CLOSED;var D=Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype,"src");Object.defineProperty(HTMLIFrameElement.prototype,"src",{set:function(v){return D.set.call(this,rw(v))},get:D.get});var SA=Element.prototype.setAttribute;Element.prototype.setAttribute=function(n,v){if(n==="src"&&this.tagName==="IFRAME")v=rw(v);return SA.call(this,n,v)}})()</script>`;
          html = html.replace('</head>', rewriteScript + '</head>');
          // Rewrite absolute asset paths in HTML
          html = html.replace(/"\/(assets\/)/g, `"${pathPrefix}/$1`);
          delete respHeaders['content-encoding'];
          respHeaders['content-length'] = Buffer.byteLength(html);
          res.writeHead(response.status || 200, respHeaders);
          res.end(html);
        } else {
          res.writeHead(response.status || 200, respHeaders);
          if (response.body) {
            res.end(Buffer.from(response.body, 'base64'));
          } else {
            res.end();
          }
        }
      } catch (err) {
        console.error('[Proxy] Error sending response:', err.message);
        if (!res.headersSent) res.status(500).end();
      }
    });
  });
}

// ── Helper: bridge a WebSocket through a tunnel ──
function bridgeWebSocket(tunnelWs, targetUrl, req, socket, head) {
  const channelId = crypto.randomBytes(8).toString('hex');
  // Extract subprotocols from client request
  const protocols = (req.headers['sec-websocket-protocol'] || '').split(',').map(s => s.trim()).filter(Boolean);
  const clientWss = new WebSocket.Server({ noServer: true, handleProtocols: () => protocols[0] || false });
  clientWss.handleUpgrade(req, socket, head, (clientWs) => {
    wsChannels.set(channelId, { clientWs, tunnelWs, ready: false });

    tunnelWs.send(JSON.stringify({
      type: 'ws-open',
      id: channelId,
      url: targetUrl,
      protocols,
    }));

    clientWs.on('message', (data) => {
      if (tunnelWs.readyState === WebSocket.OPEN) {
        const encoded = Buffer.isBuffer(data) ? data.toString('base64') : Buffer.from(data).toString('base64');
        tunnelWs.send(JSON.stringify({
          type: 'ws-data',
          id: channelId,
          data: encoded,
        }));
      }
    });

    clientWs.on('close', () => {
      wsChannels.delete(channelId);
      if (tunnelWs.readyState === WebSocket.OPEN) {
        tunnelWs.send(JSON.stringify({ type: 'ws-close', id: channelId }));
      }
    });

    clientWs.on('error', () => {
      wsChannels.delete(channelId);
      if (tunnelWs.readyState === WebSocket.OPEN) {
        tunnelWs.send(JSON.stringify({ type: 'ws-close', id: channelId }));
      }
    });
  });
}

// ── REST API ──

// List all active tokens
app.get('/api/tokens', (req, res) => {
  const now = Date.now();
  const list = [];
  for (const [token, entry] of tokens) {
    if (now <= entry.expiresAt) {
      list.push({
        token: token.slice(0, 8) + '…',
        instanceId: entry.instanceId,
        sessionName: entry.sessionName,
        expiresAt: new Date(entry.expiresAt).toISOString(),
      });
    }
  }
  res.json({ count: list.length, tokens: list });
});

// Register a share token
app.post('/api/register', express.json(), (req, res) => {
  const { token, instanceId, sessionName, expiresAt } = req.body;
  if (!token || !instanceId || !sessionName) {
    return res.status(400).json({ error: 'token, instanceId, and sessionName are required' });
  }
  tokens.set(token, {
    instanceId,
    sessionName,
    expiresAt: expiresAt ? new Date(expiresAt).getTime() : Date.now() + 24 * 60 * 60 * 1000,
  });
  console.log(`[Register] token=${token.slice(0, 8)}… → instance=${instanceId} session=${sessionName}`);
  res.json({ ok: true });
});

// Revoke tokens for a session
app.post('/api/revoke', express.json(), (req, res) => {
  const { instanceId, sessionName } = req.body;
  let count = 0;
  for (const [token, entry] of tokens) {
    if (entry.sessionName === sessionName && (!instanceId || entry.instanceId === instanceId)) {
      tokens.delete(token);
      count++;
    }
  }
  console.log(`[Revoke] session=${sessionName} removed=${count}`);
  res.json({ ok: true, removed: count });
});

// API: resolve a share token (used by iOS companion app)
app.get('/api/sessions/share/:token', (req, res) => {
  const entry = getEntry(req.params.token);
  if (!entry) return res.status(404).json({ error: 'Link expired or invalid' });
  const online = tunnels.has(entry.instanceId);
  res.json({ sessionName: entry.sessionName, status: online ? 'active' : 'offline' });
});

// Share page — serves minimal HTML with iframe to proxied terminal
app.get('/s/:token', (req, res) => {
  const entry = getEntry(req.params.token);
  if (!entry) return res.status(404).send('Link expired or invalid');
  res.type('html').send(`<!DOCTYPE html>
<html><head>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Terminal</title>
  <style>html,body{margin:0;height:100%;background:#000}
  iframe{width:100%;height:100%;border:none}</style>
</head><body>
  <iframe src="/p/${req.params.token}/" allow="clipboard-read;clipboard-write"></iframe>
</body></html>`);
});

// ── Full-app proxy: /a/<instanceId>/* → desktop app ──
app.use('/a/:instanceId', (req, res) => {
  const tunnelWs = tunnels.get(req.params.instanceId);
  if (!tunnelWs || tunnelWs.readyState !== WebSocket.OPEN) {
    return res.status(502).send('Desktop app is offline');
  }

  const targetUrl = req.url === '/' ? '/' : req.url;
  const pathPrefix = `/a/${req.params.instanceId}`;
  proxyHttpWithRewrite(tunnelWs, targetUrl, req, res, pathPrefix);
});

// ── Per-session proxy: /p/<token>/* → desktop terminal ──
app.use('/p/:token', (req, res) => {
  const entry = getEntry(req.params.token);
  if (!entry) return res.status(404).send('Link expired or invalid');

  const tunnelWs = tunnels.get(entry.instanceId);
  if (!tunnelWs || tunnelWs.readyState !== WebSocket.OPEN) {
    return res.status(502).send('Desktop app is offline');
  }

  const targetUrl = `/terminal/${entry.sessionName}${req.url}`;
  proxyHttpThroughTunnel(tunnelWs, targetUrl, req, res);
});

// ── WebSocket upgrades ──
server.on('upgrade', (req, socket, head) => {
  // Tunnel endpoint
  if (req.url === '/tunnel') {
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
    return;
  }

  // Full-app WebSocket proxy: /a/<instanceId>/*
  const appMatch = /^\/a\/([a-z0-9-]+)(\/.*)?$/.exec(req.url);
  if (appMatch) {
    const tunnelWs = tunnels.get(appMatch[1]);
    if (!tunnelWs || tunnelWs.readyState !== WebSocket.OPEN) {
      socket.destroy();
      return;
    }
    const targetUrl = appMatch[2] || '/';
    bridgeWebSocket(tunnelWs, targetUrl, req, socket, head);
    return;
  }

  // Per-session WebSocket proxy: /p/<token>/*
  const match = /^\/p\/([a-z0-9-]+)(\/.*)?$/.exec(req.url);
  if (!match) { socket.destroy(); return; }

  const entry = getEntry(match[1]);
  if (!entry) { socket.destroy(); return; }

  const tunnelWs = tunnels.get(entry.instanceId);
  if (!tunnelWs || tunnelWs.readyState !== WebSocket.OPEN) {
    socket.destroy();
    return;
  }

  const targetUrl = `/terminal/${entry.sessionName}${match[2] || '/'}`;
  bridgeWebSocket(tunnelWs, targetUrl, req, socket, head);
});

const PORT = parseInt(process.env.PORT || '4000', 10);
server.listen(PORT, () => {
  console.log(`Relay server listening on port ${PORT}`);
});
