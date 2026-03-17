import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/services/api'

export const useReminderStore = defineStore('reminders', () => {
  const reminders = ref([])
  const loading = ref(false)

  async function fetchReminders(params = {}) {
    loading.value = true
    try {
      const { data } = await api.get('/reminders', { params })
      reminders.value = data.data
    } finally {
      loading.value = false
    }
  }

  async function createReminder(payload) {
    const { data } = await api.post('/reminders', payload)
    return data
  }

  async function updateReminder(id, payload) {
    const { data } = await api.put(`/reminders/${id}`, payload)
    return data
  }

  async function deleteReminder(id) {
    const { data } = await api.delete(`/reminders/${id}`)
    reminders.value = reminders.value.filter((r) => r.id !== id)
    return data
  }

  return {
    reminders,
    loading,
    fetchReminders,
    createReminder,
    updateReminder,
    deleteReminder,
  }
})
