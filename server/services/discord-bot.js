const { execSync } = require('child_process');
const EventEmitter = require('events');

const SPAWN_ENV = {
  ...process.env,
  PATH: process.platform === 'win32' ? (process.env.PATH || '') : `/usr/local/bin:/opt/homebrew/bin:${process.env.PATH || ''}`
};
delete SPAWN_ENV.TMUX;
delete SPAWN_ENV.TMUX_PANE;

const REDIRECT_RE = /^(?:ask|forward)\s+([#@]\S+)/i;

class DiscordBot extends EventEmitter {
  constructor() {
    super();
    this.client = null;
    this.ready = false;
    // Maps message ID → session name for thread reply routing
    this.messageSessionMap = new Map();
  }

  async start() {
    const token = process.env.DISCORD_BOT_TOKEN;
    if (!token) return false;

    let discord;
    try {
      discord = require('discord.js');
    } catch (err) {
      console.warn('[Discord] discord.js not installed — skipping Discord integration');
      return false;
    }

    const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = discord;
    this._discord = discord;

    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
      ]
    });

    this.client.on('ready', () => {
      console.log(`[Discord] Bot connected as ${this.client.user.tag}`);
      this.ready = true;
    });

    // Handle button interactions (Expand)
    this.client.on('interactionCreate', async (interaction) => {
      if (!interaction.isButton()) return;
      if (!interaction.customId.startsWith('expand:')) return;

      const sessionName = interaction.customId.replace('expand:', '');
      await this._handleExpand(interaction, sessionName);
    });

    // Handle thread replies
    this.client.on('messageCreate', async (message) => {
      if (message.author.bot) return;
      if (!message.reference?.messageId) return;

      const sessionName = this.messageSessionMap.get(message.reference.messageId);
      if (!sessionName) return;

      await this._handleReply(message, sessionName);
    });

    try {
      await this.client.login(token);
      return true;
    } catch (err) {
      console.error('[Discord] Failed to login:', err.message);
      return false;
    }
  }

  async stop() {
    if (this.client) {
      this.client.destroy();
      this.client = null;
      this.ready = false;
    }
  }

  async sendNotification(channelId, sessionName, snippet, link, description, opts = {}) {
    if (!this.ready) return null;

    const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = this._discord;

    const channel = await this.client.channels.fetch(channelId).catch(() => null);
    if (!channel) {
      console.warn(`[Discord] Channel ${channelId} not found`);
      return null;
    }

    const colorMap = { approval: 0xdc2626, completed: 0x16a34a, prompt: 0xd97706 };
    const color = colorMap[opts.actionType] || 0xd97706;
    const title = opts.title || `Action needed: ${sessionName}`;

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setDescription(description || 'A terminal session needs your attention.')
      .addFields({ name: 'Prompt', value: `\`\`\`\n${snippet || 'No snippet available'}\n\`\`\`` })
      .setTimestamp();

    if (link) {
      embed.addFields({ name: 'Session', value: `[Open in browser](${link})` });
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`expand:${sessionName}`)
        .setLabel('Expand context')
        .setStyle(ButtonStyle.Secondary)
    );

    try {
      const sent = await channel.send({ embeds: [embed], components: [row] });
      this.messageSessionMap.set(sent.id, sessionName);
      return sent.id;
    } catch (err) {
      console.error(`[Discord] Failed to send notification:`, err.message);
      return null;
    }
  }

  async _handleExpand(interaction, sessionName) {
    await interaction.deferReply({ ephemeral: false });

    const content = this._capturePane(sessionName);
    if (!content) {
      await interaction.editReply('Could not capture terminal content.');
      return;
    }

    // Split into chunks of ~1900 chars (Discord limit is 2000)
    const chunks = this._chunkText(content, 1900);
    for (let i = 0; i < chunks.length; i++) {
      const text = `\`\`\`\n${chunks[i]}\n\`\`\``;
      if (i === 0) {
        await interaction.editReply(text);
      } else {
        await interaction.followUp(text);
      }
    }
  }

  async _handleReply(message, sessionName) {
    const text = message.content.trim();
    const redirectMatch = REDIRECT_RE.exec(text);

    if (redirectMatch) {
      const targetMention = redirectMatch[1];
      this.emit('redirect', {
        sessionName,
        targetMention,
        provider: 'discord',
        originalMessage: message,
      });
      await message.reply(`Redirecting notification to ${targetMention}`);
    } else {
      // Send text to terminal
      const success = this._sendToTerminal(sessionName, text);
      if (success) {
        await message.reply(`Sent to session \`${sessionName}\``);
        this.emit('answered', { sessionName, provider: 'discord' });
      } else {
        await message.reply(`Failed to send to session \`${sessionName}\``);
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
      // Escape single quotes for shell
      const escaped = text.replace(/'/g, "'\\''");
      execSync(`tmux send-keys -t ${sessionName} '${escaped}' Enter`, {
        timeout: 3000,
        env: SPAWN_ENV
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
    for (const [, guild] of this.client.guilds.cache) {
      for (const [, channel] of guild.channels.cache) {
        if (channel.isTextBased() && !channel.isThread()) {
          targets.push({
            id: channel.id,
            name: `#${channel.name}`,
            guild: guild.name,
            type: 'channel',
          });
        }
      }
    }
    return targets;
  }

  resolveTarget(mention) {
    if (!this.ready) return null;

    // Handle #channel mentions
    if (mention.startsWith('#')) {
      const channelName = mention.slice(1);
      for (const [, guild] of this.client.guilds.cache) {
        const ch = guild.channels.cache.find(c => c.name === channelName && c.isTextBased());
        if (ch) return { id: ch.id, name: `#${ch.name}`, type: 'channel' };
      }
    }

    // Handle @user mentions
    if (mention.startsWith('@')) {
      const username = mention.slice(1);
      for (const [, guild] of this.client.guilds.cache) {
        const member = guild.members.cache.find(m =>
          m.user.username === username || m.displayName === username
        );
        if (member) return { id: member.id, name: `@${member.displayName}`, type: 'user' };
      }
    }

    return null;
  }
}

module.exports = DiscordBot;
