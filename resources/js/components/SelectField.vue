<template>
  <div ref="rootEl" class="fl-select" :class="{ 'fl-select--open': open, 'fl-select--disabled': disabled }">
    <button
      :id="id"
      ref="triggerEl"
      type="button"
      class="fl-select__trigger"
      :disabled="disabled"
      role="combobox"
      :aria-expanded="open"
      aria-haspopup="listbox"
      @click="toggle"
      @keydown="onTriggerKey"
    >
      <span class="fl-select__value" :class="{ 'fl-select__value--placeholder': !selected }">
        {{ selected ? selected.label : placeholder }}
      </span>
      <i class="bi bi-chevron-down fl-select__caret" />
    </button>

    <!-- Teleported so the popup is never clipped by an offcanvas or a card
         with overflow set. Position is taken from the trigger each time it
         opens, and kept in step on scroll and resize. -->
    <Teleport to="body">
      <div
        v-if="open"
        ref="popupEl"
        class="fl-select__popup"
        :style="popupStyle"
        role="listbox"
        @mousedown.prevent
      >
        <div v-if="searchable" class="fl-select__search">
          <i class="bi bi-search" />
          <input
            ref="searchEl"
            v-model="query"
            type="text"
            placeholder="Search…"
            @keydown="onListKey"
          />
        </div>

        <ul class="fl-select__list" :class="{ 'fl-select__list--scroll': filtered.length > 7 }">
          <li
            v-for="(opt, i) in filtered"
            :key="opt.value"
            class="fl-select__option"
            :class="{
              'fl-select__option--active': i === activeIndex,
              'fl-select__option--selected': opt.value === modelValue,
            }"
            role="option"
            :aria-selected="opt.value === modelValue"
            @mouseenter="activeIndex = i"
            @click="choose(opt)"
          >
            <span class="fl-select__option-label">{{ opt.label }}</span>
            <i v-if="opt.value === modelValue" class="bi bi-check2 fl-select__tick" />
          </li>

          <li v-if="!filtered.length" class="fl-select__empty">No matches</li>
        </ul>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
/**
 * Styled single-select, replacing native <select>.
 *
 * A native select's popup is drawn by the operating system and cannot be
 * styled, so matching the rest of the UI means owning the popup.
 *
 * The list is teleported to <body> and positioned from the trigger's bounding
 * box. Rendering it in place would let an offcanvas or any `overflow: hidden`
 * ancestor clip it, which is the usual failure of hand-rolled dropdowns.
 */
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: [String, Number, null], default: '' },
  /** `{ value, label }` objects, or plain strings used as both. */
  options: { type: Array, default: () => [] },
  placeholder: { type: String, default: 'Select' },
  disabled: { type: Boolean, default: false },
  id: { type: String, default: '' },
  /** Show the filter box only once the list passes this length. */
  searchThreshold: { type: Number, default: 10 },
  /**
   * Property names to read from each option, so existing lists can be passed
   * as they are — e.g. expense categories use `id` / `name`.
   */
  valueKey: { type: String, default: 'value' },
  labelKey: { type: String, default: 'label' },
})

const emit = defineEmits(['update:modelValue', 'change'])

const rootEl = ref(null)
const triggerEl = ref(null)
const popupEl = ref(null)
const searchEl = ref(null)

const open = ref(false)
const query = ref('')
const activeIndex = ref(-1)
const popupStyle = ref({})

const normalised = computed(() =>
  props.options.map((o) =>
    typeof o === 'object' && o !== null
      ? { value: o[props.valueKey], label: String(o[props.labelKey] ?? o[props.valueKey]) }
      : { value: o, label: String(o) },
  ),
)

const selected = computed(() => normalised.value.find((o) => o.value === props.modelValue) ?? null)
const searchable = computed(() => normalised.value.length > props.searchThreshold)

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return normalised.value
  return normalised.value.filter((o) => o.label.toLowerCase().includes(q))
})

function position() {
  const el = triggerEl.value
  if (!el) return

  const r = el.getBoundingClientRect()
  const spaceBelow = window.innerHeight - r.bottom
  const estimated = Math.min(320, filtered.value.length * 42 + (searchable.value ? 52 : 0) + 12)
  // Flip above the trigger when there is not enough room below for the list.
  const dropUp = spaceBelow < estimated && r.top > spaceBelow

  popupStyle.value = {
    position: 'fixed',
    left: `${r.left}px`,
    width: `${r.width}px`,
    ...(dropUp
      ? { bottom: `${window.innerHeight - r.top + 6}px` }
      : { top: `${r.bottom + 6}px` }),
  }
}

