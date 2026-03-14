import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/services/api'

export const useBillStore = defineStore('bills', () => {
  const bills = ref([])
  const loading = ref(false)

  async function fetchBills(params = {}) {
    loading.value = true
    try {
      const { data } = await api.get('/bills', { params })
      bills.value = data.data.data
    } finally {
      loading.value = false
    }
  }

  async function createBill(payload) {
    const { data } = await api.post('/bills', payload)
    return data
  }

  async function updateBill(id, payload) {
    const { data } = await api.put(`/bills/${id}`, payload)
    return data
  }

  async function markPaid(id, paidDate = null) {
    const { data } = await api.post(`/bills/${id}/mark-paid`, { paid_date: paidDate })
    return data
  }

  async function deleteBill(id) {
    const { data } = await api.delete(`/bills/${id}`)
    bills.value = bills.value.filter((b) => b.id !== id)
    return data
  }

  return {
    bills,
    loading,
    fetchBills,
    createBill,
    updateBill,
    markPaid,
    deleteBill,
  }
})
