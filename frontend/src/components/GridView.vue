<script setup>
import { computed } from "vue";
import { useSessionStore } from "../stores/sessions";

const store = useSessionStore();

const runningSessions = computed(() =>
  store.allSessions.filter((s) => s.status === "running" && s.terminalUrl)
);
</script>

<template>
  <div class="grid-view">
    <div class="grid-toolbar">
      <span class="grid-label">Columns:</span>
      <button
        v-for="n in 4"
        :key="n"
        class="col-btn"
        :class="{ active: store.gridColumns === n }"
        @click="store.setGridColumns(n)"
      >
        {{ n }}
      </button>
    </div>

    <div
      class="grid-container"
      :style="{ gridTemplateColumns: `repeat(${store.gridColumns}, 1fr)` }"
    >
      <div
        v-for="s in runningSessions"
        :key="s.displayKey"
        class="grid-cell"
        :class="{ active: store.current === s.displayKey }"
        @click="store.select(s.displayKey)"
      >
        <div class="cell-header">
          <span class="status-dot running"></span>
          <span class="cell-name">{{ s.name }}</span>
          <span v-if="s.remote" class="remote-badge">remote</span>
        </div>
        <iframe
          :src="s.terminalUrl"
          class="cell-frame"
          allow="clipboard-read; clipboard-write"
        ></iframe>
      </div>

      <div v-if="!runningSessions.length" class="grid-empty">
        <p>No running sessions</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.grid-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg-primary);
}

.grid-toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-secondary);
  flex-shrink: 0;
}

.grid-label {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-right: 4px;
}

.col-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  background: var(--bg-primary);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}
.col-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}
.col-btn.active {
  background: var(--accent-primary);
  color: #3b110c;
  border-color: var(--accent-primary);
}

.grid-container {
  flex: 1;
  display: grid;
  gap: 4px;
  padding: 4px;
  overflow: auto;
}

.grid-cell {
  display: flex;
  flex-direction: column;
  border: 2px solid var(--border-color);
  border-radius: var(--radius-sm);
  overflow: hidden;
  cursor: pointer;
  min-height: 0;
}
.grid-cell.active {
  border-color: var(--accent-primary);
}

.cell-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.status-dot.running {
  background: #16a34a;
  box-shadow: 0 0 6px rgba(22, 163, 74, 0.5);
}

.cell-name {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.remote-badge {
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 4px;
  background: rgba(189, 183, 252, 0.15);
  color: var(--accent-primary);
  border: 1px solid rgba(189, 183, 252, 0.25);
  flex-shrink: 0;
}

.cell-frame {
  flex: 1;
  width: 100%;
  border: none;
  background: #000;
  min-height: 200px;
}

.grid-empty {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: var(--text-tertiary);
  font-size: 14px;
}
</style>
