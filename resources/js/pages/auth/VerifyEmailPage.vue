<template>
  <div class="auth-card verification-card">
    <div class="auth-logo">
      <div class="logo-box">🏠</div>
      <div class="logo-text">
        <h2>FamilyLocker</h2>
        <p>One quick verification step.</p>
      </div>
    </div>

    <h5 class="fw-bold mb-2">Enter verification code</h5>
    <p class="text-muted small mb-3">
      We sent a 6-digit code to
      <span class="fw-semibold text-dark">{{ userEmail }}</span>.
      Enter it below to access your family workspace.
    </p>

    <form @submit.prevent="handleVerify">
      <!-- 6-box OTP input -->
      <div class="otp-inputs mb-3">
        <input
          v-for="(_, i) in otpDigits"
          :key="i"
          :ref="el => { if (el) inputRefs[i] = el }"
          v-model="otpDigits[i]"
          type="text"
          inputmode="numeric"
          maxlength="1"
          class="otp-input"
          :class="{ 'is-invalid': otpForm.errors.otp && i === 0 }"
          @input="onDigitInput(i, $event)"
          @keydown="onKeyDown(i, $event)"
          @paste="onPaste($event)"
        />
      </div>

      <div v-if="otpForm.errors.otp" class="text-danger small mb-3 text-center">
        {{ otpForm.errors.otp }}
      </div>

      <button
        type="submit"
        class="btn btn-primary w-100 py-2 mb-2"
        :disabled="otpForm.processing || otp.length < 6"
      >
        <span v-if="otpForm.processing" class="spinner-border spinner-border-sm me-2" />
        <span v-else><i class="bi bi-shield-check me-2" /></span>
        Verify Code
      </button>
    </form>

    <div class="verification-hint mb-3">
      Check your inbox and spam folder. The code expires in <strong>10 minutes</strong>.
    </div>

    <button
      type="button"
      class="btn btn-outline-secondary w-100 py-2"
      :disabled="resendForm.processing"
      @click="handleResend"
    >
      <span v-if="resendForm.processing" class="spinner-border spinner-border-sm me-2" />
      <span v-else><i class="bi bi-arrow-repeat me-2" /></span>
      Resend Code
    </button>

    <button
      type="button"
      class="btn btn-link w-100 py-1 mt-1 text-muted small"
      @click="handleLogout"
    >
      Use a Different Account
    </button>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { router, useForm, usePage } from '@inertiajs/vue3'

const page = usePage()
const otpDigits = reactive(Array(6).fill(''))
const inputRefs = ref([])

const otpForm = useForm({ otp: '' })
const resendForm = useForm({})

const userEmail = computed(() => page.props.auth?.user?.email ?? 'your email address')
const otp = computed(() => otpDigits.join(''))

function onDigitInput(index, event) {
  const val = event.target.value.replace(/\D/g, '')
  otpDigits[index] = val ? val[val.length - 1] : ''
  if (val && index < 5) {
    inputRefs.value[index + 1]?.focus()
  }
}

function onKeyDown(index, event) {
  if (event.key === 'Backspace' && !otpDigits[index] && index > 0) {
    inputRefs.value[index - 1]?.focus()
  }
}

function onPaste(event) {
  const paste = (event.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '')
  if (!paste) return
  event.preventDefault()
  for (let i = 0; i < 6; i++) {
    otpDigits[i] = paste[i] ?? ''
  }
  inputRefs.value[Math.min(paste.length, 5)]?.focus()
}

function handleVerify() {
  otpForm.otp = otp.value
  otpForm.post('/email/verify-otp', { preserveScroll: true })
}

function handleResend() {
  resendForm
    .transform(() => ({ _token: page.props.csrf_token }))
    .post('/email/verification-notification', {
      preserveScroll: true,
      onSuccess: () => {
        otpDigits.fill('')
        otpForm.clearErrors()
        inputRefs.value[0]?.focus()
      },
    })
}

function handleLogout() {
  router.post('/logout', { _token: page.props.csrf_token })
}
</script>

<style scoped>
.verification-card {
  max-width: 480px;
}

.otp-inputs {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.otp-input {
  width: 52px;
  height: 60px;
  text-align: center;
  font-size: 1.6rem;
  font-weight: 700;
  border: 2px solid #dee2e6;
  border-radius: 12px;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  color: #6c5ce7;
}

.otp-input:focus {
  border-color: #6c5ce7;
  box-shadow: 0 0 0 3px rgba(108, 92, 231, 0.15);
}

.otp-input.is-invalid {
  border-color: #dc3545;
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

