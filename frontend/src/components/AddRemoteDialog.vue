<script setup>
import { ref } from "vue";
import { useSessionStore } from "../stores/sessions";

const emit = defineEmits(["close"]);
const store = useSessionStore();

const url = ref("");
const label = ref("");
const loading = ref(false);
const error = ref("");

async function handleSubmit() {
  if (loading.value || !url.value.trim()) return;
  error.value = "";
  loading.value = true;
  try {
    await store.addRemoteServer(url.value.trim(), label.value.trim() || undefined);
    emit("close");
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal-content glass">
      <div class="modal-header">
        <h3>Add Remote Instance</h3>
        <button class="close-btn" @click="emit('close')">&#10005;</button>
      </div>

      <div class="modal-body">
        <label class="form-group">
          <span class="label-text">URL</span>
          <input
            v-model="url"
            type="text"
            placeholder="https://... (instance or share link)"
            @keyup.enter="handleSubmit"
            @input="error = ''"
            autofocus
          />
          <span class="input-hint">Paste a full instance URL or share link</span>
        </label>

        <label class="form-group">
          <span class="label-text">Label (Optional)</span>
          <input
            v-model="label"
            type="text"
            placeholder="My remote server"
            @keyup.enter="handleSubmit"
          />
        </label>

        <div v-if="error" class="error-msg">{{ error }}</div>
      </div>

      <div class="modal-footer">
        <button class="btn" @click="emit('close')">Cancel</button>
        <button
          class="btn btn-primary"
          @click="handleSubmit"
          :disabled="loading || !url.trim()"
        >
          {{ loading ? "Connecting..." : "Add Remote" }}
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

input {
  width: 100%;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  padding: 10px;
  border-radius: var(--radius-md);
  outline: none;
  font-size: 14px;
}

input:focus {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 2px var(--accent-dim);
}

.input-hint {
  font-size: 11px;
  color: var(--text-tertiary);
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
