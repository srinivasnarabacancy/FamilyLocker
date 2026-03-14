<template>
  <div>
    <div class="page-header">
      <div>
        <h4 class="page-title">Documents</h4>
        <p class="page-subtitle">Store and manage family identity documents</p>
      </div>
      <button class="btn btn-primary" @click="openModal()">
        <i class="bi bi-plus-lg me-2" />Add Document
      </button>
    </div>

    <!-- Filters -->
    <div class="fl-card p-3 mb-4">
      <div class="row g-2">
        <div class="col-12 col-sm-6 col-md-4">
          <input
            v-model="filters.search"
            type="text"
            class="form-control"
            placeholder="Search documents..."
            @input="debouncedFetch"
          />
        </div>
        <div class="col-6 col-sm-3 col-md-2">
          <select v-model="filters.type" class="form-select" @change="fetchDocs">
            <option value="">All Types</option>
            <option v-for="t in docTypes" :key="t.value" :value="t.value">{{ t.label }}</option>
          </select>
        </div>
        <div class="col-6 col-sm-3 col-md-2">
          <button class="btn btn-outline-secondary w-100" @click="resetFilters">
            <i class="bi bi-x-circle me-2" />Clear
          </button>
        </div>
      </div>
    </div>

    <!-- Documents Grid -->
    <div v-if="store.loading" class="page-loader">
      <div class="spinner-border" />
    </div>

    <div v-else-if="store.documents.length" class="row g-3">
      <div
        v-for="doc in store.documents"
        :key="doc.id"
        class="col-12 col-sm-6 col-lg-4 col-xl-3"
      >
        <div class="fl-card p-3 h-100">
          <div class="d-flex align-items-start justify-content-between mb-2">
            <span class="badge rounded-pill" :style="`background:${docTypeColor(doc.type)}20;color:${docTypeColor(doc.type)}`">
              {{ docTypeLabel(doc.type) }}
            </span>
            <div class="dropdown">
              <button class="btn btn-icon btn-light btn-sm" data-bs-toggle="dropdown">
                <i class="bi bi-three-dots-vertical" />
              </button>
              <ul class="dropdown-menu dropdown-menu-end shadow-sm">
                <li>
                  <a class="dropdown-item" href="#" @click.prevent="openModal(doc)">
                    <i class="bi bi-pencil me-2" />Edit
                  </a>
                </li>
                <li v-if="doc.file_path">
                  <a class="dropdown-item" :href="`/storage/${doc.file_path}`" target="_blank">
                    <i class="bi bi-eye me-2" />View File
                  </a>
                </li>
                <li>
                  <a class="dropdown-item text-danger" href="#" @click.prevent="confirmDelete(doc)">
                    <i class="bi bi-trash me-2" />Delete
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <h6 class="fw-bold mb-1">{{ doc.title }}</h6>
          <p class="text-muted small mb-2">{{ doc.member_name }}</p>
          <div v-if="doc.document_number" class="small mb-1">
            <i class="bi bi-hash text-muted me-1" />{{ doc.document_number }}
          </div>
          <div v-if="doc.expiry_date" class="small" :class="expiryClass(doc.expiry_date)">
            <i class="bi bi-calendar-x me-1" />Expires: {{ formatDate(doc.expiry_date) }}
          </div>
          <div v-if="doc.file_path" class="mt-2">
            <span class="badge bg-light text-dark">
              <i class="bi bi-paperclip me-1" />{{ doc.file_name || 'Attached' }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="fl-card">
      <div class="empty-state">
        <i class="bi bi-file-earmark-lock empty-icon" />
        <h6 class="empty-title">No Documents Yet</h6>
        <p class="empty-subtitle">Start by adding family ID documents like Aadhaar, PAN, Passport, etc.</p>
        <button class="btn btn-primary" @click="openModal()">
          <i class="bi bi-plus-lg me-2" />Add First Document
        </button>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <div class="modal fade" id="documentModal" tabindex="-1">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ editingDoc ? 'Edit' : 'Add' }} Document</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" />
          </div>
          <div class="modal-body">
            <form id="docForm" @submit.prevent="handleSubmit">
              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label">Document Title *</label>
                  <input v-model="form.title" type="text" class="form-control" :class="{ 'is-invalid': errors.title }" required />
                  <div v-if="errors.title" class="invalid-feedback">{{ errors.title[0] }}</div>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Document Type *</label>
                  <select v-model="form.type" class="form-select" :class="{ 'is-invalid': errors.type }" required>
                    <option value="">Select type</option>
                    <option v-for="t in docTypes" :key="t.value" :value="t.value">{{ t.label }}</option>
                  </select>
                  <div v-if="errors.type" class="invalid-feedback">{{ errors.type[0] }}</div>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Member Name *</label>
                  <input v-model="form.member_name" type="text" class="form-control" required />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Document Number</label>
                  <input v-model="form.document_number" type="text" class="form-control" />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Issue Date</label>
                  <input v-model="form.issue_date" type="date" class="form-control" />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Expiry Date</label>
                  <input v-model="form.expiry_date" type="date" class="form-control" />
                </div>
                <div class="col-12">
                  <label class="form-label">Upload File (PDF/Image, max 10MB)</label>
                  <input ref="fileInput" type="file" class="form-control" accept=".pdf,.jpg,.jpeg,.png" @change="onFileChange" />
                </div>
                <div class="col-12">
                  <label class="form-label">Notes</label>
                  <textarea v-model="form.notes" rows="2" class="form-control" />
                </div>
                <div class="col-md-6 d-flex align-items-center gap-3">
                  <div class="form-check form-switch">
                    <input v-model="form.is_reminder_enabled" class="form-check-input" type="checkbox" id="reminderToggle" />
                    <label class="form-check-label fw-semibold" for="reminderToggle">Enable Expiry Reminder</label>
                  </div>
                </div>
                <div v-if="form.is_reminder_enabled" class="col-md-6">
                  <label class="form-label">Remind {{ form.reminder_days_before }} days before</label>
                  <input v-model.number="form.reminder_days_before" type="range" class="form-range" min="7" max="90" step="7" />
                </div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-light" data-bs-dismiss="modal">Cancel</button>
            <button type="submit" form="docForm" class="btn btn-primary" :disabled="formLoading">
              <span v-if="formLoading" class="spinner-border spinner-border-sm me-2" />
              {{ editingDoc ? 'Update' : 'Add' }} Document
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import { Modal } from 'bootstrap'
import { useDocumentStore } from '@/stores/documents'
import { useToast } from '@/composables/useToast'

