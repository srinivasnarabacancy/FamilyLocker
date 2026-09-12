import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'

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
    return data.data
  }

  async function register(payload) {
    const { data } = await api.post('/auth/register', payload)
    setSession(data.data)
    return data.data
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
    return data
  }

  async function resendVerification() {
    const { data } = await api.post('/auth/resend-verification')
    return data
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
    resendVerification,
    fetchMe,
    initialize,
    updateProfile,
    changePassword,
  }
})
