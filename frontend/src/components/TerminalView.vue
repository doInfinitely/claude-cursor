<script setup>
import { computed } from "vue";
import { useSessionStore } from "../stores/sessions";

const store = useSessionStore();
const emit = defineEmits(["create"]);

const currentSession = computed(() => {
  return store.sessions.find((s) => s.name === store.current);
});

const iframeSrc = computed(() => {
  if (!currentSession.value || currentSession.value.status !== "running")
    return null;
  return `/terminal/${currentSession.value.name}`;
});
</script>

<template>
  <div class="terminal-area">
    <iframe
      v-if="iframeSrc"
      :key="iframeSrc"
      :src="iframeSrc"
      class="terminal-frame"
      allow="clipboard-read; clipboard-write"
    ></iframe>

    <div v-else class="welcome__container">
      <div class="welcome__content">
        <div class="logo-text">Claude Cursor</div>

        <template v-if="!currentSession">
          <p class="welcome__text">No active session selected.</p>
          <button class="btn btn-primary" @click="emit('create')">
            Create First Session
          </button>
        </template>

        <template v-else>
          <p class="welcome__text">
            Session <span class="highlight">{{ currentSession.name }}</span> is
            currently stopped.
          </p>
          <p class="sub-text">Restart the session to continue.</p>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.terminal-area {
  flex: 1;
  display: flex;
  overflow: hidden;
  background: #000; /* Terminal background */
  position: relative;
}

.terminal-frame {
  width: 100%;
  height: 100%;
  border: none;
  background: #000;
}

.welcome__container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-primary);
  background-image: radial-gradient(
    circle at center,
    var(--bg-secondary) 0%,
    var(--bg-primary) 100%
  );
}

.welcome__content {
  text-align: center;
  max-width: 400px;
  padding: 40px;
}

.logo-text {
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 24px;
  background: linear-gradient(
    135deg,
    var(--text-primary),
    var(--text-secondary)
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: -1px;
}

.welcome__text {
  color: var(--text-secondary);
  font-size: 16px;
  margin-bottom: 24px;
}

.highlight {
  color: var(--text-primary);
  font-weight: 600;
}

.sub-text {
  color: var(--text-tertiary);
  font-size: 14px;
}
</style>