const store = useDocumentStore()
const { showToast } = useToast()
let modalInstance = null

const filters = reactive({ search: '', type: '' })
const form = reactive({
  title: '', type: '', member_name: '', document_number: '',
  issue_date: '', expiry_date: '', notes: '',
  is_reminder_enabled: true, reminder_days_before: 30,
})
const editingDoc = ref(null)
const errors = ref({})
const formLoading = ref(false)
const selectedFile = ref(null)
const fileInput = ref(null)

const docTypes = [
  { value: 'aadhaar', label: 'Aadhaar Card' },
  { value: 'pan', label: 'PAN Card' },
  { value: 'passport', label: 'Passport' },
  { value: 'driving_license', label: 'Driving License' },
  { value: 'birth_certificate', label: 'Birth Certificate' },
  { value: 'voter_id', label: 'Voter ID' },
  { value: 'other', label: 'Other' },
]

const docTypeColors = {
  aadhaar: '#6C5CE7', pan: '#00b894', passport: '#0984e3',
  driving_license: '#fdcb6e', birth_certificate: '#fd79a8',
  voter_id: '#e17055', other: '#636e72',
}

function docTypeLabel(type) {
  return docTypes.find((t) => t.value === type)?.label ?? type
}

function docTypeColor(type) {
  return docTypeColors[type] ?? '#6C5CE7'
}

function expiryClass(date) {
  const days = Math.ceil((new Date(date) - new Date()) / 86400000)
  if (days < 0) return 'text-danger'
  if (days <= 30) return 'text-warning'
  return 'text-muted'
}

function formatDate(d) {
  return d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'
}

function onFileChange(e) {
  selectedFile.value = e.target.files[0] ?? null
}

let searchTimer = null
function debouncedFetch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(fetchDocs, 400)
}

async function fetchDocs() {
  await store.fetchDocuments({ ...filters })
}

function resetFilters() {
  filters.search = ''
  filters.type = ''
  fetchDocs()
}

function openModal(doc = null) {
  editingDoc.value = doc
  errors.value = {}
  if (doc) {
    Object.assign(form, {
      title: doc.title, type: doc.type, member_name: doc.member_name,
      document_number: doc.document_number ?? '', issue_date: doc.issue_date?.substring(0, 10) ?? '',
      expiry_date: doc.expiry_date?.substring(0, 10) ?? '', notes: doc.notes ?? '',
      is_reminder_enabled: doc.is_reminder_enabled, reminder_days_before: doc.reminder_days_before,
    })
  } else {
    Object.assign(form, {
      title: '', type: '', member_name: '', document_number: '',
      issue_date: '', expiry_date: '', notes: '',
      is_reminder_enabled: true, reminder_days_before: 30,
    })
  }
  selectedFile.value = null
  if (fileInput.value) fileInput.value.value = ''
  modalInstance?.show()
}

async function handleSubmit() {
  errors.value = {}
  formLoading.value = true
  const fd = new FormData()
  Object.entries(form).forEach(([k, v]) => { if (v !== null && v !== '') fd.append(k, v) })
  if (selectedFile.value) fd.append('file', selectedFile.value)
  try {
    if (editingDoc.value) {
      await store.updateDocument(editingDoc.value.id, fd)
      showToast('Document updated!', 'success')
    } else {
      await store.createDocument(fd)
      showToast('Document added!', 'success')
    }
    modalInstance?.hide()
    fetchDocs()
  } catch (err) {
    if (err.response?.status === 422) errors.value = err.response.data.errors ?? {}
    else showToast(err.response?.data?.message ?? 'Error occurred', 'danger')
  } finally {
    formLoading.value = false
  }
}

async function confirmDelete(doc) {
  if (!confirm(`Delete document "${doc.title}"?`)) return
  try {
    await store.deleteDocument(doc.id)
    showToast('Document deleted', 'success')
    fetchDocs()
  } catch {
    showToast('Failed to delete', 'danger')
  }
}

onMounted(() => {
  fetchDocs()
  modalInstance = new Modal(document.getElementById('documentModal'))
})
</script>
