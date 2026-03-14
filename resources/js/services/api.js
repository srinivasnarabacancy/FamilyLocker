import axios from 'axios'
import { router } from '@inertiajs/vue3'

function getCsrfToken() {
  return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  headers: {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
})

api.interceptors.request.use(
  (config) => {
    const csrfToken = getCsrfToken()

    if (csrfToken) {
      config.headers['X-CSRF-TOKEN'] = csrfToken
    } else {
      delete config.headers['X-CSRF-TOKEN']
    }

    // Let the browser set the multipart boundary for FormData uploads.
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type']
    }

    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor - handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      router.visit('/login')
    }
    return Promise.reject(error)
  }
)

export default api
