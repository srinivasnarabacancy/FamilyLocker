<template>
  <div class="auth-wrapper">
    <router-view />
    <!-- Toasts are rendered by App.vue (bottom-right). ToastContainer is the
         top-centre variant — disabled for now so notifications do not appear
         twice. Re-enable here and remove App.vue's inline container to switch. -->
    <!-- <ToastContainer /> -->
  </div>
</template>

<script setup>
// import ToastContainer from '@/components/ToastContainer.vue'
</script>
