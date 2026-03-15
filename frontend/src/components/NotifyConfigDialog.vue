<script setup>
import { ref, computed, onMounted } from "vue";
import { useSessionStore } from "../stores/sessions";

const props = defineProps({
  sessionName: String,
});

const emit = defineEmits(["close"]);
const store = useSessionStore();

const provider = ref("none");
const target = ref("");
const targets = ref({ discord: [], slack: [] });
const botStatus = ref({ discord: {}, slack: {} });
const loading = ref(false);
const saving = ref(false);
const connecting = ref(false);
const error = ref("");

// Tunnel / base URL state
const tunnelUrl = ref(null);
const tunnelActive = ref(false);
const currentBaseUrl = ref("");
const urlOverride = ref("");
const urlSaving = ref(false);
const urlCopied = ref(false);

// Token inputs for connecting bots
const discordToken = ref("");
const slackBotToken = ref("");
const slackAppToken = ref("");

onMounted(async () => {
  // Load current config from session
  const session = store.sessions.find((s) => s.name === props.sessionName);
  if (session?.notifyConfig) {
    provider.value = session.notifyConfig.provider || "none";
    target.value = session.notifyConfig.target || "";
  }

  loading.value = true;
  try {
    const [t, s, ts] = await Promise.all([
      store.fetchNotifyTargets(),
      store.fetchNotifyStatus(),
      store.fetchTunnelStatus(),
    ]);
    targets.value = t;
    botStatus.value = s;
    tunnelUrl.value = ts.url || null;
    tunnelActive.value = ts.active || false;
    currentBaseUrl.value = ts.baseUrl || "";
  } catch (e) {
    // Not critical
  } finally {
    loading.value = false;
  }
});

const currentStatus = computed(() => {
  if (provider.value === "discord") return botStatus.value.discord || {};
  if (provider.value === "slack") return botStatus.value.slack || {};
  return {};
});

function currentTargets() {
  if (provider.value === "discord") return targets.value.discord || [];
  if (provider.value === "slack") return targets.value.slack || [];
  return [];
}

async function handleSave() {
  if (saving.value) return;
  error.value = "";
  saving.value = true;

  try {
    if (provider.value === "none") {
      await store.removeNotifyConfig(props.sessionName);
    } else {
      const selected = currentTargets().find((t) => t.id === target.value);
      await store.updateNotifyConfig(props.sessionName, {
        provider: provider.value,
        target: target.value,
        targetName: selected?.name || target.value,
      });
    }
    emit("close");
  } catch (e) {
    error.value = e.message;
  } finally {
    saving.value = false;
  }
}

