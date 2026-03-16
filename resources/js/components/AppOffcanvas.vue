<template>
  <Teleport to="body">
    <!-- Backdrop -->
    <Transition name="offcanvas-backdrop">
      <div v-if="modelValue" class="app-offcanvas-backdrop" @click="handleClose" />
    </Transition>

    <!-- Panel -->
    <Transition name="offcanvas-panel">
      <div
        v-if="modelValue"
        class="app-offcanvas"
        :class="`app-offcanvas--${placement}`"
        role="dialog"
        :aria-label="title"
      >
        <!-- Header -->
        <div class="app-offcanvas__header">
          <div>
            <h5 class="app-offcanvas__title">{{ title }}</h5>
            <p v-if="subtitle" class="app-offcanvas__subtitle">{{ subtitle }}</p>
          </div>
          <button class="app-offcanvas__close" @click="handleClose" aria-label="Close">
            &#x2715;
          </button>
        </div>

        <!-- Body -->
        <div class="app-offcanvas__body">
          <slot />
        </div>

        <!-- Footer -->
        <div v-if="$slots.footer" class="app-offcanvas__footer">
          <slot name="footer" />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: '',
  },
  subtitle: {
    type: String,
    default: '',
  },
  icon: {
    type: String,
    default: '',
  },
  placement: {
    type: String,
    default: 'end', // 'end' | 'start' | 'top' | 'bottom'
  },
})

const emit = defineEmits(['update:modelValue', 'close'])

function handleClose() {
  emit('update:modelValue', false)
  emit('close')
}

// Lock body scroll when open
watch(
  () => props.modelValue,
  (open) => {
    document.body.style.overflow = open ? 'hidden' : ''
  },
)
</script>
