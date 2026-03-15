<script setup>
import { ref, onMounted } from "vue";
import { useSessionStore } from "../stores/sessions";

const emit = defineEmits(["close"]);
const store = useSessionStore();

const loading = ref(true);
const saving = ref(false);
const configured = ref(false);
const valid = ref(false);
const maskedKey = ref(null);
const keyInput = ref("");
const error = ref("");
const success = ref("");

onMounted(async () => {
  try {
    const status = await store.fetchApiKeyStatus();
    configured.value = status.configured;
    valid.value = status.valid;
    maskedKey.value = status.maskedKey;
  } catch (e) {
    error.value = "Failed to load API key status";
  } finally {
    loading.value = false;
  }
});

async function handleSave() {
  if (saving.value || !keyInput.value.trim()) return;
  error.value = "";
  success.value = "";
  saving.value = true;

  try {
    const result = await store.saveApiKey(keyInput.value.trim());
    if (result.valid) {
      success.value = "API key saved and validated";
      keyInput.value = "";
      // Refresh status
      const status = await store.fetchApiKeyStatus();
      configured.value = status.configured;
      valid.value = status.valid;
      maskedKey.value = status.maskedKey;
    } else {
      error.value = result.error || "Invalid API key";
    }
  } catch (e) {
    error.value = e.message;
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal-content glass">
      <div class="modal-header">
        <h3>API Key Settings</h3>
        <button class="close-btn" @click="emit('close')">&#x2715;</button>
      </div>

      <div class="modal-body">
        <p class="helper-text">
          An Anthropic API key enables AI-powered features: session descriptions
          and needs-action detection.
        </p>

        <!-- Current status -->
        <div class="key-status">
          <div class="status-row">
            <span
              class="status-dot"
              :class="valid ? 'valid' : configured ? 'invalid' : 'unconfigured'"
            ></span>
            <span class="status-label">
              <template v-if="loading">Checking...</template>
              <template v-else-if="valid">Key configured and valid</template>
              <template v-else-if="configured">Key configured but invalid</template>
              <template v-else>No API key configured</template>
            </span>
          </div>
          <div v-if="maskedKey" class="masked-key">{{ maskedKey }}</div>
        </div>

        <!-- Input -->
        <label class="form-group">
          <span class="label-text">{{ configured ? 'Replace API Key' : 'Enter API Key' }}</span>
          <input
            v-model="keyInput"
            type="password"
            placeholder="sk-ant-..."
            @keyup.enter="handleSave"
          />
          <span class="input-hint">
            Get your key from
            <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener">console.anthropic.com</a>
          </span>
        </label>

        <div v-if="success" class="success-msg">{{ success }}</div>
        <div v-if="error" class="error-msg">{{ error }}</div>
      </div>

      <div class="modal-footer">
        <button class="btn" @click="emit('close')">Close</button>
        <button
          class="btn btn-primary"
          @click="handleSave"
          :disabled="saving || !keyInput.trim()"
        >
          {{ saving ? "Validating..." : "Validate & Save" }}
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

.helper-text {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.key-status {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  background: var(--bg-primary);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
}

.status-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.status-dot.valid {
  background: #16a34a;
  box-shadow: 0 0 6px rgba(22, 163, 74, 0.5);
}
.status-dot.invalid {
  background: #dc2626;
  box-shadow: 0 0 6px rgba(220, 38, 38, 0.5);
}
.status-dot.unconfigured {
  background: var(--text-tertiary);
}

.status-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.masked-key {
  font-family: monospace;
  font-size: 12px;
  color: var(--text-tertiary);
  padding: 4px 8px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  word-break: break-all;
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
.input-hint a {
  color: var(--accent-primary);
  text-decoration: none;
}
.input-hint a:hover {
  text-decoration: underline;
}

.success-msg {
  font-size: 13px;
  color: #16a34a;
  background: rgba(22, 163, 74, 0.1);
  border: 1px solid rgba(22, 163, 74, 0.3);
  border-radius: var(--radius-md);
  padding: 8px 12px;
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