async function toggle() {
  if (props.disabled) return
  open.value = !open.value
  if (!open.value) return

  query.value = ''
  activeIndex.value = Math.max(0, filtered.value.findIndex((o) => o.value === props.modelValue))

  await nextTick()
  position()
  if (searchable.value) searchEl.value?.focus()
}

function close() {
  open.value = false
  query.value = ''
}

function choose(opt) {
  emit('update:modelValue', opt.value)
  emit('change', opt.value)
  close()
  triggerEl.value?.focus()
}

function move(step) {
  if (!filtered.value.length) return
  const next = activeIndex.value + step
  activeIndex.value = (next + filtered.value.length) % filtered.value.length
}

function onTriggerKey(e) {
  if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
    e.preventDefault()
    if (!open.value) toggle()
    else onListKey(e)
  }
}

function onListKey(e) {
  if (e.key === 'ArrowDown') { e.preventDefault(); move(1) }
  else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1) }
  else if (e.key === 'Home') { e.preventDefault(); activeIndex.value = 0 }
  else if (e.key === 'End') { e.preventDefault(); activeIndex.value = filtered.value.length - 1 }
  else if (e.key === 'Enter') {
    e.preventDefault()
    const opt = filtered.value[activeIndex.value]
    if (opt) choose(opt)
  } else if (e.key === 'Escape' || e.key === 'Tab') {
    close()
  }
}

function onDocumentPointerDown(e) {
  if (rootEl.value?.contains(e.target) || popupEl.value?.contains(e.target)) return
  close()
}

watch(open, (isOpen) => {
  const method = isOpen ? 'addEventListener' : 'removeEventListener'
  document[method]('pointerdown', onDocumentPointerDown, true)
  // `true` captures scrolls inside the offcanvas, not just on window.
  window[method]('scroll', position, true)
  window[method]('resize', position)
})

// Keep the list anchored while filtering changes its height.
watch(filtered, () => { if (open.value) nextTick(position) })

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocumentPointerDown, true)
  window.removeEventListener('scroll', position, true)
  window.removeEventListener('resize', position)
})
</script>

<style scoped>
.fl-select__trigger {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.5rem 0.85rem;
  min-height: 42px;
  background: #fff;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  font-size: 0.95rem;
  color: #2d3748;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.fl-select__trigger:hover:not(:disabled) {
  border-color: #b8b8f8;
}

.fl-select__trigger:focus-visible,
.fl-select--open .fl-select__trigger {
  outline: none;
  border-color: #6c5ce7;
  box-shadow: 0 0 0 3.5px rgba(108, 92, 231, 0.14);
}

.fl-select--disabled .fl-select__trigger {
  background: #f8f9fa;
  color: #adb5bd;
  cursor: not-allowed;
}

.fl-select__value {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fl-select__value--placeholder {
  color: #9aa4b2;
}

.fl-select__caret {
  font-size: 0.8rem;
  color: #9aa4b2;
  transition: transform 0.18s ease;
}

.fl-select--open .fl-select__caret {
  transform: rotate(180deg);
}
</style>

<style>
/* Unscoped: the popup is teleported to <body>, outside this component's tree. */
.fl-select__popup {
  z-index: 1090;
  background: #fff;
  border: 1px solid #eceff4;
  border-radius: 12px;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.12);
  overflow: hidden;
  animation: fl-select-in 0.12s ease-out;
}

@keyframes fl-select-in {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}

.fl-select__search {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 0.85rem;
  border-bottom: 1px solid #f1f3f9;
  color: #9aa4b2;
}

.fl-select__search input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 0.9rem;
  color: #2d3748;
  background: transparent;
}

.fl-select__list {
  list-style: none;
  margin: 0;
  padding: 0.3rem;
}

.fl-select__list--scroll {
  max-height: 260px;
  overflow-y: auto;
}

.fl-select__option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.55rem 0.7rem;
  border-radius: 8px;
  font-size: 0.92rem;
  color: #2d3748;
  cursor: pointer;
}

.fl-select__option--active {
  background: #f4f3ff;
}

.fl-select__option--selected {
  color: #6c5ce7;
  font-weight: 600;
}

.fl-select__option-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fl-select__tick {
  color: #6c5ce7;
  font-size: 0.95rem;
}

.fl-select__empty {
  padding: 0.85rem 0.7rem;
  text-align: center;
  font-size: 0.88rem;
  color: #9aa4b2;
}
</style>
