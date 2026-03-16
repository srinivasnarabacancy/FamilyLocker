<template>
  <Teleport to="body">
    <Transition name="confirm-modal">
      <div v-if="modelValue" class="confirm-modal-overlay" @click.self="handleCancel">
        <div class="confirm-modal-card" role="dialog" aria-modal="true" :aria-labelledby="titleId">
          <!-- Close button -->
          <button class="confirm-modal-close" @click="handleCancel" aria-label="Close">
            <i class="bi bi-x-lg" />
          </button>

          <!-- Icon -->
          <div class="confirm-modal-icon" :class="`confirm-modal-icon--${variant}`">
            <i :class="icon" />
          </div>

          <!-- Content -->
          <h5 :id="titleId" class="confirm-modal-title">{{ title }}</h5>
          <p class="confirm-modal-message">{{ message }}</p>

          <!-- Actions -->
          <div class="confirm-modal-actions">
            <button
              class="btn confirm-modal-btn-confirm"
              :class="`confirm-modal-btn-confirm--${variant}`"
              @click="handleConfirm"
              :disabled="loading"
            >
              <span v-if="loading" class="spinner-border spinner-border-sm me-2" />
              {{ confirmText }}
            </button>
            <button class="btn confirm-modal-btn-cancel" @click="handleCancel" :disabled="loading">
              {{ cancelText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: 'Are you sure?',
  },
  message: {
    type: String,
    default: 'This action cannot be undone.',
  },
  confirmText: {
    type: String,
    default: 'Confirm',
  },
  cancelText: {
    type: String,
    default: 'Cancel',
  },
  icon: {
    type: String,
    default: 'bi bi-check-circle-fill',
  },
  variant: {
    type: String,
    default: 'primary', // primary | danger | warning
  },
  loading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel'])

// Unique id for aria
const titleId = computed(() => `confirm-modal-title-${Math.random().toString(36).slice(2, 7)}`)

function handleConfirm() {
  emit('confirm')
}

function handleCancel() {
  if (props.loading) return
  emit('update:modelValue', false)
  emit('cancel')
}
</script>
