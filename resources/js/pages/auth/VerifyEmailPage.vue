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

    <div v-if="generalError" class="alert alert-danger py-2 small" role="alert">
      <i class="bi bi-exclamation-circle me-1" />{{ generalError }}
    </div>

    <form novalidate @submit.prevent="handleVerify">
      <!-- 6-box OTP input -->
      <div class="otp-inputs mb-3">
        <input
          v-for="(_, i) in otpDigits"
          :key="i"
          :ref="el => { if (el) inputRefs[i] = el }"
          v-model="otpDigits[i]"
          type="text"
          inputmode="numeric"
          autocomplete="one-time-code"
          maxlength="1"
          class="otp-input"
          :disabled="isExpired || otpForm.processing"
          @input="onDigitInput(i, $event)"
          @keydown="onKeyDown(i, $event)"
          @paste="onPaste($event)"
        />
      </div>

      <div v-if="otpForm.errors.otp" class="text-danger small mb-3 text-center">
        {{ otpForm.errors.otp }}
      </div>

      <!--
        The form still submits on Enter and the button stays for a retry, but
        in the normal case the sixth digit fires the request on its own.
      -->
      <button
        type="submit"
        class="btn btn-primary w-100 py-2 mb-2"
        :disabled="otpForm.processing || otp.length < 6 || isExpired"
      >
        <span v-if="otpForm.processing" class="spinner-border spinner-border-sm me-2" />
        <span v-else><i class="bi bi-shield-check me-2" /></span>
        {{ otpForm.processing ? 'Verifying…' : 'Verify Code' }}
      </button>
    </form>

    <!-- Live countdown against the code's real deadline. -->
    <div
      class="verification-hint mb-3"
      :class="{ 'verification-hint--urgent': isUrgent, 'verification-hint--expired': isExpired }"
      aria-live="polite"
    >
      <template v-if="isExpired">
        <i class="bi bi-clock-history me-1" />
        This code has expired. Request a new one to continue.
      </template>
      <template v-else-if="countdown">
        Check your inbox and spam folder. This code expires in
        <strong class="countdown">{{ countdown }}</strong>.
      </template>
      <template v-else>
        Check your inbox and spam folder. The code expires in
        <strong>{{ expiryMinutes }} minutes</strong>.
      </template>
    </div>

    <button
      type="button"
      class="btn w-100 py-2"
      :class="isExpired ? 'btn-primary' : 'btn-outline-secondary'"
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
      {{ isSignUp ? 'Use a different email' : 'Use a Different Account' }}
    </button>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useForm } from '@/composables/useForm'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const auth = useAuthStore()
const { showToast } = useToast()

const otpDigits = reactive(Array(6).fill(''))
const inputRefs = ref([])

const otpForm = useForm({ otp: '' })
const resendForm = useForm({})

// Two ways to reach this screen:
//   - mid sign-up: no account exists yet, identified by the pending token
//   - signed in with an address still unverified (invited members, and
//     accounts created before the two-step flow)
const pending = ref(auth.pendingRegistration())
const isSignUp = computed(() => !!pending.value)

const userEmail = computed(
  () => pending.value?.email ?? auth.user?.email ?? 'your email address',
)

// Non-field failures — a mail outage, a network error — arrive as form.error.
// Without this they were silently dropped and the screen just did nothing.
const generalError = computed(() => otpForm.error || resendForm.error)

// Sign-up codes are short-lived; the account-verification path keeps its
// original 10-minute window. Only a fallback label — the countdown below runs
// off the deadline the API actually issued.
const expiryMinutes = computed(() => (isSignUp.value ? 5 : 10))
const otp = computed(() => otpDigits.join(''))

// ─── Countdown ──────────────────────────────────────────────────────────────
//
// The clock runs against the absolute instant the API stamped on the code, not
// a decremented counter: a counter drifts whenever the browser throttles timers
// in a background tab, and would restart on reload. Reading the wall clock each
// tick means the display re-syncs by itself after a sleep or a tab switch.

/** Deadline in epoch ms, or null when the API did not report one. */
const expiresAt = ref(null)
const now = ref(Date.now())
let ticker = null

function readExpiry() {
  const raw = isSignUp.value ? pending.value?.expiresAt : auth.otpExpiry()
  const parsed = raw ? Date.parse(raw) : NaN
  expiresAt.value = Number.isNaN(parsed) ? null : parsed
}

const secondsLeft = computed(() => {
  if (expiresAt.value === null) return null
  return Math.max(0, Math.ceil((expiresAt.value - now.value) / 1000))
})

/** m:ss, the shape people read a countdown in. Null hides it entirely. */
const countdown = computed(() => {
  if (secondsLeft.value === null) return null
  const minutes = Math.floor(secondsLeft.value / 60)
  const seconds = secondsLeft.value % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
})

// A deadline we never learned cannot expire — fall back to the static hint
// rather than locking someone out of a code that is still perfectly valid.
const isExpired = computed(() => secondsLeft.value === 0)
const isUrgent = computed(() => secondsLeft.value !== null && secondsLeft.value <= 60 && !isExpired.value)

