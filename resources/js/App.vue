<template>
  <router-view />

  <!-- Global Toast Container -->
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
          <i class="bi me-2" :class="toast.type === 'success' ? 'bi-check-circle' : 'bi-x-circle'" />
          {{ toast.message }}
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" @click="removeToast(toast.id)" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'

const authStore = useAuthStore()
const { toasts, removeToast } = useToast()
</script>
