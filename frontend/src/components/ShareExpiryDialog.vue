<script setup>
import { ref, computed } from "vue";
import { useSessionStore } from "../stores/sessions";

const props = defineProps({
  sessionName: String,
});

const emit = defineEmits(["close"]);
const store = useSessionStore();

const mode = ref("duration"); // 'duration' or 'never'
const amount = ref(1);
const unit = ref("hours");
const loading = ref(false);
const error = ref("");
const copied = ref(false);

const units = [
  { value: "minutes", label: "Minutes" },
  { value: "hours", label: "Hours" },
  { value: "days", label: "Days" },
  { value: "weeks", label: "Weeks" },
];

const expiresInMinutes = computed(() => {
  if (mode.value === "never") return 0;
  const n = Math.max(1, Math.floor(amount.value));
  const multipliers = { minutes: 1, hours: 60, days: 1440, weeks: 10080 };
  return n * (multipliers[unit.value] || 60);
});

const expiryLabel = computed(() => {
  if (mode.value === "never") return "Never expires";
  const n = Math.max(1, Math.floor(amount.value));
  const u = unit.value === "minutes" && n === 1 ? "minute" :
            unit.value === "hours" && n === 1 ? "hour" :
            unit.value === "days" && n === 1 ? "day" :
            unit.value === "weeks" && n === 1 ? "week" :
            unit.value;
  return `Expires in ${n} ${u}`;
});

async function handleShare() {
  if (loading.value) return;
  error.value = "";
  loading.value = true;
  try {
    const expiresIn = mode.value === "never" ? 525960 : expiresInMinutes.value; // ~1 year for "never"
    const share = await store.shareSession(props.sessionName, expiresIn);
    let url = share.shareUrl;
    if (!url) {
      const status = await store.fetchTunnelStatus();
      const base = status.url || status.baseUrl || window.location.origin;
      url = `${base}${share.path}`;
    }
    await navigator.clipboard.writeText(url);
    copied.value = true;
    setTimeout(() => emit("close"), 1200);
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
        <h3>Share "{{ sessionName }}"</h3>
        <button class="close-btn" @click="emit('close')">&#x2715;</button>
      </div>

      <div class="modal-body">
        <div class="mode-toggle">
          <button
            class="mode-btn"
            :class="{ active: mode === 'duration' }"
            @click="mode = 'duration'"
          >
            Timed
          </button>
          <button
            class="mode-btn"
            :class="{ active: mode === 'never' }"
            @click="mode = 'never'"
          >
            No expiry
          </button>
        </div>

        <div v-if="mode === 'duration'" class="duration-row">
          <input
            v-model.number="amount"
            type="number"
            min="1"
            class="amount-input"
            @keyup.enter="handleShare"
          />
          <select v-model="unit" class="unit-select">
            <option v-for="u in units" :key="u.value" :value="u.value">
              {{ u.label }}
            </option>
          </select>
        </div>

        <div v-else class="never-hint">
          The link will remain valid until the session is deleted or the server restarts.
        </div>

        <div v-if="error" class="error-msg">{{ error }}</div>

        <div class="expiry-preview">{{ expiryLabel }}</div>
      </div>

      <div class="modal-footer">
        <button class="btn" @click="emit('close')">Cancel</button>
        <button
          class="btn btn-primary"
          @click="handleShare"
          :disabled="loading"
        >
          {{ copied ? "Copied!" : loading ? "Creating..." : "Copy Share Link" }}
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
  max-width: 380px;
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
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-tertiary);
  cursor: pointer;
  font-size: 18px;
  padding: 4px;
  border-radius: 4px;
  flex-shrink: 0;
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

.mode-toggle {
  display: flex;
  gap: 0;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.mode-btn {
  flex: 1;
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 500;
  background: var(--bg-primary);
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
}

.mode-btn + .mode-btn {
  border-left: 1px solid var(--border-color);
}

.mode-btn.active {
  background: var(--accent-primary);
  color: #fff;
}

.mode-btn:not(.active):hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.duration-row {
  display: flex;
  gap: 10px;
}

.amount-input {
  flex: 1;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  padding: 10px;
  border-radius: var(--radius-md);
  outline: none;
  font-size: 14px;
  appearance: textfield;
  -moz-appearance: textfield;
}
.amount-input::-webkit-inner-spin-button,
.amount-input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.amount-input:focus {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 2px var(--accent-dim);
}

.unit-select {
  flex: 1;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  padding: 10px;
  border-radius: var(--radius-md);
  outline: none;
  font-size: 14px;
  appearance: none;
}

.unit-select:focus {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 2px var(--accent-dim);
}

.never-hint {
  font-size: 13px;
  color: var(--text-tertiary);
  line-height: 1.4;
}

.expiry-preview {
  font-size: 12px;
  color: var(--text-tertiary);
  text-align: center;
  padding: 6px;
  background: var(--bg-primary);
  border-radius: var(--radius-md);
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
