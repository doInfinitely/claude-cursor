<script setup>
import { computed } from "vue";
import { useSessionStore } from "../stores/sessions";
import SessionCard from "./SessionCard.vue";

defineProps({
  collapsed: Boolean,
  mobile: Boolean,
});

const emit = defineEmits(["create", "configure-notify", "share-custom", "add-remote"]);
const store = useSessionStore();

const ACTION_PRIORITY = { approval: 0, completed: 1, prompt: 2, flagged: 3 };

function actionRank(session) {
  if (!session.needsAction) return 10;
  return ACTION_PRIORITY[session.actionType] ?? 3;
}

const sortedSessions = computed(() => {
  return [...store.sessions].sort((a, b) => {
    // Sort by action priority (approval > completed > prompt > none)
    const ra = actionRank(a);
    const rb = actionRank(b);
    if (ra !== rb) return ra - rb;
    // then running before stopped
    if (a.status === "running" && b.status !== "running") return -1;
    if (a.status !== "running" && b.status === "running") return 1;
    return 0;
  });
});

const runningCount = computed(() =>
  store.sessions.filter((s) => s.status === "running").length
);

const needsActionCount = computed(() =>
  store.sessions.filter((s) => s.needsAction).length
);

const approvalCount = computed(() =>
  store.sessions.filter((s) => s.needsAction && s.actionType === "approval").length
);
</script>

<template>
  <aside class="sidebar" :class="{ collapsed }">
    <div class="sidebar-header">
      <h2 class="sidebar-title" v-show="!collapsed">
        Sessions
        <span v-if="needsActionCount" class="action-badge" :class="{ urgent: approvalCount }">{{ needsActionCount }}</span>
      </h2>
      <div class="header-buttons">
        <button
          class="icon-btn new-session-btn"
          @click="emit('create')"
          title="New Session"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span v-show="!collapsed">New Session</span>
        </button>
        <button
          class="icon-btn add-remote-btn"
          @click="emit('add-remote')"
          title="Add Remote"
          v-show="!collapsed"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="2" y1="12" x2="22" y2="12"></line>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
          </svg>
        </button>
      </div>
    </div>

    <div class="session-list">
      <SessionCard
        v-for="s in sortedSessions"
        :key="s.name"
        :session="s"
        :active="store.current === s.name"
        :collapsed="collapsed"
        @click="store.select(s.name)"
        @configure-notify="(name) => emit('configure-notify', name)"
        @share-custom="(name) => emit('share-custom', name)"
      />

      <div v-if="!store.sessions.length" class="empty-hint" v-show="!collapsed">
        <p>No active sessions</p>
        <p class="sub-hint">Create one to get started</p>
      </div>

      <!-- Remote server groups -->
      <template v-for="server in store.remoteServers" :key="server.id">
        <div class="remote-group" v-show="!collapsed">
          <div class="remote-group-header">
            <span class="remote-group-label">{{ server.label }}</span>
            <button
              class="remote-remove-btn"
              @click.stop="store.removeRemoteServer(server.id)"
              title="Remove remote"
            >&#10005;</button>
          </div>
          <SessionCard
            v-for="rs in (store.remoteSessionsMap[server.id] || [])"
            :key="rs.remoteId + ':' + rs.name"
            :session="rs"
            :active="store.current === rs.remoteId + ':' + rs.name"
            :collapsed="collapsed"
            @click="store.select(rs.remoteId + ':' + rs.name)"
          />
          <div v-if="!(store.remoteSessionsMap[server.id] || []).length" class="remote-empty">
            No sessions
          </div>
        </div>
      </template>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: var(--sidebar-width);
  border-right: 1px solid var(--border-color);
  background: var(--bg-secondary);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  height: 100%;
  z-index: 20;
}

.sidebar.collapsed {
  width: 72px; /* collapsed width for icons */
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sidebar-title {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-tertiary);
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
}

.action-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: #d97706;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0;
  text-transform: none;
}
.action-badge.urgent {
  background: #dc2626;
}

.new-session-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  background: var(--accent-primary);
  color: #3b110c;
  border: none;
  border-radius: var(--radius-md);
  padding: 10px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.new-session-btn:hover {
  background: var(--accent-hover);
}

.sidebar.collapsed .new-session-btn {
  padding: 10px 0;
}

.session-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.empty-hint {
  text-align: center;
  padding: 40px 10px;
  color: var(--text-tertiary);
}
.empty-hint p {
  font-size: 14px;
  margin-bottom: 4px;
}
.empty-hint .sub-hint {
  font-size: 12px;
  opacity: 0.7;
}

.header-buttons {
  display: flex;
  gap: 8px;
}

.add-remote-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 10px;
  cursor: pointer;
  flex-shrink: 0;
}
.add-remote-btn:hover {
  background: var(--bg-primary);
  color: var(--text-primary);
}

.remote-group {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
}

.remote-group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
  padding: 0 2px;
}

.remote-group-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-tertiary);
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.remote-remove-btn {
  background: none;
  border: none;
  color: var(--text-tertiary);
  cursor: pointer;
  font-size: 12px;
  padding: 2px 4px;
  border-radius: 3px;
  line-height: 1;
}
.remote-remove-btn:hover {
  background: var(--bg-tertiary);
  color: var(--danger);
}

.remote-empty {
  font-size: 12px;
  color: var(--text-tertiary);
  padding: 8px 4px;
  opacity: 0.7;
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: var(--sidebar-width);
    transform: translateX(0);
    box-shadow: var(--shadow-md);
    z-index: 50; /* Above toolbar (30) */
  }

  .sidebar.collapsed {
    transform: translateX(-100%);
    width: var(--sidebar-width); /* maintain width when hidden */
  }
}
</style>
