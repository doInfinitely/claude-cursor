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
      <span class="grid-label">Size:</span>
      <input
        type="range"
        class="size-slider"
        min="200"
        max="1200"
        :value="store.gridCellWidth"
        @input="store.setGridCellWidth(+$event.target.value)"
      />
    </div>

    <div
      class="grid-container"
      :style="{ gridTemplateColumns: `repeat(auto-fill, minmax(${store.gridCellWidth}px, 1fr))` }"
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
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-secondary);
  flex-shrink: 0;
}

.grid-label {
  font-size: 12px;
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.size-slider {
  width: 140px;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--border-color);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}
.size-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--accent-primary);
  cursor: pointer;
}

.grid-container {
  flex: 1;
  display: grid;
  gap: 4px;
  padding: 4px;
  overflow: auto;
  align-content: start;
}

.grid-cell {
  display: flex;
  flex-direction: column;
  border: 2px solid var(--border-color);
  border-radius: var(--radius-sm);
  overflow: hidden;
  cursor: pointer;
  height: 350px;
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