async function connectBot() {
  if (connecting.value) return;
  error.value = "";
  connecting.value = true;

  try {
    const body = { provider: provider.value };
    if (provider.value === "discord") {
      body.token = discordToken.value;
    } else if (provider.value === "slack") {
      body.token = slackBotToken.value;
      body.appToken = slackAppToken.value;
    }

    const res = await fetch("/api/notifications/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();

    const result = data[provider.value];
    if (result === "connected") {
      // Refresh status and targets
      const [t, s] = await Promise.all([
        store.fetchNotifyTargets(),
        store.fetchNotifyStatus(),
      ]);
      targets.value = t;
      botStatus.value = s;
      discordToken.value = "";
      slackBotToken.value = "";
      slackAppToken.value = "";
    } else {
      error.value = `Failed to connect ${provider.value} bot`;
    }
  } catch (e) {
    error.value = e.message;
  } finally {
    connecting.value = false;
  }
}

function onProviderChange() {
  target.value = "";
}

async function saveUrlOverride() {
  if (urlSaving.value) return;
  urlSaving.value = true;
  try {
    const result = await store.setBaseUrl(urlOverride.value);
    currentBaseUrl.value = result.baseUrl;
    urlOverride.value = "";
  } catch (e) {
    error.value = e.message;
  } finally {
    urlSaving.value = false;
  }
}

async function resetUrl() {
  urlSaving.value = true;
  try {
    const result = await store.setBaseUrl(null);
    currentBaseUrl.value = result.baseUrl;
    urlOverride.value = "";
  } catch (e) {
    error.value = e.message;
  } finally {
    urlSaving.value = false;
  }
}

async function copyUrl() {
  try {
    await navigator.clipboard.writeText(currentBaseUrl.value);
    urlCopied.value = true;
    setTimeout(() => urlCopied.value = false, 2000);
  } catch {
    // fallback
  }
}
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal-content glass">
      <div class="modal-header">
        <h3>Notification Settings</h3>
        <button class="close-btn" @click="emit('close')">✕</button>
      </div>

      <div class="modal-body">
        <p class="helper-text">
          Route notifications for <strong>{{ sessionName }}</strong> to Discord
          or Slack when the session needs attention.
        </p>

        <label class="form-group">
          <span class="label-text">Provider</span>
          <select v-model="provider" @change="onProviderChange">
            <option value="none">None (disabled)</option>
            <option value="discord">Discord</option>
            <option value="slack">Slack</option>
          </select>
        </label>

        <!-- Bot status indicator -->
        <div v-if="provider !== 'none'" class="bot-status">
          <span
            class="status-dot"
            :class="currentStatus.connected ? 'connected' : 'disconnected'"
          ></span>
          <span v-if="currentStatus.connected" class="status-text connected">
            Connected{{ currentStatus.username ? ` as ${currentStatus.username}` : '' }}
          </span>
          <span v-else-if="currentStatus.configured" class="status-text disconnected">
            Token set but not connected
          </span>
          <span v-else class="status-text disconnected">
            Not configured
          </span>
        </div>

        <!-- Connect form when bot is not connected -->
        <div v-if="provider !== 'none' && !currentStatus.connected" class="connect-section">
          <template v-if="provider === 'discord'">
            <label class="form-group">
              <span class="label-text">Discord Bot Token</span>
              <input
                v-model="discordToken"
                type="password"
                placeholder="Paste bot token…"
              />
            </label>
          </template>
          <template v-if="provider === 'slack'">
            <label class="form-group">
              <span class="label-text">Slack Bot Token</span>
              <input
                v-model="slackBotToken"
                type="password"
                placeholder="xoxb-…"
              />
            </label>
            <label class="form-group">
              <span class="label-text">Slack App Token</span>
              <input
                v-model="slackAppToken"
                type="password"
                placeholder="xapp-…"
              />
            </label>
          </template>
          <button
            class="btn btn-connect"
            @click="connectBot"
            :disabled="connecting || (provider === 'discord' && !discordToken && !currentStatus.configured) || (provider === 'slack' && !slackBotToken && !currentStatus.configured)"
          >
            {{ connecting ? "Connecting…" : "Connect" }}
          </button>
        </div>

        <!-- Target selection (only when connected) -->
        <label v-if="provider !== 'none' && currentStatus.connected" class="form-group">
          <span class="label-text">Channel / User</span>
          <select v-if="currentTargets().length" v-model="target">
            <option value="" disabled>Select a target…</option>
            <option
              v-for="t in currentTargets()"
              :key="t.id"
              :value="t.id"
            >
              {{ t.name }}{{ t.guild ? ` (${t.guild})` : "" }}
            </option>
          </select>
          <input
            v-else
            v-model="target"
            type="text"
            placeholder="Channel or user ID"
          />
          <span class="input-hint" v-if="loading">Loading targets…</span>
        </label>

        <!-- Manual target when not connected -->
        <label v-if="provider !== 'none' && !currentStatus.connected" class="form-group">
          <span class="label-text">Channel / User ID (manual)</span>
          <input
            v-model="target"
            type="text"
            placeholder="Channel or user ID"
          />
          <span class="input-hint">
            Connect bot above for channel list, or enter ID manually
          </span>
        </label>

        <!-- Link URL section -->
        <div class="url-section">
          <span class="label-text">Link URL</span>
          <div class="url-current">
            <span
              class="status-dot"
              :class="tunnelActive ? 'connected' : 'disconnected'"
            ></span>
            <span class="url-text" :title="currentBaseUrl" @click="copyUrl">
              {{ currentBaseUrl || 'Not set' }}
            </span>
            <button v-if="currentBaseUrl" class="btn-copy" @click="copyUrl">
              {{ urlCopied ? 'Copied' : 'Copy' }}
            </button>
          </div>
          <span v-if="tunnelActive" class="input-hint">Cloudflare tunnel active</span>
          <span v-else class="input-hint">Local only — install cloudflared for a public URL</span>
          <div class="url-override">
            <input
              v-model="urlOverride"
              type="text"
              placeholder="Override URL…"
              @keyup.enter="saveUrlOverride"
            />
            <button
              class="btn btn-small"
              @click="saveUrlOverride"
              :disabled="urlSaving || !urlOverride"
            >Set</button>
            <button
              class="btn btn-small"
              @click="resetUrl"
              :disabled="urlSaving"
            >Reset</button>
          </div>
        </div>

        <div v-if="error" class="error-msg">{{ error }}</div>
      </div>

      <div class="modal-footer">
        <button class="btn" @click="emit('close')">Cancel</button>
        <button
          class="btn btn-primary"
          @click="handleSave"
          :disabled="saving || (provider !== 'none' && !target)"
        >
          {{ saving ? "Saving…" : "Save" }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

.modal-content {
  width: 100%;
  max-width: 440px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  margin: 16px;
  overflow: hidden;
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.modal-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-tertiary);
  cursor: pointer;
  font-size: 18px;
  padding: 4px;
  border-radius: 4px;
}
.close-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.modal-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 60vh;
  overflow-y: auto;
}

