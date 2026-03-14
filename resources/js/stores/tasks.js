import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/services/api'

export const useTaskStore = defineStore('tasks', () => {
  const tasks = ref([])
  const loading = ref(false)

  async function fetchTasks(params = {}) {
    loading.value = true
    try {
      const { data } = await api.get('/tasks', { params })
      tasks.value = data.data.data
    } finally {
      loading.value = false
    }
  }

  async function createTask(payload) {
    const { data } = await api.post('/tasks', payload)
    return data
  }

  async function updateTask(id, payload) {
    const { data } = await api.put(`/tasks/${id}`, payload)
    return data
  }

  async function updateStatus(id, status) {
    const { data } = await api.patch(`/tasks/${id}/status`, { status })
    const index = tasks.value.findIndex((t) => t.id === id)
    if (index !== -1) tasks.value[index] = data.data
    return data
  }

  async function deleteTask(id) {
    const { data } = await api.delete(`/tasks/${id}`)
    tasks.value = tasks.value.filter((t) => t.id !== id)
    return data
  }

  return {
    tasks,
    loading,
    fetchTasks,
    createTask,
    updateTask,
    updateStatus,
    deleteTask,
  }
})
