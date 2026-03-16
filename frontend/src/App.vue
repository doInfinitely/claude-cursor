<script setup>
import { ref, provide, computed, onMounted } from "vue";
import Sidebar from "./components/Sidebar.vue";
import TerminalView from "./components/TerminalView.vue";
import CreateDialog from "./components/CreateDialog.vue";
import NotifyConfigDialog from "./components/NotifyConfigDialog.vue";
import ApiKeyDialog from "./components/ApiKeyDialog.vue";
import ShareExpiryDialog from "./components/ShareExpiryDialog.vue";
import Toast from "./components/Toast.vue";
import { useSessionStore } from "./stores/sessions";

const store = useSessionStore();

const shellSummary = computed(() => {
  const running = store.sessions.filter((s) => s.status === "running");
  if (!running.length) return "";
  const counts = {};
  for (const s of running) {
    const name = s.shell || "shell";
    counts[name] = (counts[name] || 0) + 1;
  }
  const plurals = { bash: "bashes", zsh: "zshs", fish: "fish", sh: "shells", shell: "shells" };
  return Object.entries(counts)
    .map(([shell, count]) => {
      const label = count > 1 ? (plurals[shell] || shell + "s") : shell;
      return `${count} ${label}`;
    })
    .join(", ");
});
const sidebarCollapsed = ref(false);
const showCreateDialog = ref(false);
const showApiKeyDialog = ref(false);
const notifyConfigSession = ref(null);
const shareCustomSession = ref(null);
const toastRef = ref(null);

const tunnelUrl = ref(null);
const tunnelCopied = ref(false);

async function refreshTunnelStatus() {
  try {
    const status = await store.fetchTunnelStatus();
    tunnelUrl.value = status.url || null;
  } catch {}
}

onMounted(() => {
  refreshTunnelStatus();
  // Retry after 20s in case tunnel hasn't connected yet on startup
  setTimeout(refreshTunnelStatus, 20000);
});

const tunnelMenuOpen = ref(false);

async function copyTunnelUrl() {
  if (!tunnelUrl.value) return;
  try {
    await navigator.clipboard.writeText(tunnelUrl.value);
    tunnelCopied.value = true;
    setTimeout(() => tunnelCopied.value = false, 2000);
  } catch {}
}

async function resetTunnelUrl() {
  try {
    await store.setBaseUrl(null);
    await refreshTunnelStatus();
  } catch {}
  tunnelMenuOpen.value = false;
}

// Mobile handling: Initially collapsed on mobile could be handled by media queries,
// but for state consistency, we might want to default to closed on small screens if we had window size detection.
// For now, let's just default to open on desktop (false) and we will use CSS to hide it on mobile unless open.
// Actually, a better mobile pattern is "Sidebar hidden by default".
// Let's rely on the CSS `transform` logic in Sidebar.vue which uses a class.
// But we need a reactive state for "mobileSidebarOpen".
// To simplify, let's re-use `sidebarCollapsed` but invert the meaning or implementation for mobile?
// No, let's keep it simple:
// Desktop: `sidebarCollapsed` toggles width.
// Mobile: `sidebarCollapsed` toggles visibility (transform).
// Wait, usually "collapsed=true" means hidden/small.
// On mobile, "collapsed=true" should mean hidden (default).
// On desktop, "collapsed=false" means open (default).

// Let's initialize based on basic heuristic or just default to false (Open) for desktop.
// On mobile, we want it closed by default.
// Adding a simple check (not SSR safe but fine for SPA):
const isMobile = window.innerWidth < 768;
if (isMobile) {
  sidebarCollapsed.value = true;
}

provide("toast", toastRef);
store.init();

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value;
}

function handleMobileOverlayClick() {
  sidebarCollapsed.value = true;
}
</script>

