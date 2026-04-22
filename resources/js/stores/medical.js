import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/services/api'

export const useMedicalStore = defineStore('medical', () => {
  const records = ref([])
  const medicines = ref([])
  const appointments = ref([])
  const loading = ref(false)

  async function fetchRecords(params = {}) {
    loading.value = true
    try {
      const { data } = await api.get('/medical/records', { params })
      records.value = data.data.data
    } finally {
      loading.value = false
    }
  }

  async function fetchMedicines(params = {}) {
    const { data } = await api.get('/medical/medicines', { params })
    medicines.value = data.data
  }

  async function fetchAppointments(params = {}) {
    const { data } = await api.get('/medical/appointments', { params })
    appointments.value = data.data.data
  }

  async function createRecord(formData) {
    const { data } = await api.post('/medical/records', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  }

  async function updateRecord(id, formData) {
    const { data } = await api.post(`/medical/records/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  }

  async function deleteRecord(id) {
    const { data } = await api.delete(`/medical/records/${id}`)
    return data
  }

  async function createMedicine(formData) {
    const { data } = await api.post('/medical/medicines', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  }

  async function updateMedicine(id, formData) {
    const { data } = await api.post(`/medical/medicines/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  }

  async function deleteMedicine(id) {
    const { data } = await api.delete(`/medical/medicines/${id}`)
    return data
  }

  async function createAppointment(payload) {
    const { data } = await api.post('/medical/appointments', payload)
    return data
  }

  async function updateAppointment(id, payload) {
    const { data } = await api.put(`/medical/appointments/${id}`, payload)
    return data
  }

  async function deleteAppointment(id) {
    const { data } = await api.delete(`/medical/appointments/${id}`)
    return data
  }

  return {
    records,
    medicines,
    appointments,
    loading,
    fetchRecords,
    fetchMedicines,
    fetchAppointments,
    createRecord,
    updateRecord,
    deleteRecord,
    createMedicine,
    updateMedicine,
    deleteMedicine,
    createAppointment,
    updateAppointment,
    deleteAppointment,
  }
})
