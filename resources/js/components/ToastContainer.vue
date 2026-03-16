<template>
  <Teleport to="body">
    <div class="fl-toast-container">
      <TransitionGroup name="fl-toast" tag="div">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="fl-toast"
          :class="`fl-toast--${toast.type}`"
          role="alert"
        >
          <!-- Icon -->
          <div class="fl-toast__icon">
            <i class="bi" :class="toastIcon(toast.type)" />
          </div>

          <!-- Content -->
          <div class="fl-toast__body">
            <div class="fl-toast__title">{{ toastTitle(toast.type) }}</div>
            <div class="fl-toast__message">{{ toast.message }}</div>
          </div>

          <!-- Close -->
          <button class="fl-toast__close" @click="removeToast(toast.id)" aria-label="Dismiss">
            <i class="bi bi-x-lg" />
          </button>

          <!-- Progress bar -->
          <div class="fl-toast__progress">
            <div
              class="fl-toast__progress-bar"
              :style="{ animationDuration: toast.duration + 'ms' }"
            />
          </div>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup>
import { usePage } from '@inertiajs/vue3'
import { watch } from 'vue'
import { useToast } from '@/composables/useToast'

const page = usePage()
const { toasts, showToast, removeToast } = useToast()

function toastIcon(type) {
  return {
    success: 'bi-check-circle-fill',
    danger: 'bi-x-circle-fill',
    warning: 'bi-exclamation-triangle-fill',
    info: 'bi-info-circle-fill',
  }[type] ?? 'bi-info-circle-fill'
}

function toastTitle(type) {
  return {
    success: 'Success',
    danger: 'Error',
    warning: 'Warning',
    info: 'Info',
  }[type] ?? 'Notice'
}

watch(() => page.props.flash?.success, (message) => {
  if (message) showToast(message, 'success')
}, { immediate: true })

watch(() => page.props.flash?.error, (message) => {
  if (message) showToast(message, 'danger')
}, { immediate: true })
</script>
