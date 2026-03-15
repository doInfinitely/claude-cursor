class NotifierService {
  constructor(sessionManager, { discordBot, slackBot, baseUrl } = {}) {
    this.sessionManager = sessionManager;
    this.discordBot = discordBot || null;
    this.slackBot = slackBot || null;
    this.baseUrl = baseUrl || process.env.BASE_URL || '';
    // Track which sessions have a pending notification to avoid duplicates
    this.pendingSessions = new Set();
  }

  start() {
    this.sessionManager.on('session:updated', (session) => {
      this._onSessionUpdated(session);
    });

    // Listen for redirect events from bots
    if (this.discordBot) {
      this.discordBot.on('redirect', (data) => this._handleRedirect(data));
      this.discordBot.on('answered', (data) => this._handleAnswered(data));
    }
    if (this.slackBot) {
      this.slackBot.on('redirect', (data) => this._handleRedirect(data));
      this.slackBot.on('answered', (data) => this._handleAnswered(data));
    }

    console.log('[Notifier] Service started');
  }

  async _onSessionUpdated(session) {
    console.log(`[Notifier] session:updated "${session.name}" needsAction=${session.needsAction} actionType=${session.actionType} notifyConfig=${JSON.stringify(session.notifyConfig)}`);

    if (!session.notifyConfig) return;
    if (!session.notifyConfig.provider || !session.notifyConfig.target) return;

    // Only send when needsAction transitions to true
    if (!session.needsAction) {
      this.pendingSessions.delete(session.name);
      return;
    }

    // Don't duplicate
    if (this.pendingSessions.has(session.name)) {
      console.log(`[Notifier] Skipping "${session.name}" — already pending`);
      return;
    }
    // Don't send until we have a valid base URL (wait for tunnel)
    if (!this.baseUrl) {
      console.log(`[Notifier] Deferring "${session.name}" — no base URL yet`);
      return;
    }

    this.pendingSessions.add(session.name);

    const { provider, target } = session.notifyConfig;
    const link = `${this.baseUrl}/terminal/${encodeURIComponent(session.name)}`;
    const snippet = session.needsActionSnippet || null;
    const description = session.description || null;
    const actionType = session.actionType || 'prompt';

    const title = this._notificationTitle(session.name, actionType);
    const body = this._notificationBody(actionType, description);

    console.log(`[Notifier] Sending ${provider} notification to ${target} for "${session.name}"`);
    await this._send(provider, target, session.name, snippet, link, body, title, actionType);
  }

  _notificationTitle(sessionName, actionType) {
    switch (actionType) {
      case 'approval': return `Approval required: ${sessionName}`;
      case 'completed': return `Completed: ${sessionName}`;
      default: return `Action needed: ${sessionName}`;
    }
  }

  _notificationBody(actionType, description) {
    switch (actionType) {
      case 'approval': return description || 'A command requires your approval.';
      case 'completed': return description || 'The task has finished.';
      default: return description || 'A terminal session needs your attention.';
    }
  }

  async _send(provider, target, sessionName, snippet, link, description, title, actionType) {
    const opts = { title, actionType };
    let result = null;
    try {
      if (provider === 'discord' && this.discordBot) {
        console.log(`[Notifier] Discord bot ready=${this.discordBot.ready}`);
        result = await this.discordBot.sendNotification(target, sessionName, snippet, link, description, opts);
        console.log(`[Notifier] Discord send result: ${result}`);
      } else if (provider === 'slack' && this.slackBot) {
        console.log(`[Notifier] Slack bot ready=${this.slackBot.ready}`);
        result = await this.slackBot.sendNotification(target, sessionName, snippet, link, description, opts);
        console.log(`[Notifier] Slack send result: ${result}`);
      } else {
        console.warn(`[Notifier] Provider "${provider}" not available`);
      }
    } catch (err) {
      console.error(`[Notifier] Send failed:`, err);
    }
    // Clear pending on failure so it retries on next detection cycle
    if (!result) {
      this.pendingSessions.delete(sessionName);
    }
  }

  async _handleRedirect({ sessionName, targetMention, provider }) {
    const bot = provider === 'discord' ? this.discordBot : this.slackBot;
    if (!bot) return;

    const resolved = await bot.resolveTarget(targetMention);
    if (!resolved) {
      console.warn(`[Notifier] Could not resolve target: ${targetMention}`);
      return;
    }

    // Update session's notify config to new target
    try {
      this.sessionManager.updateNotifyConfig(sessionName, {
        provider,
        target: resolved.id,
        targetName: resolved.name,
      });
    } catch (err) {
      console.warn(`[Notifier] Failed to update notify config:`, err.message);
      return;
    }

    // Re-send notification to new target
    const session = this.sessionManager.sessions.get(sessionName);
    if (!session) return;

    this.pendingSessions.delete(sessionName);
    const link = `${this.baseUrl}/terminal/${encodeURIComponent(sessionName)}`;
    const actionType = session.actionType || 'prompt';
    const title = this._notificationTitle(sessionName, actionType);
    const body = this._notificationBody(actionType, session.description);
    await this._send(
      provider,
      resolved.id,
      sessionName,
      session.needsActionSnippet,
      link,
      body,
      title,
      actionType
    );
    this.pendingSessions.add(sessionName);
  }

  _handleAnswered({ sessionName }) {
    this.pendingSessions.delete(sessionName);
  }

  setBaseUrl(url) {
    this.baseUrl = url;
    console.log(`[Notifier] Base URL updated to ${url}`);
  }

  async getTargets() {
    const result = { discord: [], slack: [] };

    if (this.discordBot) {
      result.discord = await this.discordBot.getTargets();
    }
    if (this.slackBot) {
      result.slack = await this.slackBot.getTargets();
    }

    return result;
  }
}

module.exports = NotifierService;
