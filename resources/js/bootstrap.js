import axios from 'axios'

window.axios = axios

window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest'
window.axios.defaults.withCredentials = true

window.axios.interceptors.request.use((config) => {
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')

  if (csrfToken) {
    config.headers['X-CSRF-TOKEN'] = csrfToken
  } else {
    delete config.headers['X-CSRF-TOKEN']
  }

  return config
})
