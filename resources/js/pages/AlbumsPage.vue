<template>
  <div>
    <div class="page-header">
      <div>
        <h4 class="page-title">Albums</h4>
        <p class="page-subtitle">Family photo collections</p>
      </div>
      <button class="btn btn-primary" @click="openModal()">
        <i class="bi bi-plus-lg me-2" />New Album
      </button>
    </div>

    <ShimmerLoader v-if="store.loading" variant="cards" col-class="col-12 col-sm-6 col-md-4 col-xl-3" :count="8" />

    <div v-else-if="store.albums.length" class="row g-3">
      <div
        v-for="album in store.albums"
        :key="album.id"
        class="col-12 col-sm-6 col-md-4 col-xl-3"
      >
        <div class="fl-card overflow-hidden" style="cursor:pointer">
          <!-- Cover Photo -->
          <div
            class="position-relative"
            style="aspect-ratio:4/3;background:#f4f6fc"
            @click="goToAlbum(album)"
          >
            <img
              v-if="album.cover_photo"
              :src="`/storage/${album.cover_photo}`"
              class="w-100 h-100"
              style="object-fit:cover"
              :alt="album.name"
            />
            <div v-else class="w-100 h-100 d-flex align-items-center justify-content-center">
              <i class="bi bi-images text-muted" style="font-size:3rem" />
            </div>
            <div class="position-absolute top-0 end-0 p-2">
              <div class="dropdown" @click.stop>
                <button class="btn btn-sm btn-light rounded-circle btn-icon" data-bs-toggle="dropdown">
                  <i class="bi bi-three-dots-vertical" />
                </button>
                <ul class="dropdown-menu dropdown-menu-end">
                  <li><a class="dropdown-item" href="#" @click.prevent="goToAlbum(album)"><i class="bi bi-images me-2" />Open Album</a></li>
                  <li><a class="dropdown-item" href="#" @click.prevent="openModal(album)"><i class="bi bi-pencil me-2" />Edit</a></li>
                  <li><a class="dropdown-item text-danger" href="#" @click.prevent="deleteAlbum(album)"><i class="bi bi-trash me-2" />Delete</a></li>
                </ul>
              </div>
            </div>
          </div>
          <!-- Info -->
          <div class="p-3" @click="goToAlbum(album)">
            <h6 class="fw-bold mb-1">{{ album.name }}</h6>
            <div class="d-flex align-items-center justify-content-between">
              <span class="text-muted small">{{ album.photos_count ?? 0 }} photos</span>
              <span class="text-muted small">{{ formatDate(album.created_at) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="fl-card">
      <div class="empty-state">
        <i class="bi bi-images empty-icon" />
        <h6 class="empty-title">No Albums Yet</h6>
        <p class="empty-subtitle">Create your first family photo album!</p>
        <button class="btn btn-primary" @click="openModal()">
          <i class="bi bi-plus-lg me-2" />Create Album
        </button>
      </div>
    </div>

    <!-- Create/Edit Album Modal -->
    <div class="modal fade" id="albumModal" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ editing ? 'Edit' : 'Create' }} Album</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" />
          </div>
          <div class="modal-body">
            <form id="albumForm" @submit.prevent="handleSubmit">
              <div class="mb-3">
                <label class="form-label">Album Name *</label>
                <input v-model="form.name" type="text" class="form-control" required placeholder="e.g. Summer Vacation 2024" />
              </div>
              <div class="mb-3">
                <label class="form-label">Description</label>
                <textarea v-model="form.description" rows="2" class="form-control" />
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-light" data-bs-dismiss="modal">Cancel</button>
            <button type="submit" form="albumForm" class="btn btn-primary" :disabled="formLoading">
              <span v-if="formLoading" class="spinner-border spinner-border-sm me-2" />
              {{ editing ? 'Update' : 'Create' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import { router } from '@inertiajs/vue3'
import { Modal } from 'bootstrap'
import { useAlbumStore } from '@/stores/albums'
import { useToast } from '@/composables/useToast'
import ShimmerLoader from '@/components/ShimmerLoader.vue'

const store = useAlbumStore()
const { showToast } = useToast()
let modalInstance = null

const form = reactive({ name: '', description: '' })
const editing = ref(null)
const formLoading = ref(false)

function formatDate(d) {
  return d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''
}

function goToAlbum(album) {
  router.visit(`/app/albums/${album.id}`)
}

function openModal(album = null) {
  editing.value = album
  if (album) {
    Object.assign(form, { name: album.name, description: album.description ?? '' })
  } else {
    Object.assign(form, { name: '', description: '' })
  }
  modalInstance?.show()
}

async function handleSubmit() {
  formLoading.value = true
  try {
    if (editing.value) {
      await store.updateAlbum(editing.value.id, form)
      showToast('Album updated!', 'success')
    } else {
      await store.createAlbum(form)
      showToast('Album created!', 'success')
    }
    modalInstance?.hide()
    store.fetchAlbums()
  } catch {
    showToast('Error occurred', 'danger')
  } finally {
    formLoading.value = false
  }
}

async function deleteAlbum(album) {
  if (!confirm(`Delete album "${album.name}"? All photos will be deleted.`)) return
  await store.deleteAlbum(album.id)
  showToast('Album deleted', 'success')
}

onMounted(() => {
  store.fetchAlbums()
  modalInstance = new Modal(document.getElementById('albumModal'))
})
</script>
