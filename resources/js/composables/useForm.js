import { reactive } from 'vue'
import api from '@/services/api'

/**
 * Form helper for the API-backed SPA.
 *
 * Deliberately mirrors the surface of Inertia's `useForm` — `form.<field>`,
 * `form.errors`, `form.processing`, `form.post()`, `form.transform()` — so the
 * page templates carried over from the Inertia build did not have to change
 * when the backend moved to the Node API.
 *
 * Two differences worth knowing:
 *  - `form.errors.x` is a STRING (the first message), matching what the
 *    templates render, while the API returns `{ field: [messages] }`.
 *  - `form.error` holds a general, non-field message (for example the 401 from
 *    a bad login), which Inertia used to deliver as a flashed session error.
 */
export function useForm(initial = {}) {
  const defaults = { ...initial }
  let transformer = (data) => data

  const form = reactive({
    ...initial,

    errors: {},
    error: null,
    processing: false,

    /** Current values of the declared fields only (never the helpers). */
    data() {
      return Object.fromEntries(Object.keys(defaults).map((key) => [key, form[key]]))
    },

    transform(callback) {
      transformer = callback
      return form
    },

    reset(...fields) {
      const keys = fields.length ? fields : Object.keys(defaults)
      keys.forEach((key) => {
        form[key] = defaults[key]
      })
      return form
    },

    clearErrors() {
      form.errors = {}
      form.error = null
      return form
    },

    async submit(method, url, options = {}) {
      form.processing = true
      form.clearErrors()

      try {
        const payload = transformer(form.data())
        const { data } = await api[method](url, payload)

        options.onSuccess?.(data)
        return data
      } catch (err) {
        const body = err.response?.data

        if (body?.errors && typeof body.errors === 'object') {
          // Laravel-shaped `{ field: [messages] }` — templates want one string.
          form.errors = Object.fromEntries(
            Object.entries(body.errors).map(([field, messages]) => [
              field,
              Array.isArray(messages) ? messages[0] : messages,
            ])
          )
        } else {
          form.error = body?.message ?? 'Something went wrong. Please try again.'
        }

        options.onError?.(form.errors, form.error)
        return null
      } finally {
        form.processing = false
        options.onFinish?.()
      }
    },

    /**
     * Runs an arbitrary async action (typically a Pinia store method) with the
     * same processing/error handling as `post`. Lets the auth pages go through
     * the auth store — which owns the token — without losing form state.
     */
    async run(action, options = {}) {
      form.processing = true
      form.clearErrors()

      try {
        const result = await action(form.data())
        options.onSuccess?.(result)
        return result ?? true
      } catch (err) {
        const body = err.response?.data

        if (body?.errors && typeof body.errors === 'object') {
          form.errors = Object.fromEntries(
            Object.entries(body.errors).map(([field, messages]) => [
              field,
              Array.isArray(messages) ? messages[0] : messages,
            ])
          )
        } else {
          form.error = body?.message ?? 'Something went wrong. Please try again.'
        }

        options.onError?.(form.errors, form.error)
        return null
      } finally {
        form.processing = false
        options.onFinish?.()
      }
    },

    post(url, options) {
      return form.submit('post', url, options)
    },
    put(url, options) {
      return form.submit('put', url, options)
    },
    patch(url, options) {
      return form.submit('patch', url, options)
    },
  })

  return form
}
