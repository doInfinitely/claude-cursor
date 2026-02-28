require('dotenv').config();
const express = require('express');
const path = require('path');
const http = require('http');
const { createProxyMiddleware } = require('http-proxy-middleware');
const SessionManager = require('./services/session-manager');
const NeedsActionService = require('./services/needs-action');
const sessionsRoute = require('./routes/sessions');
const setupWebSocket = require('./ws');

function createApp(portStart, portEnd) {
  const app = express();
  const server = http.createServer(app);

  app.use(express.json());

  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      console.log(`[API] ${req.method} ${req.path}`);
    }
    next();
  });

  const sessionManager = new SessionManager(portStart, portEnd);

  function resolveRunningSession(name) {
    if (!name) return null;
    try {
      const session = sessionManager.getSession(name);
      if (session.status !== 'running') return null;
      return session;
    } catch (err) {
      return null;
    }
  }

  function getSessionNameFromUrl(url) {
    if (!url) return null;
    const match = /^\/terminal\/([^/?#]+)(?:[/?#]|$)/.exec(url);
    return match ? match[1] : null;
  }

  const ttydProxy = createProxyMiddleware({
    target: 'http://127.0.0.1',
    changeOrigin: true,
    router: (req) => `http://127.0.0.1:${req.ttydSession.port}`,
    pathRewrite: (path, req) => req.originalUrl || req.url,
    onError: (err, req, res) => {
      console.error('Proxy error:', err);
      if (res && typeof res.status === 'function' && !res.headersSent) {
        res.status(502).json({ error: 'Proxy error' });
      }
    }
  });

  // Proxy /terminal/:name to corresponding ttyd instance
  app.use('/terminal/:name', (req, res, next) => {
    const session = resolveRunningSession(req.params.name);
    if (!session) {
      return res.status(404).json({ error: 'Session not found or not running' });
    }
    req.ttydSession = session;
    next();
  });
  app.use('/terminal', (req, res, next) => {
    if (!req.ttydSession) {
      return res.status(404).json({ error: 'Session not found or not running' });
    }
    next();
  });
  app.use('/terminal', ttydProxy);

  // API routes
  app.use('/api/sessions', sessionsRoute(sessionManager));

  // Serve frontend static files in production
  const publicDir = path.join(__dirname, 'public');
  app.use(express.static(publicDir));
  app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });

  // WebSocket
  setupWebSocket(server, sessionManager);

  server.on('upgrade', (req, socket, head) => {
    const sessionName = getSessionNameFromUrl(req.url);
    if (!sessionName) return;
    const session = resolveRunningSession(sessionName);
    if (!session) {
      socket.destroy();
      return;
    }
    req.ttydSession = session;
    ttydProxy.upgrade(req, socket, head);
  });

  const needsActionService = new NeedsActionService(sessionManager);

  return { app, server, sessionManager, needsActionService };
}

async function start(port, host) {
  const portStart = parseInt(process.env.TTYD_PORT_RANGE_START || '7681', 10);
  const portEnd = parseInt(process.env.TTYD_PORT_RANGE_END || '7780', 10);

  const { server, sessionManager, needsActionService } = createApp(portStart, portEnd);

  return new Promise((resolve) => {
    server.listen(port, host, async () => {
      const addr = server.address();
      console.log(`Claude Cursor running at http://${host}:${addr.port}`);
      await sessionManager.recoverSessions();
      needsActionService.start();
      resolve({ server, sessionManager, needsActionService });
    });
  });
}

// Run standalone when executed directly
if (require.main === module) {
  const PORT = parseInt(process.env.PORT || '3000', 10);
  const HOST = process.env.HOST || '0.0.0.0';

  start(PORT, HOST).then(({ sessionManager, needsActionService }) => {
    function cleanup() {
      console.log('\nCleaning up...');
      needsActionService.stop();
      sessionManager.cleanup();
      process.exit(0);
    }

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
  });
}

module.exports = { start };
