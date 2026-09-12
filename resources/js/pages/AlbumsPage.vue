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
          </div>
          <!-- Info -->
          <div class="p-3">
            <div class="d-flex align-items-start justify-content-between gap-2 mb-1">
              <h6 class="fw-bold mb-0 text-truncate" @click="goToAlbum(album)">{{ album.name }}</h6>
              <div class="d-flex align-items-center gap-1 flex-shrink-0">
                <!-- Rename. .stop keeps the click off the card, which navigates. -->
                <button
                  type="button"
                  class="btn btn-sm btn-link p-0 text-muted album-action"
                  title="Rename album"
                  aria-label="Rename album"
                  @click.stop="openModal(album)"
                >
                  <i class="bi bi-pencil" />
                </button>
                <button
                  type="button"
                  class="btn btn-sm btn-link p-0 text-danger album-action"
                  title="Delete album"
                  aria-label="Delete album"
                  @click.stop="deleteAlbum(album)"
                >
                  <i class="bi bi-trash" />
                </button>
              </div>
            </div>
            <div class="d-flex align-items-center justify-content-between" @click="goToAlbum(album)">
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
            <h5 class="modal-title">{{ editing ? 'Rename' : 'Create' }} Album</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" />
          </div>
          <div class="modal-body">
            <form id="albumForm" novalidate @submit.prevent="handleSubmit">
              <FormField label="Album Name" required :error="errors.name" field="name" class="mb-3">
                <template #default="{ id }">
                  <input :id="id" v-model="form.name" type="text" class="form-control" placeholder="e.g. Summer Vacation 2024" />
                </template>
              </FormField>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-light" data-bs-dismiss="modal">Cancel</button>
            <button type="submit" form="albumForm" class="btn btn-primary" :disabled="formLoading">
              <span v-if="formLoading" class="spinner-border spinner-border-sm me-2" />
              {{ editing ? 'Save' : 'Create' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

    <!-- Shared confirmation modal — see components/ConfirmModal.vue -->
    <ConfirmModal
      v-model="showDeleteModal"
      :title="`Delete ${albumToDelete?.name}?`"
      message="Every photo in this album will be permanently deleted and cannot be recovered."
      confirm-text="Delete"
      cancel-text="Cancel"
      icon="bi bi-trash"
      variant="danger"
      :loading="deleting"
      @confirm="handleConfirmDelete"
    />
</template>

<script setup>
import { reactive, ref, onMounted, provide} from 'vue'
import { useRouter } from 'vue-router'
import { Modal } from 'bootstrap'
import { useAlbumStore } from '@/stores/albums'
import { useToast } from '@/composables/useToast'
import ShimmerLoader from '@/components/ShimmerLoader.vue'
import ConfirmModal from '@/components/ConfirmModal.vue'
import FormField from '@/components/FormField.vue'
import { useFormErrors } from '@/composables/useFormErrors'

const router = useRouter()
const store = useAlbumStore()
const { showToast } = useToast()
const { errors, clear: clearErrors, capture: captureErrors, clearField } = useFormErrors()
// FormField clears its own message as the user edits.
provide('clearFormField', clearField)
let modalInstance = null

const form = reactive({ name: '' })
const editing = ref(null)
const formLoading = ref(false)

function formatDate(d) {
  return d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''
}

function goToAlbum(album) {
  router.push({ name: 'album-detail', params: { id: album.id } })
}

function openModal(album = null) {
  clearErrors()
  editing.value = album
  if (album) {
    Object.assign(form, { name: album.name })
  } else {
    Object.assign(form, { name: '' })
  }
  modalInstance?.show()
}

async function handleSubmit() {
  clearErrors()
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
  } catch (err) {
    // 422 means per-field messages; anything else is a real failure.
    if (!captureErrors(err)) showToast('Error occurred', 'danger')
  } finally {
    formLoading.value = false
  }
}

const showDeleteModal = ref(false)
const albumToDelete = ref(null)
const deleting = ref(false)

async function deleteAlbum(album) {
  albumToDelete.value = album
  showDeleteModal.value = true
}

async function handleConfirmDelete() {
  if (!albumToDelete.value) return

  deleting.value = true
  try {
    await store.deleteAlbum(target.value.id)
    showToast('Album deleted', 'success')
    showDeleteModal.value = false
  } catch {
    showToast('Failed to delete', 'danger')
  } finally {
    deleting.value = false
  }
}

onMounted(() => {
  store.fetchAlbums()
  modalInstance = new Modal(document.getElementById('albumModal'))
})
</script>

<style scoped>
.album-action {
  line-height: 1;
  text-decoration: none;
  padding: 0.15rem 0.3rem !important;
  border-radius: 6px;
  transition: background 0.15s ease, color 0.15s ease;
}

.album-action:hover {
  background: rgba(108, 92, 231, 0.1);
}

.album-action.text-danger:hover {
  background: rgba(220, 53, 69, 0.1);
}
</style>
