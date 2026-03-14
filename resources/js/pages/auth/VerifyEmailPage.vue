<template>
  <div class="auth-card verification-card">
    <div class="auth-logo">
      <div class="logo-box">🏠</div>
      <div class="logo-text">
        <h2>FamilyLocker</h2>
        <p>One quick verification step.</p>
      </div>
    </div>

    <h5 class="fw-bold mb-2">Verify your email</h5>
    <p class="text-muted small mb-3">
      We sent a verification link to
      <span class="fw-semibold text-dark">{{ userEmail }}</span>.
      Please confirm it before accessing your family workspace.
    </p>

    <div class="verification-hint mb-4">
      Check your inbox and spam folder. If the message does not arrive, you can resend it below.
    </div>

    <button
      type="button"
      class="btn btn-primary w-100 py-2"
      :disabled="resendForm.processing"
      @click="handleResend"
    >
      <span v-if="resendForm.processing" class="spinner-border spinner-border-sm me-2" />
      <span v-else><i class="bi bi-envelope-check me-2" /></span>
      Resend Verification Email
    </button>

    <button
      type="button"
      class="btn btn-outline-secondary w-100 py-2 mt-2"
      @click="handleLogout"
    >
      <i class="bi bi-box-arrow-left me-2" />
      Use a Different Account
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { router, useForm, usePage } from '@inertiajs/vue3'

const page = usePage()
const resendForm = useForm({})

const userEmail = computed(() => page.props.auth?.user?.email ?? 'your email address')

function handleResend() {
  resendForm
    .transform(() => ({
      _token: page.props.csrf_token,
    }))
    .post('/email/verification-notification', {
      preserveScroll: true,
    })
}

function handleLogout() {
  router.post('/logout', {
    _token: page.props.csrf_token,
  })
}
</script>

<style scoped>
.verification-card {
  max-width: 480px;
}

.verification-hint {
  padding: 0.9rem 1rem;
  border: 1px solid rgba(108, 92, 231, 0.14);
  border-radius: 14px;
  background: rgba(108, 92, 231, 0.05);
  color: #5f6780;
  font-size: 0.92rem;
  line-height: 1.6;
}
</style>
