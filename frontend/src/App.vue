<script setup>
import { ref, provide, computed } from "vue";
import Sidebar from "./components/Sidebar.vue";
import TerminalView from "./components/TerminalView.vue";
import CreateDialog from "./components/CreateDialog.vue";
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
const toastRef = ref(null);

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
      </div>

      <div class="toolbar-right">
        <span v-if="shellSummary" class="shell-summary">{{ shellSummary }}</span>
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
      />

      <TerminalView @create="showCreateDialog = true" />
    </div>

    <CreateDialog v-if="showCreateDialog" @close="showCreateDialog = false" />
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

.shell-summary {
  font-size: 13px;
  color: var(--text-tertiary);
  font-weight: 500;
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
