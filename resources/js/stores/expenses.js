import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/services/api'

export const useExpenseStore = defineStore('expenses', () => {
  const expenses = ref([])
  const categories = ref([])
  const summary = ref(null)
  const loading = ref(false)

  async function fetchExpenses(params = {}) {
    loading.value = true
    try {
      const { data } = await api.get('/expenses', { params })
      expenses.value = data.data.data
    } finally {
      loading.value = false
    }
  }

  async function fetchCategories() {
    const { data } = await api.get('/expenses/categories')
    categories.value = data.data
  }

  async function fetchSummary(month) {
    const { data } = await api.get('/expenses/summary', { params: { month } })
    summary.value = data.data
    return data.data
  }

  async function createExpense(payload) {
    const { data } = await api.post('/expenses', payload)
    return data
  }

  async function updateExpense(id, payload) {
    const { data } = await api.put(`/expenses/${id}`, payload)
    return data
  }

  async function deleteExpense(id) {
    const { data } = await api.delete(`/expenses/${id}`)
    return data
  }

  async function createCategory(payload) {
    const { data } = await api.post('/expenses/categories', payload)
    categories.value.push(data.data)
    return data
  }

  async function deleteCategory(id) {
    const { data } = await api.delete(`/expenses/categories/${id}`)
    categories.value = categories.value.filter((c) => c.id !== id)
    return data
  }

  return {
    expenses,
    categories,
    summary,
    loading,
    fetchExpenses,
    fetchCategories,
    fetchSummary,
    createExpense,
    updateExpense,
    deleteExpense,
    createCategory,
    deleteCategory,
  }
})
