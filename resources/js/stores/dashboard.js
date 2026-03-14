import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/services/api'

export const useDashboardStore = defineStore('dashboard', () => {
  const data = ref(null)
  const loading = ref(false)

  async function fetchDashboard() {
    loading.value = true
    try {
      const { data: res } = await api.get('/dashboard')
      data.value = res.data
    } finally {
      loading.value = false
    }
  }

  return { data, loading, fetchDashboard }
})
