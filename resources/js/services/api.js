import axios from 'axios'
import router from '@/router'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
})

api.interceptors.request.use(
  (config) => {
    // Bearer tokens only. The Node API has no session/CSRF layer — the previous
    // X-CSRF-TOKEN header existed for Laravel's stateful Sanctum guard.
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }

    // Let the browser set the multipart boundary for FormData uploads.
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type']
    }

    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status

    if (status === 401) {
      localStorage.removeItem('auth_token')
      // Avoid a redirect loop when the failing call IS the login attempt.
      if (router.currentRoute.value.name !== 'login') {
        router.push({ name: 'login' })
      }
    }

    // 403 from the API means the account exists but is not verified yet.
    if (status === 403 && router.currentRoute.value.name !== 'verify-email') {
      router.push({ name: 'verify-email' })
    }

    return Promise.reject(error)
  }
)

export default api