<template>
  <div class="app-layout">
    <header class="toolbar glass">
      <div class="toolbar-left">
        <button
          class="icon-btn toggle-btn"
          @click="toggleSidebar"
          aria-label="Toggle Sidebar"
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
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        <div class="logo-wrapper">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" class="brand-logo">
            <rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" stroke-width="2"/>
            <path d="M8 21h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M12 17v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M6 8l4 4-4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M13 16h5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </div>
        <h1 class="toolbar-title">Claude Cursor</h1>
        <button
          class="icon-btn settings-btn"
          @click="showApiKeyDialog = true"
          title="API Key Settings"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
          </svg>
          <span v-if="store.apiKeyAlert" class="alert-badge"></span>
        </button>
      </div>

      <div class="toolbar-right">
        <span v-if="shellSummary" class="shell-summary">{{ shellSummary }}</span>
        <div v-if="tunnelUrl" class="tunnel-wrapper">
          <button
            class="tunnel-btn"
            @click="copyTunnelUrl"
            :title="tunnelUrl"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="2" y1="12" x2="22" y2="12"></line>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
            </svg>
            <span class="tunnel-label">{{ tunnelCopied ? 'Copied!' : 'Public URL' }}</span>
          </button>
          <button class="tunnel-menu-btn" @click="tunnelMenuOpen = !tunnelMenuOpen" title="Options">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
          <div v-if="tunnelMenuOpen" class="tunnel-dropdown">
            <button @click="copyTunnelUrl(); tunnelMenuOpen = false">Copy URL</button>
            <button @click="resetTunnelUrl">Reset URL</button>
          </div>
          <div v-if="tunnelMenuOpen" class="tunnel-backdrop" @click="tunnelMenuOpen = false"></div>
        </div>
      </div>
    </header>

    <div class="main-area">
      <!-- Mobile Overlay -->
      <div
        class="sidebar-overlay"
        :class="{ show: !sidebarCollapsed }"
        @click="handleMobileOverlayClick"
      ></div>

      <Sidebar
        :collapsed="sidebarCollapsed"
        @create="showCreateDialog = true"
        @configure-notify="(name) => notifyConfigSession = name"
        @share-custom="(name) => shareCustomSession = name"
      />

      <TerminalView @create="showCreateDialog = true" />
    </div>

    <CreateDialog v-if="showCreateDialog" @close="showCreateDialog = false" />
    <NotifyConfigDialog
      v-if="notifyConfigSession"
      :session-name="notifyConfigSession"
      @close="notifyConfigSession = null"
    />
    <ShareExpiryDialog
      v-if="shareCustomSession"
      :session-name="shareCustomSession"
      @close="shareCustomSession = null"
    />
    <ApiKeyDialog
      v-if="showApiKeyDialog"
      @close="showApiKeyDialog = false"
    />
    <Toast ref="toastRef" />
  </div>
</template>

<style scoped>
.app-layout {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.toolbar {
  height: var(--toolbar-height);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
  z-index: 30; /* Desktop z-index */
  background: var(--bg-primary); /* Ensure background is opaque or semi-opaque */
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toggle-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
}
.toggle-btn:hover {
  color: var(--text-primary);
  background: var(--bg-tertiary);
}

.brand-logo {
  width: 20px;
  height: 20px;
  color: var(--accent-primary);
}

.logo-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, rgba(189, 183, 252, 0.15), rgba(160, 95, 26, 0.15));
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.toolbar-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.5px;
}

.settings-btn {
  position: relative;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
}
.settings-btn:hover {
  color: var(--text-primary);
  background: var(--bg-tertiary);
}

.alert-badge {
  position: absolute;
  top: 1px;
  right: 1px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #dc2626;
  box-shadow: 0 0 6px rgba(220, 38, 38, 0.6);
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.shell-summary {
  font-size: 13px;
  color: var(--text-tertiary);
  font-weight: 500;
}

.tunnel-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.tunnel-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: 1px solid var(--border-color);
  border-right: none;
  color: var(--text-secondary);
  padding: 4px 10px;
  border-radius: var(--radius-sm) 0 0 var(--radius-sm);
  cursor: pointer;
  font-size: 12px;
}
.tunnel-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}
.tunnel-btn svg {
  color: #16a34a;
}

.tunnel-menu-btn {
  display: flex;
  align-items: center;
  background: none;
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  padding: 4px 6px;
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  cursor: pointer;
}
.tunnel-menu-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.tunnel-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-md);
  z-index: 50;
  min-width: 120px;
}
.tunnel-dropdown button {
  display: block;
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  color: var(--text-secondary);
  padding: 8px 12px;
  font-size: 12px;
  cursor: pointer;
}
.tunnel-dropdown button:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}
.tunnel-dropdown button:first-child {
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
}
.tunnel-dropdown button:last-child {
  border-radius: 0 0 var(--radius-sm) var(--radius-sm);
}

.tunnel-backdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
}

.main-area {
  flex: 1;
  display: flex;
  overflow: hidden;
  position: relative;
}

/* Mobile Overlay */
.sidebar-overlay {
  display: none;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(2px);
  z-index: 15; /* Below sidebar (20) */
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

@media (max-width: 768px) {
  .sidebar-overlay {
    display: block;
  }
  .sidebar-overlay.show {
    opacity: 1;
    pointer-events: auto;
  }
}
</style>
