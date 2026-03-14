import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/services/api'

export const useDocumentStore = defineStore('documents', () => {
  const documents = ref([])
  const pagination = ref(null)
  const loading = ref(false)
  const expiringDocs = ref([])

  async function fetchDocuments(params = {}) {
    loading.value = true
    try {
      const { data } = await api.get('/documents', { params })
      documents.value = data.data.data
      pagination.value = data.data
    } finally {
      loading.value = false
    }
  }

  async function fetchExpiring(days = 30) {
    const { data } = await api.get('/documents/expiring', { params: { days } })
    expiringDocs.value = data.data
    return data.data
  }

  async function createDocument(formData) {
    const { data } = await api.post('/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  }

  async function updateDocument(id, formData) {
    const { data } = await api.post(`/documents/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  }

  async function deleteDocument(id) {
    const { data } = await api.delete(`/documents/${id}`)
    return data
  }

  return {
    documents,
    pagination,
    loading,
    expiringDocs,
    fetchDocuments,
    fetchExpiring,
    createDocument,
    updateDocument,
    deleteDocument,
  }
})
