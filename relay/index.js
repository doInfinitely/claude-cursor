const express = require('express');
const http = require('http');
const httpProxy = require('http-proxy');

const app = express();
const server = http.createServer(app);
const proxy = httpProxy.createProxyServer({ changeOrigin: true, ws: true });

app.use(express.json());

// Token store: token → { tunnelUrl, sessionName, expiresAt }
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

// Register a share token
app.post('/api/register', (req, res) => {
  const { token, tunnelUrl, sessionName, expiresAt } = req.body;
  if (!token || !tunnelUrl || !sessionName) {
    return res.status(400).json({ error: 'token, tunnelUrl, and sessionName are required' });
  }
  tokens.set(token, {
    tunnelUrl: tunnelUrl.replace(/\/$/, ''),
    sessionName,
    expiresAt: expiresAt ? new Date(expiresAt).getTime() : Date.now() + 24 * 60 * 60 * 1000,
  });
  console.log(`[Register] token=${token.slice(0, 8)}… → ${tunnelUrl} session=${sessionName}`);
  res.json({ ok: true });
});

// Revoke tokens for a session
app.post('/api/revoke', (req, res) => {
  const { tunnelUrl, sessionName } = req.body;
  let count = 0;
  for (const [token, entry] of tokens) {
    if (entry.sessionName === sessionName && (!tunnelUrl || entry.tunnelUrl === tunnelUrl)) {
      tokens.delete(token);
      count++;
    }
  }
  console.log(`[Revoke] session=${sessionName} removed=${count}`);
  res.json({ ok: true, removed: count });
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

// Proxy terminal traffic: /p/<token>/* → tunnelUrl/terminal/<sessionName>/*
app.use('/p/:token', (req, res) => {
  const entry = getEntry(req.params.token);
  if (!entry) return res.status(404).send('Link expired or invalid');
  req.url = `/terminal/${entry.sessionName}${req.url}`;
  proxy.web(req, res, { target: entry.tunnelUrl });
});

proxy.on('error', (err, req, res) => {
  console.error('[Proxy] error:', err.message);
  if (res && typeof res.writeHead === 'function' && !res.headersSent) {
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Tunnel unreachable');
  }
});

// WebSocket upgrades for /p/<token>/*
server.on('upgrade', (req, socket, head) => {
  const match = /^\/p\/([a-f0-9]+)(\/.*)?$/.exec(req.url);
  if (!match) { socket.destroy(); return; }
  const entry = getEntry(match[1]);
  if (!entry) { socket.destroy(); return; }
  req.url = `/terminal/${entry.sessionName}${match[2] || '/'}`;
  proxy.ws(req, socket, head, { target: entry.tunnelUrl });
});

const PORT = parseInt(process.env.PORT || '4000', 10);
server.listen(PORT, () => {
  console.log(`Relay server listening on port ${PORT}`);
});