.helper-text {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.label-text {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
}

select,
input {
  width: 100%;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  padding: 10px;
  border-radius: var(--radius-md);
  outline: none;
  font-size: 14px;
  appearance: none;
}

select:focus,
input:focus {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 2px var(--accent-dim);
}

.input-hint {
  font-size: 11px;
  color: var(--text-tertiary);
}

.bot-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--bg-primary);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.status-dot.connected {
  background: #16a34a;
  box-shadow: 0 0 6px rgba(22, 163, 74, 0.5);
}
.status-dot.disconnected {
  background: var(--text-tertiary);
}

.status-text {
  font-size: 12px;
}
.status-text.connected {
  color: #16a34a;
}
.status-text.disconnected {
  color: var(--text-tertiary);
}

.connect-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  background: var(--bg-primary);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
}

.btn-connect {
  align-self: flex-start;
  background: var(--accent-primary);
  color: #3b110c;
  border: none;
  border-radius: var(--radius-md);
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}
.btn-connect:hover {
  background: var(--accent-hover);
}
.btn-connect:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.url-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: var(--bg-primary);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
}

.url-current {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.url-text {
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
  flex: 1;
  min-width: 0;
}
.url-text:hover {
  color: var(--text-primary);
}

.btn-copy {
  background: none;
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  font-size: 11px;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  flex-shrink: 0;
}
.btn-copy:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.url-override {
  display: flex;
  gap: 6px;
  align-items: center;
}
.url-override input {
  flex: 1;
  width: auto;
  min-width: 0;
  font-size: 13px;
  padding: 6px 8px;
}

.btn-small {
  padding: 6px 10px;
  font-size: 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-secondary);
  cursor: pointer;
  flex-shrink: 0;
}
.btn-small:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}
.btn-small:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-msg {
  font-size: 13px;
  color: var(--danger);
  background: rgba(218, 28, 28, 0.1);
  border: 1px solid rgba(218, 28, 28, 0.3);
  border-radius: var(--radius-md);
  padding: 8px 12px;
}

.modal-footer {
  padding: 16px 20px;
  background: var(--bg-primary);
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
</style>
