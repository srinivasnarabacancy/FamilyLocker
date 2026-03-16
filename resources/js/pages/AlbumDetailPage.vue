<template>
  <div>
    <div class="page-header">
      <div class="d-flex align-items-center gap-3">
        <button class="btn btn-icon btn-light" @click="goBack">
          <i class="bi bi-arrow-left" />
        </button>
        <div>
          <h4 class="page-title mb-0">{{ store.currentAlbum?.name ?? 'Album' }}</h4>
          <p class="page-subtitle mb-0">{{ store.currentAlbum?.photos?.length ?? 0 }} photos</p>
        </div>
      </div>
      <div class="d-flex gap-2">
        <label class="btn btn-primary" for="photoUpload">
          <i class="bi bi-cloud-upload me-2" />Upload Photos
          <input
            id="photoUpload"
            type="file"
            multiple
            accept="image/*"
            class="d-none"
            @change="handleUpload"
          />
        </label>
      </div>
    </div>

    <div v-if="uploading" class="alert alert-info d-flex align-items-center gap-2">
      <div class="spinner-border spinner-border-sm" />
      Uploading photos...
    </div>

    <ShimmerLoader v-if="loading" variant="photos" :count="9" />

    <div v-else-if="store.currentAlbum?.photos?.length" class="photo-grid">
      <div
        v-for="photo in store.currentAlbum.photos"
        :key="photo.id"
        class="photo-item"
      >
        <img :src="`/storage/${photo.file_path}`" :alt="photo.title" loading="lazy" @click="openLightbox(photo)" />
        <div class="photo-overlay">
          <button class="btn btn-icon btn-light btn-sm" @click.stop="openLightbox(photo)">
            <i class="bi bi-arrows-fullscreen" />
          </button>
          <button class="btn btn-icon btn-danger btn-sm" @click.stop="deletePhoto(photo)">
            <i class="bi bi-trash" />
          </button>
        </div>
      </div>
    </div>

    <div v-else class="fl-card">
      <div class="empty-state">
        <i class="bi bi-image empty-icon" />
        <h6 class="empty-title">No Photos Yet</h6>
        <p class="empty-subtitle">Upload your first photos to this album.</p>
        <label class="btn btn-primary" for="photoUpload2">
          <i class="bi bi-cloud-upload me-2" />Upload Photos
          <input id="photoUpload2" type="file" multiple accept="image/*" class="d-none" @change="handleUpload" />
        </label>
      </div>
    </div>

    <!-- Lightbox -->
    <div
      v-if="lightboxPhoto"
      class="position-fixed inset-0 bg-black bg-opacity-90 d-flex align-items-center justify-content-center"
      style="inset:0;z-index:9999"
      @click.self="lightboxPhoto = null"
    >
      <button
        class="btn btn-icon btn-light position-absolute top-0 end-0 m-3"
        @click="lightboxPhoto = null"
      >
        <i class="bi bi-x-lg" />
      </button>
      <img
        :src="`/storage/${lightboxPhoto.file_path}`"
        class="img-fluid"
        style="max-height:90vh;max-width:90vw;border-radius:8px"
        :alt="lightboxPhoto.title"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { router } from '@inertiajs/vue3'
import { useAlbumStore } from '@/stores/albums'
import { useToast } from '@/composables/useToast'
import ShimmerLoader from '@/components/ShimmerLoader.vue'

const props = defineProps({
  albumId: {
    type: [Number, String],
    required: true,
  },
})

const store = useAlbumStore()
const { showToast } = useToast()

const loading = ref(false)
const uploading = ref(false)
const lightboxPhoto = ref(null)

function openLightbox(photo) {
  lightboxPhoto.value = photo
}

function goBack() {
  if (window.history.length > 1) {
    window.history.back()
    return
  }

  router.visit('/app/albums')
}

async function handleUpload(e) {
  const files = Array.from(e.target.files)
  if (!files.length) return
  uploading.value = true
  const fd = new FormData()
  files.forEach((f) => fd.append('photos[]', f))
  try {
    await store.uploadPhotos(props.albumId, fd)
    showToast(`${files.length} photo(s) uploaded!`, 'success')
    await store.fetchAlbum(props.albumId)
  } catch {
    showToast('Upload failed', 'danger')
  } finally {
    uploading.value = false
    e.target.value = ''
  }
}

async function deletePhoto(photo) {
  if (!confirm('Delete this photo?')) return
  try {
    await store.deletePhoto(photo.id)
    showToast('Photo deleted', 'success')
  } catch {
    showToast('Failed to delete', 'danger')
  }
}

onMounted(async () => {
  loading.value = true
  try {
    await store.fetchAlbum(props.albumId)
  } finally {
    loading.value = false
  }
})
</script>
