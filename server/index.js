require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { createProxyMiddleware } = require('http-proxy-middleware');

// Persist key-value pairs to a .env file (append/update)
function persistEnvVar(key, value) {
  // Try Electron userData path first, fall back to project root
  let envPath;
  try {
    const { app } = require('electron');
    envPath = path.join(app.getPath('userData'), '.env');
  } catch {
    envPath = path.join(__dirname, '..', '.env');
  }

  let content = '';
  try { content = fs.readFileSync(envPath, 'utf-8'); } catch { /* new file */ }

  const re = new RegExp(`^${key}=.*$`, 'm');
  const line = `${key}=${value}`;
  if (re.test(content)) {
    content = content.replace(re, line);
  } else {
    content = content.trimEnd() + '\n' + line + '\n';
  }
  fs.mkdirSync(path.dirname(envPath), { recursive: true });
  fs.writeFileSync(envPath, content);
  console.log(`[Config] Saved ${key} to ${envPath}`);
}

// Persist/load notifyConfig for sessions
function getNotifyConfigPath() {
  try {
    const { app } = require('electron');
    return path.join(app.getPath('userData'), 'notify-config.json');
  } catch {
    return path.join(__dirname, '..', '.notify-config.json');
  }
}

function loadNotifyConfigs() {
  try {
    return JSON.parse(fs.readFileSync(getNotifyConfigPath(), 'utf-8'));
  } catch {
    return {};
  }
}

function saveNotifyConfigs(configs) {
  const p = getNotifyConfigPath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(configs, null, 2));
}
const SessionManager = require('./services/session-manager');
const NeedsActionService = require('./services/needs-action');
const DescriptionService = require('./services/description');
const NotifierService = require('./services/notifier');
const DiscordBot = require('./services/discord-bot');
const SlackBot = require('./services/slack-bot');
const TunnelService = require('./services/tunnel');
const sessionsRoute = require('./routes/sessions');
const setupWebSocket = require('./ws');

