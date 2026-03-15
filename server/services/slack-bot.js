const { execSync } = require('child_process');
const EventEmitter = require('events');

const SPAWN_ENV = {
  ...process.env,
  PATH: `/usr/local/bin:/opt/homebrew/bin:${process.env.PATH || ''}`
};
delete SPAWN_ENV.TMUX;
delete SPAWN_ENV.TMUX_PANE;

const REDIRECT_RE = /^(?:ask|forward)\s+([#@]\S+)/i;

class SlackBot extends EventEmitter {
  constructor() {
    super();
    this.app = null;
    this.ready = false;
    // Maps message ts → session name for thread reply routing
    this.messageSessionMap = new Map();
  }

  async start() {
    const botToken = process.env.SLACK_BOT_TOKEN;
    const appToken = process.env.SLACK_APP_TOKEN;
    if (!botToken || !appToken) return false;

    let bolt;
    try {
      bolt = require('@slack/bolt');
    } catch (err) {
      console.warn('[Slack] @slack/bolt not installed — skipping Slack integration');
      return false;
    }

    const { App } = bolt;

    this.app = new App({
      token: botToken,
      appToken: appToken,
      socketMode: true,
    });

    // Handle "Expand context" button clicks
    this.app.action('expand_context', async ({ action, ack, respond, say, body }) => {
      await ack();
      const sessionName = action.value;
      const content = this._capturePane(sessionName);

      if (!content) {
        await respond({ text: 'Could not capture terminal content.', replace_original: false });
        return;
      }

      // Post in thread
      const threadTs = body.message.ts;
      const channelId = body.channel.id;
      const chunks = this._chunkText(content, 2900);

      for (const chunk of chunks) {
        await this.app.client.chat.postMessage({
          channel: channelId,
          thread_ts: threadTs,
          text: `\`\`\`\n${chunk}\n\`\`\``,
        });
      }
    });

    // Handle thread replies (message events)
    this.app.message(async ({ message, say }) => {
      // Only care about threaded replies
      if (!message.thread_ts || message.thread_ts === message.ts) return;
      if (message.bot_id) return;

      const sessionName = this.messageSessionMap.get(message.thread_ts);
      if (!sessionName) return;

      await this._handleReply(message, sessionName, say);
    });

    try {
      await this.app.start();
      this.ready = true;
      console.log('[Slack] Bot connected via Socket Mode');
      return true;
    } catch (err) {
      console.error('[Slack] Failed to start:', err.message);
      return false;
    }
  }

  async stop() {
    if (this.app) {
      try { await this.app.stop(); } catch { /* ignore */ }
      this.app = null;
      this.ready = false;
    }
  }

  async sendNotification(channelOrUserId, sessionName, snippet, link, description, opts = {}) {
    if (!this.ready) return null;

    const title = opts.title || `Action needed: ${sessionName}`;

    const blocks = [
      {
        type: 'header',
        text: { type: 'plain_text', text: title },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: description || 'A terminal session needs your attention.',
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Prompt:*\n\`\`\`${snippet || 'No snippet available'}\`\`\``,
        },
      },
    ];

    if (link) {
      blocks.push({
        type: 'section',
        text: { type: 'mrkdwn', text: `<${link}|Open in browser>` },
      });
    }

    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Expand context' },
          action_id: 'expand_context',
          value: sessionName,
        },
      ],
    });

    try {
      // If target is a user ID, open a DM conversation first
      let channel = channelOrUserId;
      if (channelOrUserId.startsWith('U')) {
        console.log(`[Slack] Opening DM with user ${channelOrUserId}`);
        try {
          const dm = await this.app.client.conversations.open({ users: channelOrUserId });
          if (dm.ok && dm.channel) {
            channel = dm.channel.id;
          } else {
            console.error(`[Slack] conversations.open failed for ${channelOrUserId}`);
            return null;
          }
        } catch (dmErr) {
          console.error(`[Slack] Failed to open DM — add im:write scope to your Slack app:`, dmErr.data?.error || dmErr.message);
          return null;
        }
      }

      const result = await this.app.client.chat.postMessage({
        channel,
        text: `${title} — ${snippet || 'check terminal'}`,
        blocks,
      });

      if (result.ok && result.ts) {
        this.messageSessionMap.set(result.ts, sessionName);
        return result.ts;
      }
      return null;
    } catch (err) {
      console.error('[Slack] Failed to send notification:', err.message);
      return null;
    }
  }

  async _handleReply(message, sessionName, say) {
    const text = message.text.trim();
    const redirectMatch = REDIRECT_RE.exec(text);

    if (redirectMatch) {
      const targetMention = redirectMatch[1];
      this.emit('redirect', {
        sessionName,
        targetMention,
        provider: 'slack',
        threadTs: message.thread_ts,
        channelId: message.channel,
      });
      await say({
        text: `Redirecting notification to ${targetMention}`,
        thread_ts: message.thread_ts,
      });
    } else {
      const success = this._sendToTerminal(sessionName, text);
      if (success) {
        await say({
          text: `Sent to session \`${sessionName}\``,
          thread_ts: message.thread_ts,
        });
        this.emit('answered', { sessionName, provider: 'slack' });
      } else {
        await say({
          text: `Failed to send to session \`${sessionName}\``,
          thread_ts: message.thread_ts,
        });
      }
    }
  }

  _capturePane(sessionName) {
    try {
      return execSync(
        `tmux capture-pane -t ${sessionName} -b _notify -p -S -200 && tmux delete-buffer -b _notify 2>/dev/null; true`,
        { encoding: 'utf-8', timeout: 3000, env: SPAWN_ENV }
      );
    } catch {
      return null;
    }
  }

  _sendToTerminal(sessionName, text) {
    try {
      const escaped = text.replace(/'/g, "'\\''");
      execSync(`tmux send-keys -t ${sessionName} '${escaped}' Enter`, {
        timeout: 3000,
        env: SPAWN_ENV,
      });
      return true;
    } catch {
      return false;
    }
  }

  _chunkText(text, maxLen) {
    const chunks = [];
    let remaining = text;
    while (remaining.length > 0) {
      chunks.push(remaining.slice(0, maxLen));
      remaining = remaining.slice(maxLen);
    }
    return chunks.length ? chunks : ['(empty)'];
  }

  async getTargets() {
    if (!this.ready) return [];

    const targets = [];
    try {
      // List channels the bot can see
      const result = await this.app.client.conversations.list({
        types: 'public_channel,private_channel',
        exclude_archived: true,
        limit: 200,
      });

      for (const ch of result.channels || []) {
        targets.push({
          id: ch.id,
          name: `#${ch.name}`,
          type: 'channel',
        });
      }
    } catch (err) {
      console.warn('[Slack] Failed to list channels:', err.message);
    }

    try {
      // List workspace users (non-bot, non-deleted)
      const result = await this.app.client.users.list({ limit: 200 });
      for (const member of result.members || []) {
        if (member.is_bot || member.deleted || member.id === 'USLACKBOT') continue;
        targets.push({
          id: member.id,
          name: `@${member.real_name || member.name}`,
          type: 'user',
        });
      }
    } catch (err) {
      console.warn('[Slack] Failed to list users:', err.message);
    }

    return targets;
  }

  async resolveTarget(mention) {
    if (!this.ready) return null;

    if (mention.startsWith('#')) {
      const channelName = mention.slice(1);
      try {
        const result = await this.app.client.conversations.list({
          types: 'public_channel,private_channel',
          exclude_archived: true,
          limit: 200,
        });
        const ch = (result.channels || []).find(c => c.name === channelName);
        if (ch) return { id: ch.id, name: `#${ch.name}`, type: 'channel' };
      } catch { /* ignore */ }
    }

    if (mention.startsWith('@')) {
      const username = mention.slice(1);
      try {
        const result = await this.app.client.users.list({ limit: 200 });
        const user = (result.members || []).find(m =>
          m.name === username || m.real_name === username
        );
        if (user) return { id: user.id, name: `@${user.name}`, type: 'user' };
      } catch { /* ignore */ }
    }

    return null;
  }
}

module.exports = SlackBot;
