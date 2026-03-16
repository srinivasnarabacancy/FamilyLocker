import { ref } from 'vue'

const toasts = ref([])
let counter = 0

export function useToast() {
  function showToast(message, type = 'success', duration = 4000) {
    const id = ++counter
    toasts.value.push({ id, message, type, duration, createdAt: Date.now() })
    setTimeout(() => removeToast(id), duration)
  }

  function removeToast(id) {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  return { toasts, showToast, removeToast }
}
