import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'

/**
 * Where the live code's deadline is kept for the signed-in verification path.
 * sessionStorage rather than component state so refreshing the OTP screen does
 * not restart the countdown at the full ten minutes.
 */
const OTP_EXPIRY_KEY = 'otp_expires_at'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const token = ref(localStorage.getItem('auth_token') || null)
  const initialized = ref(false)
  let initializePromise = null

  const isAuthenticated = computed(() => !!token.value && !!user.value)

  /**
   * Mirrors the API's `verified` guard, which in turn ports
   * User::hasVerifiedEmail(): an account with no e-mail address counts as
   * verified, because invited members may only have a phone number.
   */
  const isVerified = computed(() => {
    if (!user.value) return false
    return !user.value.email || !!user.value.email_verified_at
  })

  const needsVerification = computed(() => isAuthenticated.value && !isVerified.value)

  function setSession(data) {
    token.value = data.token
    user.value = data.user
    initialized.value = true
    localStorage.setItem('auth_token', data.token)
  }

  function clearSession() {
    token.value = null
    user.value = null
    initialized.value = true
    localStorage.removeItem('auth_token')
    sessionStorage.removeItem(OTP_EXPIRY_KEY)
  }

  /**
   * The deadline of the code currently in the user's inbox, as an ISO-8601
   * string, or null when none is known. Always an absolute instant — a
   * remaining-seconds count would drift while the tab is backgrounded and
   * would be lost on reload.
   */
  function otpExpiry() {
    return sessionStorage.getItem(OTP_EXPIRY_KEY)
  }

  function setOtpExpiry(expiresAt) {
    if (expiresAt) {
      sessionStorage.setItem(OTP_EXPIRY_KEY, expiresAt)
    } else {
      sessionStorage.removeItem(OTP_EXPIRY_KEY)
    }
  }

  /**
   * The API issues a token even when the account is unverified, so the client
   * can reach the OTP screen; every protected endpoint stays blocked server-side
   * until the code is entered. Returns `requires_verification` so the caller
   * knows where to route.
   */
  async function login(credentials) {
    const { data } = await api.post('/auth/login', credentials)
    setSession(data.data)
    // Present only when the account is unverified and a code went out.
    setOtpExpiry(data.data.otp_expires_at ?? null)
    return data.data
  }

  /**
   * Starts a sign-up. No account exists yet — the API holds the details and
   * emails a code, returning an opaque token used to finish or resend.
   *
   * The token lives in sessionStorage so a page refresh on the OTP screen does
   * not strand the user, and it is cleared as soon as the account is created.
   */
  async function register(payload) {
    const { data } = await api.post('/auth/register', payload)

    sessionStorage.setItem('pending_registration', JSON.stringify({
      token: data.data.pending_token,
      email: data.data.email,
      expiresAt: data.data.otp_expires_at,
    }))

    return data.data
  }

  /** The sign-up awaiting a code, if any. */
  function pendingRegistration() {
    try {
      return JSON.parse(sessionStorage.getItem('pending_registration') || 'null')
    } catch {
      return null
    }
  }

  function clearPendingRegistration() {
    sessionStorage.removeItem('pending_registration')
  }

  /** Completes the sign-up: the account is created only now. */
  async function verifyRegistration(otp) {
    const pending = pendingRegistration()
    if (!pending) throw new Error('No sign-up in progress.')

    const { data } = await api.post('/auth/register/verify', {
      pending_token: pending.token,
      otp,
    })

    clearPendingRegistration()
    setSession(data.data)
    return data.data
  }

  async function resendRegistrationOtp() {
    const pending = pendingRegistration()
    if (!pending) throw new Error('No sign-up in progress.')

    const { data } = await api.post('/auth/register/resend', {
      pending_token: pending.token,
    })

    // Refresh the stored deadline so a reload after a resend still counts down
    // against the code that is actually live.
    const expiresAt = data.data?.otp_expires_at ?? null
    sessionStorage.setItem(
      'pending_registration',
      JSON.stringify({ ...pending, expiresAt }),
    )

    return { ...data, expiresAt }
  }

  async function logout() {
    try {
      await api.post('/auth/logout')
    } finally {
      clearSession()
    }
  }

  async function verifyOtp(otp) {
    const { data } = await api.post('/auth/verify-otp', { otp })
    // A successful verification returns the refreshed user.
    if (data.data) user.value = data.data
    setOtpExpiry(null)
    return data
  }

  async function resendVerification() {
    const { data } = await api.post('/auth/resend-verification')
    const expiresAt = data.data?.otp_expires_at ?? null
    setOtpExpiry(expiresAt)
    return { ...data, expiresAt }
  }

  async function fetchMe() {
    try {
      const { data } = await api.get('/auth/me')
      user.value = data.data
    } catch {
      clearSession()
    } finally {
      initialized.value = true
    }
  }

  async function initialize() {
    if (initialized.value) return
    if (initializePromise) return initializePromise

    initializePromise = (async () => {
      if (token.value) {
        await fetchMe()
      } else {
        initialized.value = true
      }
    })().finally(() => {
      initializePromise = null
    })

    return initializePromise
  }

  async function updateProfile(formData) {
    const { data } = await api.post('/auth/profile', formData)
    user.value = data.data
    return data
  }

  async function changePassword(payload) {
    const { data } = await api.post('/auth/change-password', payload)
    return data
  }

  return {
    user,
    token,
    initialized,
    isAuthenticated,
    isVerified,
    needsVerification,
    login,
    register,
    logout,
    verifyOtp,
    pendingRegistration,
    clearPendingRegistration,
    verifyRegistration,
    resendRegistrationOtp,
    resendVerification,
    otpExpiry,
    setOtpExpiry,
    fetchMe,
    initialize,
    updateProfile,
    changePassword,
  }
})
