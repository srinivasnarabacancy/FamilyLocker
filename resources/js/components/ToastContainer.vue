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
import { useToast } from '@/composables/useToast'

// Flash messages used to arrive as Inertia shared props from the Laravel
// session. With a token-based SPA there is no server-rendered request, so
// pages raise their own toasts via showToast().
const { toasts, removeToast } = useToast()

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


</script>
