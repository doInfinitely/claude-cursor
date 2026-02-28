<script setup>
import { ref, computed } from "vue";
import { useSessionStore } from "../stores/sessions";

const emit = defineEmits(["close"]);
const store = useSessionStore();

const form = ref({
  name: "",
  command: store.shells.length ? store.shells[0].id : "bash",
});

const loading = ref(false);
const error = ref("");

const nameHint = computed(() => {
  return form.value.name ? form.value.name : `${form.value.command}-auto`;
});

async function handleSubmit() {
  if (loading.value) return;
  error.value = "";
  loading.value = true;
  try {
    await store.create(form.value);
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
        <h3>Create New Session</h3>
        <button class="close-btn" @click="emit('close')">✕</button>
      </div>

      <div class="modal-body">
        <label class="form-group">
          <span class="label-text">Session Name (Optional)</span>
          <input
            v-model="form.name"
            type="text"
            :placeholder="nameHint"
            @keyup.enter="handleSubmit"
            @input="error = ''"
          />
          <span class="input-hint">Letters, numbers, hyphens and underscores only</span>
        </label>

        <div v-if="error" class="error-msg">{{ error }}</div>

        <label class="form-group">
          <span class="label-text">Shell</span>
          <select v-model="form.command">
            <option v-for="s in store.shells" :key="s.id" :value="s.id">
              {{ s.name }}
            </option>
          </select>
        </label>
      </div>

      <div class="modal-footer">
        <button class="btn" @click="emit('close')">Cancel</button>
        <button
          class="btn btn-primary"
          @click="handleSubmit"
          :disabled="loading"
        >
          {{ loading ? "Creating..." : "Create Session" }}
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
  max-width: 400px;
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

select,
input {
  width: 100%;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  padding: 10px;
  border-radius: var(--radius-md);
  outline: none;
  font-size: 14px;
  appearance: none;
}

select:focus,
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
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
</style>
