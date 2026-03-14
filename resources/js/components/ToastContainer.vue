<template>
  <div class="toast-container position-fixed bottom-0 end-0 p-3" style="z-index:9999">
    <div
      v-for="toast in toasts"
      :key="toast.id"
      class="toast show align-items-center text-white border-0"
      :class="`bg-${toast.type === 'success' ? 'success' : toast.type === 'danger' ? 'danger' : 'info'}`"
      role="alert"
    >
      <div class="d-flex">
        <div class="toast-body fw-semibold">
          <i class="bi me-2" :class="toast.type === 'success' ? 'bi-check-circle' : toast.type === 'danger' ? 'bi-x-circle' : 'bi-info-circle'" />
          {{ toast.message }}
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" @click="removeToast(toast.id)" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { usePage } from '@inertiajs/vue3'
import { watch } from 'vue'
import { useToast } from '@/composables/useToast'

const page = usePage()
const { toasts, showToast, removeToast } = useToast()

watch(() => page.props.flash?.success, (message) => {
  if (message) {
    showToast(message, 'success')
  }
}, { immediate: true })

watch(() => page.props.flash?.error, (message) => {
  if (message) {
    showToast(message, 'danger')
  }
}, { immediate: true })
</script>
