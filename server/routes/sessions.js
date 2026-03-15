const express = require('express');
const router = express.Router();

module.exports = function (sessionManager, { notifier } = {}) {
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

  router.delete('/:name/notify', (req, res) => {
    try {
      const session = sessionManager.updateNotifyConfig(req.params.name, null);
      res.json(session);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  return router;
};
