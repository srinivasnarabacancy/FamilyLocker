<template />

<script setup>
import { usePage } from '@inertiajs/vue3'
import { watch } from 'vue'

const page = usePage()

function syncCsrfToken(token) {
  const metaTag = document.head.querySelector('meta[name="csrf-token"]')

  if (metaTag) {
    metaTag.setAttribute('content', token ?? '')
  }
}

watch(
  () => page.props.csrf_token,
  (token) => {
    syncCsrfToken(token)
  },
  { immediate: true }
)
</script>