function startTicker() {
  stopTicker()
  now.value = Date.now()
  // Nothing to count toward — the static hint is shown instead.
  if (expiresAt.value === null) return
  ticker = setInterval(() => {
    now.value = Date.now()
    if (isExpired.value) stopTicker()
  }, 1000)
}

function stopTicker() {
  if (ticker) clearInterval(ticker)
  ticker = null
}

// Coming back to a backgrounded tab, the last tick may be well out of date.
function syncNow() {
  if (document.visibilityState === 'visible') {
    now.value = Date.now()
    if (!isExpired.value && !ticker) startTicker()
  }
}

onMounted(() => {
  readExpiry()
  startTicker()
  document.addEventListener('visibilitychange', syncNow)
  inputRefs.value[0]?.focus()
})

onUnmounted(() => {
  stopTicker()
  document.removeEventListener('visibilitychange', syncNow)
})

// Once the code dies there is nothing to type in — clear the boxes so the next
// code starts clean and the disabled inputs are not left holding stale digits.
watch(isExpired, (expired) => {
  if (expired) otpDigits.fill('')
})

// ─── Entry ──────────────────────────────────────────────────────────────────

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

/**
 * The sixth digit is the whole code — there is nothing left for the user to
 * decide, so submit it rather than making them reach for the button. A failed
 * attempt clears the boxes, which drops `otp` back to '' and re-arms this for
 * the next try; the `processing` guard keeps one in-flight request at a time.
 */
watch(otp, (value) => {
  if (value.length < 6 || otpForm.processing || isExpired.value) return

  nextTick(() => {
    // Pull focus off the last box so the mobile keyboard drops away while the
    // request runs and the spinner is actually visible.
    inputRefs.value[5]?.blur()
    handleVerify()
  })
})

// ─── Actions ────────────────────────────────────────────────────────────────

async function handleVerify() {
  if (otpForm.processing || isExpired.value) return

  const result = await otpForm.run(() =>
    isSignUp.value ? auth.verifyRegistration(otp.value) : auth.verifyOtp(otp.value),
  )

  if (!result) {
    // Clear the boxes so the next attempt starts from a clean slate.
    otpDigits.fill('')

    // With no button press to tie the failure to, the inline message alone is
    // easy to miss — say it out loud as well.
    showToast(otpForm.errors.otp || otpForm.error || 'That code could not be verified.', 'danger')

    // A dead or exhausted sign-up cannot be retried here — send them back to
    // the form rather than leaving them on a screen that can never succeed.
    if (isSignUp.value && !auth.pendingRegistration()) {
      router.push({ name: 'register' })
      return
    }

    // The boxes are still rendered disabled from `processing` at this point;
    // focusing before Vue flushes would be dropped on the floor.
    await nextTick()
    inputRefs.value[0]?.focus()
    return
  }

  stopTicker()
  showToast(
    isSignUp.value
      ? 'Account created and email verified. Welcome to FamilyLocker!'
      : 'Email verified successfully. Welcome to FamilyLocker!',
    'success',
  )
  router.push({ name: 'dashboard' })
}

async function handleResend() {
  const result = await resendForm.run(() =>
    isSignUp.value ? auth.resendRegistrationOtp() : auth.resendVerification(),
  )
  if (!result) {
    showToast(resendForm.error || 'We could not send a new code. Please try again.', 'danger')
    return
  }

  // A new code means a new deadline — restart the clock before unlocking input.
  pending.value = auth.pendingRegistration()
  readExpiry()
  startTicker()

  otpDigits.fill('')
  otpForm.clearErrors()
  await nextTick()
  inputRefs.value[0]?.focus()

  showToast(`A new 6-digit code has been sent to ${userEmail.value}.`, 'success')
}

async function handleLogout() {
  // Mid sign-up there is no session to end — just discard the pending row's
  // handle and return to the form.
  if (isSignUp.value) {
    auth.clearPendingRegistration()
    auth.setOtpExpiry(null)
    pending.value = null
    router.push({ name: 'register' })
    return
  }

  await auth.logout()
  router.push({ name: 'login' })
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


.otp-input:disabled {
  background: #f1f3f5;
  border-color: #e9ecef;
  color: #adb5bd;
}

.verification-hint {
  padding: 0.9rem 1rem;
  border: 1px solid rgba(108, 92, 231, 0.14);
  border-radius: 14px;
  background: rgba(108, 92, 231, 0.05);
  color: #5f6780;
  font-size: 0.92rem;
  line-height: 1.6;
  transition: background-color 0.3s, border-color 0.3s, color 0.3s;
}

/* Tabular figures stop the box twitching as the digits change each second. */
.countdown {
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum';
}

.verification-hint--urgent {
  border-color: rgba(253, 126, 20, 0.35);
  background: rgba(253, 126, 20, 0.08);
  color: #9a5b06;
}

.verification-hint--expired {
  border-color: rgba(220, 53, 69, 0.35);
  background: rgba(220, 53, 69, 0.08);
  color: #b02a37;
}
</style>
