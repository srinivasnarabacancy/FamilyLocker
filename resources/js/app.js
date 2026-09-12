import './bootstrap'
import { createApp, h } from 'vue'
import { createInertiaApp } from '@inertiajs/vue3'
import { createPinia } from 'pinia'
import AppLayout from '@/layouts/AppLayout.vue'
import AuthLayout from '@/layouts/AuthLayout.vue'

import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import '../css/app.scss'

const pages = import.meta.glob('./pages/**/*.vue', { eager: true })

function getCsrfToken() {
  return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
}

createInertiaApp({
  title: (title) => title ? `${title} - FamilyLocker` : 'FamilyLocker',
  defaults: {
    visitOptions: (_href, options) => {
      const csrfToken = getCsrfToken()

      return {
        ...options,
        headers: {
          ...options.headers,
          ...(csrfToken ? { 'X-CSRF-TOKEN': csrfToken } : {}),
        },
      }
    },
  },
  resolve: (name) => {
    const page = pages[`./pages/${name}.vue`]

    if (!page) {
      throw new Error(`Unknown Inertia page: ${name}`)
    }

    page.default.layout ??= name.startsWith('auth/')
      ? AuthLayout
      : AppLayout

    return page
  },
  setup({ el, App, props, plugin }) {
    const app = createApp({ render: () => h(App, props) })

    app.use(plugin)
    app.use(createPinia())
    app.mount(el)
  },
})