function createApp(portStart, portEnd) {
  const app = express();
  const server = http.createServer(app);

  app.use(express.json());

  // Allow clipboard access in iframes (needed for paste in ttyd terminals)
  app.use((req, res, next) => {
    res.setHeader('Permissions-Policy', 'clipboard-read=(self), clipboard-write=(self)');
    if (req.path.startsWith('/api')) {
      console.log(`[API] ${req.method} ${req.path}`);
    }
    next();
  });

  const sessionManager = new SessionManager(portStart, portEnd);

  // Notification bots (start lazily — they connect only if tokens are configured)
  const discordBot = new DiscordBot();
  const slackBot = new SlackBot();
  const notifier = new NotifierService(sessionManager, {
    discordBot,
    slackBot,
    baseUrl: process.env.BASE_URL || '',
  });

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
  app.use('/api/sessions', sessionsRoute(sessionManager, { notifier }));

  app.get('/api/notifications/targets', async (req, res) => {
    try {
      const targets = await notifier.getTargets();
      res.json({ targets });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Bot connection status
  app.get('/api/notifications/status', (req, res) => {
    res.json({
      discord: {
        configured: !!process.env.DISCORD_BOT_TOKEN,
        connected: discordBot.ready,
        username: discordBot.client?.user?.tag || null,
      },
      slack: {
        configured: !!(process.env.SLACK_BOT_TOKEN && process.env.SLACK_APP_TOKEN),
        connected: slackBot.ready,
      },
    });
  });

  // Connect bots with tokens provided at runtime (persisted to .env)
  app.post('/api/notifications/connect', async (req, res) => {
    const { provider, token, appToken } = req.body;
    const results = {};

    if (provider === 'discord' || (!provider && token)) {
      if (token) {
        process.env.DISCORD_BOT_TOKEN = token;
        persistEnvVar('DISCORD_BOT_TOKEN', token);
      }
      if (process.env.DISCORD_BOT_TOKEN) {
        await discordBot.stop();
        const ok = await discordBot.start();
        results.discord = ok ? 'connected' : 'failed';
      }
    }

    if (provider === 'slack' || (!provider && appToken)) {
      if (token) {
        process.env.SLACK_BOT_TOKEN = token;
        persistEnvVar('SLACK_BOT_TOKEN', token);
      }
      if (appToken) {
        process.env.SLACK_APP_TOKEN = appToken;
        persistEnvVar('SLACK_APP_TOKEN', appToken);
      }
      if (process.env.SLACK_BOT_TOKEN && process.env.SLACK_APP_TOKEN) {
        await slackBot.stop();
        const ok = await slackBot.start();
        results.slack = ok ? 'connected' : 'failed';
      }
    }

    res.json(results);
  });

  // Serve frontend static files in production
  const publicDir = path.join(__dirname, 'public');
  app.use(express.static(publicDir));
  app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });

  // WebSocket
  const wss = setupWebSocket(server, sessionManager);

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

  // Tunnel service
  const tunnel = new TunnelService();

  // Tunnel status API
  app.get('/api/tunnel/status', (req, res) => {
    res.json({ url: tunnel.getUrl(), active: !!tunnel.getUrl(), baseUrl: notifier.baseUrl });
  });

  let userUrlOverride = !!process.env.BASE_URL;

  app.post('/api/tunnel/set-url', (req, res) => {
    const { url } = req.body;
    if (url) {
      userUrlOverride = true;
      notifier.setBaseUrl(url);
      process.env.BASE_URL = url;
      persistEnvVar('BASE_URL', url);
    } else {
      userUrlOverride = false;
      // Reset: prefer tunnel URL, then localhost
      const fallback = tunnel.getUrl() || '';
      notifier.setBaseUrl(fallback);
      delete process.env.BASE_URL;
      // Remove BASE_URL from .env
      persistEnvVar('BASE_URL', '');
    }
    res.json({ baseUrl: notifier.baseUrl });
  });

  const needsActionService = new NeedsActionService(sessionManager);
  const descriptionService = new DescriptionService(sessionManager);

  // --- API Key settings ---
  async function validateApiKey(apiKey) {
    if (!apiKey) return false;
    try {
      const Anthropic = require('@anthropic-ai/sdk');
      const client = new Anthropic({ apiKey });
      await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'hi' }]
      });
      return true;
    } catch (err) {
      console.warn('[ApiKey] Validation failed:', err.message);
      return false;
    }
  }

  function maskApiKey(key) {
    if (!key) return null;
    if (key.length <= 12) return key.slice(0, 4) + '****';
    return key.slice(0, 10) + '...' + key.slice(-4);
  }

  function broadcastWs(event, data) {
    const message = JSON.stringify({ event, data });
    for (const client of wss.clients) {
      if (client.readyState === 1) {
        client.send(message);
      }
    }
  }

  app.get('/api/settings/api-key', async (req, res) => {
    const key = process.env.ANTHROPIC_API_KEY || '';
    const configured = !!key;
    let valid = false;
    if (configured) {
      valid = await validateApiKey(key);
    }
    res.json({ configured, valid, maskedKey: maskApiKey(key) });
  });

  app.post('/api/settings/api-key', async (req, res) => {
    const { key } = req.body;
    if (!key) {
      return res.status(400).json({ valid: false, error: 'No key provided' });
    }
    const valid = await validateApiKey(key);
    if (!valid) {
      return res.json({ valid: false, error: 'Invalid API key — validation call failed' });
    }
    process.env.ANTHROPIC_API_KEY = key;
    persistEnvVar('ANTHROPIC_API_KEY', key);
    needsActionService.reinitialize(key);
    descriptionService.reinitialize(key);
    res.json({ valid: true });
  });

  // Periodic API key health check (every 5 minutes)
  let apiKeyHealthInterval = null;
  function startApiKeyHealthCheck() {
    if (apiKeyHealthInterval) clearInterval(apiKeyHealthInterval);
    apiKeyHealthInterval = setInterval(async () => {
      const key = process.env.ANTHROPIC_API_KEY;
      if (!key) return;
      const valid = await validateApiKey(key);
      if (!valid) {
        console.warn('[ApiKey] Health check failed — broadcasting alert');
        broadcastWs('apiKeyInvalid', { message: 'API key validation failed' });
      }
    }, 5 * 60 * 1000);
  }
  startApiKeyHealthCheck();

  // Persist notifyConfig: save on change, restore on session create/recover
  const savedNotifyConfigs = loadNotifyConfigs();

  sessionManager.on('session:created', (session) => {
    if (savedNotifyConfigs[session.name] && !session.notifyConfig) {
      try {
        sessionManager.updateNotifyConfig(session.name, savedNotifyConfigs[session.name]);
        console.log(`[Config] Restored notifyConfig for "${session.name}"`);
      } catch { /* ignore */ }
    }
  });

  const origUpdateNotifyConfig = sessionManager.updateNotifyConfig.bind(sessionManager);
  sessionManager.updateNotifyConfig = function(name, config) {
    const result = origUpdateNotifyConfig(name, config);
    if (config) {
      savedNotifyConfigs[name] = config;
    } else {
      delete savedNotifyConfigs[name];
    }
    saveNotifyConfigs(savedNotifyConfigs);
    return result;
  };

  return { app, server, sessionManager, needsActionService, descriptionService, notifier, discordBot, slackBot, tunnel, apiKeyHealthInterval };
}

async function start(port, host) {
  const portStart = parseInt(process.env.TTYD_PORT_RANGE_START || '7681', 10);
  const portEnd = parseInt(process.env.TTYD_PORT_RANGE_END || '7780', 10);

  const { server, sessionManager, needsActionService, descriptionService, notifier, discordBot, slackBot, tunnel, apiKeyHealthInterval } = createApp(portStart, portEnd);

  return new Promise((resolve) => {
    server.listen(port, host, async () => {
      const addr = server.address();
      console.log(`Claude Cursor running at http://${host}:${addr.port}`);
      await sessionManager.recoverSessions();
      needsActionService.start();
      descriptionService.start();

      // Start notification bots (non-blocking — they skip if tokens aren't set)
      await discordBot.start();
      await slackBot.start();
      notifier.start();

      // Start tunnel (non-blocking — works without cloudflared)
      tunnel.start(addr.port).then((tunnelUrl) => {
        if (tunnelUrl && !userUrlOverride) {
          notifier.setBaseUrl(tunnelUrl);
        }
      });

      resolve({ server, sessionManager, needsActionService, descriptionService, notifier, discordBot, slackBot, tunnel, apiKeyHealthInterval });
    });
  });
}

// Run standalone when executed directly
if (require.main === module) {
  const PORT = parseInt(process.env.PORT || '3000', 10);
  const HOST = process.env.HOST || '0.0.0.0';

  start(PORT, HOST).then(({ sessionManager, needsActionService, descriptionService, discordBot, slackBot, tunnel, apiKeyHealthInterval }) => {
    function cleanup() {
      console.log('\nCleaning up...');
      if (apiKeyHealthInterval) clearInterval(apiKeyHealthInterval);
      tunnel.stop();
      needsActionService.stop();
      descriptionService.stop();
      discordBot.stop();
      slackBot.stop();
      sessionManager.cleanup();
      process.exit(0);
    }

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
  });
}

module.exports = { start };
