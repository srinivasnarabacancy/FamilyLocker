<template>
  <div class="auth-wrapper">
    <CsrfMetaSync />
    <slot />
    <ToastContainer />
  </div>
</template>

<script setup>
import CsrfMetaSync from '@/components/CsrfMetaSync.vue'
import ToastContainer from '@/components/ToastContainer.vue'
</script>
