<script setup>
import { ref } from "vue";
import { useSessionStore } from "../stores/sessions";

const props = defineProps({
  session: Object,
  active: Boolean,
  collapsed: Boolean,
});

const emit = defineEmits(["configure-notify", "share-custom"]);
const store = useSessionStore();
const confirming = ref(false);
const urlMenuOpen = ref(false);
const urlCopied = ref(false);
const sharing = ref(false);

async function onUrlClick(e) {
  e.stopPropagation();
  urlMenuOpen.value = !urlMenuOpen.value;
}

async function copyShareUrl(e, expiresIn) {
  e.stopPropagation();
  if (sharing.value) return;
  sharing.value = true;
  try {
    const share = await store.shareSession(props.session.name, expiresIn);
    let url = share.shareUrl;
    if (!url) {
      const status = await store.fetchTunnelStatus();
      const base = status.url || status.baseUrl || window.location.origin;
      url = `${base}${share.path}`;
    }
    await navigator.clipboard.writeText(url);
    urlCopied.value = true;
    setTimeout(() => (urlCopied.value = false), 2000);
  } catch {}
  sharing.value = false;
  urlMenuOpen.value = false;
}

function openCustomShare(e) {
  e.stopPropagation();
  urlMenuOpen.value = false;
  emit("share-custom", props.session.name);
}


async function resetSessionUrl(e) {
  e.stopPropagation();
  try {
    await store.setBaseUrl(null);
  } catch {}
  urlMenuOpen.value = false;
}

function closeUrlMenu(e) {
  e.stopPropagation();
  urlMenuOpen.value = false;
}

function onClose(e, name) {
  e.stopPropagation();
  confirming.value = true;
}

async function confirmRemove(e, name) {
  e.stopPropagation();
  try {
    await store.removeSession(name);
  } catch (err) {
    console.error(err);
  }
  confirming.value = false;
}

function cancelRemove(e) {
  e.stopPropagation();
  confirming.value = false;
}

function onNotifyClick(e) {
  e.stopPropagation();
  emit("configure-notify", props.session.name);
}
</script>

<template>
  <div
    class="session-card"
    :class="{ active, collapsed }"
    :title="session.name"
  >
    <div class="status-indicator" :class="[session.status, session.needsAction && `action-${session.actionType || 'prompt'}`]"></div>

    <div class="card-content" v-show="!collapsed">
      <div class="card-top">
        <div class="session-name">{{ session.name }}</div>
        <div v-if="!confirming" class="url-btn-wrapper">
          <button
            class="url-btn"
            :class="{ copied: urlCopied }"
            title="Session URL"
            @click="onUrlClick($event)"
          >
            <svg v-if="urlCopied" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
            <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="2" y1="12" x2="22" y2="12"/>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
          </button>
          <div v-if="urlMenuOpen" class="url-dropdown">
            <div class="dropdown-label">Share link expires in</div>
            <button @click="copyShareUrl($event, 60)">1 hour</button>
            <button @click="copyShareUrl($event, 1440)">24 hours</button>
            <button @click="copyShareUrl($event, 10080)">7 days</button>
            <button @click="openCustomShare($event)">Custom...</button>
            <div class="dropdown-divider"></div>
            <button @click="resetSessionUrl($event)">Reset URL</button>
          </div>
          <div v-if="urlMenuOpen" class="url-backdrop" @click="closeUrlMenu($event)"></div>
        </div>
        <button
          v-if="!confirming"
          class="notify-btn"
          :class="{ active: session.notifyConfig }"
          :title="session.notifyConfig ? `Notifying ${session.notifyConfig.targetName || session.notifyConfig.provider}` : 'Configure notifications'"
          @click="onNotifyClick($event)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </button>
        <button
          v-if="!confirming"
          class="close-btn"
          title="Delete session"
          @click="onClose($event, session.name)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div v-if="confirming" class="confirm-bar">
        <span class="confirm-text">Delete?</span>
        <button class="confirm-yes" @click="confirmRemove($event, session.name)">Yes</button>
        <button class="confirm-no" @click="cancelRemove($event)">No</button>
      </div>
      <div v-else-if="session.description" class="session-description">
        {{ session.description }}
      </div>
      <div v-else class="session-info">
        <span class="pid">PID: {{ session.pid }}</span>
        <span class="status-text">{{ session.status }}</span>
      </div>
      <div v-if="session.needsAction && session.needsActionSnippet" class="action-snippet" :class="`action-${session.actionType || 'prompt'}`">
        {{ session.needsActionSnippet }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.session-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
  color: var(--text-secondary);
}

