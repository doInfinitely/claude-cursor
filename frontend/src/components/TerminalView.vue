<script setup>
import { computed, ref, onMounted, onUnmounted } from "vue";
import { useSessionStore } from "../stores/sessions";

const store = useSessionStore();
const emit = defineEmits(["create"]);

const isDragging = ref(false);
const iframeRef = ref(null);

const currentSession = computed(() => {
  return store.sessions.find((s) => s.name === store.current);
});

const iframeSrc = computed(() => {
  if (!currentSession.value || currentSession.value.status !== "running")
    return null;
  return `/terminal/${currentSession.value.name}`;
});

// Drag-and-drop file upload
// The iframe swallows drag events, so we synchronously disable its pointer-events
// on the first dragenter, then use coordinate checks to detect when the drag
// actually leaves the browser window.
function setIframePointerEvents(value) {
  if (iframeRef.value) iframeRef.value.style.pointerEvents = value;
}

function onWindowDragEnter(e) {
  if (!e.dataTransfer?.types?.includes("Files") || !iframeSrc.value) return;
  isDragging.value = true;
  // Synchronous — takes effect before the browser routes the next drag event
  setIframePointerEvents("none");
}

function onWindowDragLeave(e) {
  // Only reset when the drag actually leaves the browser window.
  // When moving between child elements, clientX/clientY stay within bounds.
  const { clientX, clientY } = e;
  if (
    clientX <= 0 ||
    clientY <= 0 ||
    clientX >= window.innerWidth ||
    clientY >= window.innerHeight
  ) {
    isDragging.value = false;
    setIframePointerEvents("");
  }
}

function onWindowDragOver(e) {
  e.preventDefault();
}

function onWindowDrop(e) {
  e.preventDefault();
  isDragging.value = false;
  setIframePointerEvents("");
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function onDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  isDragging.value = false;
  setIframePointerEvents("");

  const files = e.dataTransfer?.files;
  if (!files?.length || !currentSession.value) return;

  for (const file of files) {
    const base64 = await readFileAsBase64(file);
    try {
      await fetch(`/api/sessions/${currentSession.value.name}/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: base64, filename: file.name }),
      });
    } catch (err) {
      console.error("Upload error:", err);
    }
  }
}

onMounted(() => {
  window.addEventListener("dragenter", onWindowDragEnter);
  window.addEventListener("dragleave", onWindowDragLeave);
  window.addEventListener("dragover", onWindowDragOver);
  window.addEventListener("drop", onWindowDrop);
});

onUnmounted(() => {
  window.removeEventListener("dragenter", onWindowDragEnter);
  window.removeEventListener("dragleave", onWindowDragLeave);
  window.removeEventListener("dragover", onWindowDragOver);
  window.removeEventListener("drop", onWindowDrop);
});
</script>

<template>
  <div class="terminal-area">
    <iframe
      v-if="iframeSrc"
      ref="iframeRef"
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

    <!-- Drop overlay -->
    <div
      v-show="isDragging"
      class="drop-overlay"
      @dragover.prevent
      @dragleave.prevent="isDragging = false"
      @drop.prevent="onDrop"
    >
      <div class="drop-content">
        <div class="drop-text">Drop file to paste path into terminal</div>
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

.drop-overlay {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(59, 17, 12, 0.85);
  border: 2px dashed var(--accent, #bdb7fc);
  pointer-events: all;
}

.drop-content {
  text-align: center;
  pointer-events: none;
}

.drop-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.drop-text {
  color: var(--text-primary, #f8eed2);
  font-size: 16px;
  font-weight: 500;
}
</style>
