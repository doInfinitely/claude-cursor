<script setup>
import { ref } from "vue";
import { useSessionStore } from "../stores/sessions";

defineProps({
  session: Object,
  active: Boolean,
  collapsed: Boolean,
});

const store = useSessionStore();
const confirming = ref(false);

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
</script>

<template>
  <div
    class="session-card"
    :class="{ active, collapsed }"
    :title="session.name"
  >
    <div class="status-indicator" :class="[session.status, { 'needs-action': session.needsAction }]"></div>

    <div class="card-content" v-show="!collapsed">
      <div class="card-top">
        <div class="session-name">{{ session.name }}</div>
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
      <div v-if="session.needsAction && session.needsActionSnippet" class="action-snippet">
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

.status-indicator.needs-action {
  background: #d97706;
  box-shadow: 0 0 8px rgba(217, 119, 6, 0.6);
  animation: pulse-amber 2s ease-in-out infinite;
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
.session-card:hover .close-btn {
  display: flex;
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