.session-card:hover {
  background: var(--bg-card-hover);
  color: var(--text-primary);
}

.session-card.active {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border-color: var(--border-color);
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-tertiary);
  flex-shrink: 0;
}

.status-indicator.running {
  background: #e9e4a6; /* fresh-hay */
  box-shadow: 0 0 8px rgba(233, 228, 166, 0.4);
}

/* Approval — red, urgent pulse */
.status-indicator.action-approval {
  background: #dc2626;
  box-shadow: 0 0 8px rgba(220, 38, 38, 0.6);
  animation: pulse-red 1.5s ease-in-out infinite;
}

/* Completed — green, calm */
.status-indicator.action-completed {
  background: #16a34a;
  box-shadow: 0 0 8px rgba(22, 163, 74, 0.5);
}

/* Generic prompt — amber */
.status-indicator.action-prompt {
  background: #d97706;
  box-shadow: 0 0 8px rgba(217, 119, 6, 0.6);
  animation: pulse-amber 2s ease-in-out infinite;
}

@keyframes pulse-red {
  0%, 100% {
    box-shadow: 0 0 8px rgba(220, 38, 38, 0.6);
  }
  50% {
    box-shadow: 0 0 16px rgba(220, 38, 38, 0.9);
  }
}

@keyframes pulse-amber {
  0%, 100% {
    box-shadow: 0 0 8px rgba(217, 119, 6, 0.6);
  }
  50% {
    box-shadow: 0 0 16px rgba(217, 119, 6, 0.9);
  }
}

.card-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.card-top {
  display: flex;
  align-items: center;
  gap: 4px;
}

.session-name {
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}

.url-btn-wrapper {
  position: relative;
  flex-shrink: 0;
}

.url-btn,
.notify-btn,
.close-btn {
  display: none;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: var(--text-tertiary);
  cursor: pointer;
  padding: 2px;
  border-radius: 4px;
  flex-shrink: 0;
}
.session-card:hover .url-btn,
.session-card:hover .notify-btn,
.session-card:hover .close-btn {
  display: flex;
}
.url-btn:hover {
  background: var(--bg-tertiary);
  color: var(--accent-primary);
}
.url-btn.copied {
  display: flex;
  color: #16a34a;
}
.url-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  z-index: 100;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 4px;
  min-width: 120px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}
.url-dropdown button {
  display: block;
  width: 100%;
  text-align: left;
  padding: 6px 10px;
  font-size: 12px;
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: 4px;
  white-space: nowrap;
}
.url-dropdown button:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}
.dropdown-label {
  padding: 4px 10px 2px;
  font-size: 11px;
  color: var(--text-tertiary);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.dropdown-divider {
  height: 1px;
  background: var(--border-color);
  margin: 4px 0;
}
.url-backdrop {
  position: fixed;
  inset: 0;
  z-index: 99;
}
.notify-btn.active {
  display: flex;
  color: #d97706;
}
.notify-btn:hover {
  background: var(--bg-tertiary);
  color: var(--accent-primary);
}
.close-btn:hover {
  background: var(--bg-tertiary);
  color: var(--danger);
}

.session-description {
  font-size: 11px;
  color: var(--text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.session-info {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text-tertiary);
}

.confirm-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.confirm-text {
  color: var(--danger);
  font-weight: 500;
}

.confirm-yes,
.confirm-no {
  background: none;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 1px 8px;
  font-size: 11px;
  cursor: pointer;
  color: var(--text-secondary);
}

.confirm-yes:hover {
  background: var(--danger);
  border-color: var(--danger);
  color: #fff;
}

.confirm-no:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.action-snippet {
  font-size: 11px;
  color: #d97706;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 2px;
  opacity: 0.9;
}
.action-snippet.action-approval {
  color: #dc2626;
}
.action-snippet.action-completed {
  color: #16a34a;
}

/* Collapsed state centering */
.session-card.collapsed {
  justify-content: center;
  padding: 12px;
}
.session-card.collapsed .status-indicator {
  width: 10px;
  height: 10px;
}
</style>
