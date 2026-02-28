<script setup>
import { ref } from 'vue'

const toasts = ref([])
let idCounter = 0

function show(message, type = 'info') {
  const id = ++idCounter
  toasts.value.push({ id, message, type })
  setTimeout(() => {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }, 3000)
}

defineExpose({ show })
</script>

<template>
  <div class="toast-container">
    <TransitionGroup name="toast">
      <div
        v-for="t in toasts"
        :key="t.id"
        class="toast"
        :class="t.type"
      >
        {{ t.message }}
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-container {
  position: fixed;
  top: 60px;
  right: 16px;
  z-index: 200;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.toast {
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 13px;
  backdrop-filter: blur(12px);
  border: 1px solid var(--border-color);
  min-width: 200px;
}

.toast.info {
  background: var(--accent-dim);
  color: var(--accent-primary);
}

.toast.error {
  background: rgba(218, 28, 28, 0.15);
  color: var(--danger);
}

.toast.success {
  background: rgba(16, 185, 129, 0.15);
  color: var(--success);
}

.toast-enter-active {
  animation: slideIn 0.3s ease;
}

.toast-leave-active {
  animation: slideOut 0.3s ease;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes slideOut {
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
}
</style>
