const express = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const router = express.Router();

const UPLOAD_DIR = path.join(os.tmpdir(), 'claude-cursor-uploads');

module.exports = function (sessionManager, { notifier, shareTokens, tunnel } = {}) {
  router.get('/shells', (req, res) => {
    res.json({ shells: sessionManager.getShells() });
  });

  router.get('/', (req, res) => {
    res.json({ sessions: sessionManager.list() });
  });

  router.post('/', async (req, res) => {
    try {
      const { name, shell } = req.body;
      const session = await sessionManager.create(name, shell);
      res.status(201).json(session);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  router.post('/:name/stop', (req, res) => {
    try {
      const session = sessionManager.stop(req.params.name);
      res.json(session);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  router.post('/:name/restart', async (req, res) => {
    try {
      const session = await sessionManager.restart(req.params.name);
      res.json(session);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  router.delete('/:name', async (req, res) => {
    try {
      const result = await sessionManager.remove(req.params.name);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // Notification routing
  router.put('/:name/notify', (req, res) => {
    try {
      const { provider, target, targetName } = req.body;
      if (!provider || !target) {
        return res.status(400).json({ error: 'provider and target are required' });
      }
      if (!['discord', 'slack'].includes(provider)) {
        return res.status(400).json({ error: 'provider must be "discord" or "slack"' });
      }
      const session = sessionManager.updateNotifyConfig(req.params.name, {
        provider, target, targetName
      });
      res.json(session);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // File upload — saves file to temp dir and sends path to tmux session
  router.post('/:name/upload', async (req, res) => {
    try {
      const { data, filename } = req.body;
      if (!data) return res.status(400).json({ error: 'No data provided' });

      const session = sessionManager.getSession(req.params.name);
      if (session.status !== 'running') {
        return res.status(400).json({ error: 'Session not running' });
      }

      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      const ext = path.extname(filename || '.png');
      const safeName = `upload-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
      const filePath = path.join(UPLOAD_DIR, safeName);

      const buffer = Buffer.from(data, 'base64');
      fs.writeFileSync(filePath, buffer);

      // Paste file path into the tmux session
      execFileSync('tmux', ['send-keys', '-t', req.params.name, '-l', filePath], {
        timeout: 5000,
      });

      res.json({ path: filePath });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.delete('/:name/notify', (req, res) => {
    try {
      const session = sessionManager.updateNotifyConfig(req.params.name, null);
      res.json(session);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // Share token endpoints
  router.post('/:name/share', async (req, res) => {
    try {
      const session = sessionManager.getSession(req.params.name);
      const expiresIn = parseInt(req.body.expiresIn) || 1440;
      const { token, expiresAt } = shareTokens.create(session.name, expiresIn);

      const relayUrl = process.env.RELAY_URL;
      const tunnelUrl = tunnel && tunnel.getUrl();
      let shareUrl = null;

      if (relayUrl) {
        if (!tunnelUrl) {
          // Token created but can't register — clean up and error
          shareTokens.revoke(token);
          return res.status(503).json({ error: 'Tunnel not connected yet. Please try again in a moment.' });
        }
        try {
          await fetch(`${relayUrl}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, tunnelUrl, sessionName: session.name, expiresAt }),
          });
          shareUrl = `${relayUrl}/s/${token}`;
        } catch (err) {
          console.warn('[Relay] Registration failed:', err.message);
          shareTokens.revoke(token);
          return res.status(502).json({ error: 'Failed to register share link with relay.' });
        }
      }

      res.json({ token, path: `/s/${token}`, shareUrl, expiresAt });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  router.get('/:name/share', (req, res) => {
    try {
      const session = sessionManager.getSession(req.params.name);
      const shares = shareTokens.listForSession(session.name);
      res.json({ shares });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  router.delete('/:name/share', (req, res) => {
    try {
      sessionManager.getSession(req.params.name);
      shareTokens.revokeForSession(req.params.name);
      res.json({ ok: true });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  return router;
};
