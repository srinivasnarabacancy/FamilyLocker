import { ref } from 'vue'

/**
 * Per-field validation errors for a form.
 *
 * The API returns 422 with Laravel's shape — `{ field: [messages] }` — so the
 * body is stored as-is and FormField picks the first message per field.
 *
 * Every form uses this rather than hand-rolling an errors ref, so the capture
 * logic (and the decision about what counts as a validation failure versus a
 * real error) lives in one place.
 */
export function useFormErrors() {
  const errors = ref({})

  function clear() {
    errors.value = {}
  }

  /**
   * Records a 422's field errors and reports whether it handled the error.
   * Anything else is left to the caller, which usually shows a toast.
   */
  function capture(err) {
    if (err?.response?.status === 422) {
      errors.value = err.response.data?.errors ?? {}
      return true
    }
    return false
  }

  /** Clears one field, so a message disappears as soon as the user edits it. */
  function clearField(field) {
    if (errors.value[field]) {
      const next = { ...errors.value }
      delete next[field]
      errors.value = next
    }
  }

  return { errors, clear, capture, clearField }
}
