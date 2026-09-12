import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const token = ref(localStorage.getItem('auth_token') || null)
  const initialized = ref(false)
  let initializePromise = null

  const isAuthenticated = computed(() => !!token.value && !!user.value)

  async function login(credentials) {
    const { data } = await api.post('/auth/login', credentials)
    token.value = data.data.token
    user.value = data.data.user
    initialized.value = true
    localStorage.setItem('auth_token', token.value)
    return data
  }

  async function register(payload) {
    const { data } = await api.post('/auth/register', payload)
    token.value = data.data.token
    user.value = data.data.user
    initialized.value = true
    localStorage.setItem('auth_token', token.value)
    return data
  }

  async function logout() {
    try {
      await api.post('/auth/logout')
    } finally {
      token.value = null
      user.value = null
      initialized.value = true
      localStorage.removeItem('auth_token')
    }
  }

  async function fetchMe() {
    try {
      const { data } = await api.get('/auth/me')
      user.value = data.data
    } catch {
      token.value = null
      user.value = null
      localStorage.removeItem('auth_token')
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
    login,
    register,
    logout,
    fetchMe,
    initialize,
    updateProfile,
    changePassword,
  }
})
