import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/services/api'

export const useAlbumStore = defineStore('albums', () => {
  const albums = ref([])
  const currentAlbum = ref(null)
  const loading = ref(false)

  async function fetchAlbums() {
    loading.value = true
    try {
      const { data } = await api.get('/albums')
      albums.value = data.data.data
    } finally {
      loading.value = false
    }
  }

  async function fetchAlbum(id) {
    const { data } = await api.get(`/albums/${id}`)
    currentAlbum.value = data.data
    return data.data
  }

  async function createAlbum(payload) {
    const { data } = await api.post('/albums', payload)
    albums.value.unshift(data.data)
    return data
  }

  async function updateAlbum(id, payload) {
    const { data } = await api.put(`/albums/${id}`, payload)
    return data
  }

  async function deleteAlbum(id) {
    const { data } = await api.delete(`/albums/${id}`)
    albums.value = albums.value.filter((a) => a.id !== id)
    return data
  }

  async function uploadPhotos(albumId, formData) {
    const { data } = await api.post(`/albums/${albumId}/photos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  }

  async function deletePhoto(photoId) {
    const { data } = await api.delete(`/albums/photos/${photoId}`)
    if (currentAlbum.value) {
      currentAlbum.value.photos = currentAlbum.value.photos.filter((p) => p.id !== photoId)
    }
    return data
  }

  return {
    albums,
    currentAlbum,
    loading,
    fetchAlbums,
    fetchAlbum,
    createAlbum,
    updateAlbum,
    deleteAlbum,
    uploadPhotos,
    deletePhoto,
  }
})
