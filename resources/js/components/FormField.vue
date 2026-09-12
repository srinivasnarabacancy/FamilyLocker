<template>
  <!-- input/change events bubble from whatever the slot renders, so one pair
       of listeners here clears the message as soon as the user edits, without
       every call site wiring its own handler. -->
  <div class="form-field" @input="clearOnEdit" @change="clearOnEdit">
    <label v-if="label" class="form-label fw-semibold" :for="fieldId">
      {{ label }}<span v-if="required" class="form-field__required" aria-hidden="true">*</span>
    </label>

    <!-- The control itself. `fieldId` is exposed so the caller can bind it and
         keep the label association, but binding it is optional. -->
    <slot :id="fieldId" :invalid="!!message" />

    <p v-if="message" class="form-field__error" role="alert">{{ message }}</p>
    <p v-else-if="hint" class="form-field__hint">{{ hint }}</p>
  </div>
</template>

<script setup>
/**
 * Label + control + validation message, used by every form in the app.
 *
 * Deliberately does NOT put an error state on the control itself: the styling
 * brief is a red asterisk on the label and a red message underneath, with the
 * input left alone. Bootstrap's `is-invalid` would add a red border and icon,
 * so it is not used here.
 *
 * `error` accepts either a string or Laravel's array-of-messages, so a 422
 * response body can be handed straight in without reshaping.
 */
import { computed, inject, useId } from 'vue'

const props = defineProps({
  label: { type: String, default: '' },
  required: { type: Boolean, default: false },
  /** String, or the array Laravel returns for a field. */
  error: { type: [String, Array], default: null },
  /** Helper text shown only while there is no error. */
  hint: { type: String, default: '' },
  /** Override the generated id when the caller needs a specific one. */
  id: { type: String, default: '' },
  /**
   * Key this field occupies in the errors object. Supplied so the message can
   * clear itself on edit; without it the field still renders, it just waits
   * for the next submit to refresh.
   */
  field: { type: String, default: '' },
})

/**
 * Provided by the page (see useFormErrors / useForm). Optional: a form that
 * does not provide it simply keeps its messages until the next submit.
 */
const clearFormField = inject('clearFormField', null)

function clearOnEdit() {
  if (props.field && message.value) clearFormField?.(props.field)
}

const generatedId = useId()
const fieldId = computed(() => props.id || `field-${generatedId}`)

const message = computed(() => {
  const e = props.error
  if (!e) return ''
  return Array.isArray(e) ? (e[0] ?? '') : e
})
</script>

<style scoped>
.form-field {
  /* Bootstrap's .mb-3 is applied by callers; nothing structural here. */
}

.form-field__required {
  color: #dc3545;
  margin-left: 0.2rem;
  font-weight: 700;
}

.form-field__error {
  margin: 0.35rem 0 0;
  font-size: 0.8125rem;
  line-height: 1.35;
  color: #dc3545;
}

.form-field__hint {
  margin: 0.35rem 0 0;
  font-size: 0.8125rem;
  line-height: 1.35;
  color: #6b7280;
}
</style>
