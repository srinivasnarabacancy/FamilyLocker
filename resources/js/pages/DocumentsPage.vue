<template>
  <div>
    <!-- Page Header -->
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
      <div class="d-flex flex-wrap gap-2 align-items-center">
        <!-- Search -->
        <div class="doc-search-wrap flex-grow-1">
          <i class="bi bi-search doc-search-icon" />
          <input
            v-model="filters.search"
            type="text"
            class="form-control doc-search-input"
            placeholder="Search by title, member or doc number..."
            @input="debouncedFetch"
          />
        </div>
        <!-- Type pill tabs -->
        <div class="doc-filter-pills">
          <button
            class="doc-filter-pill"
            :class="{ active: filters.type === '' }"
            @click="setType('')"
          >All</button>
          <button
            v-for="t in docTypes"
            :key="t.value"
            class="doc-filter-pill"
            :class="{ active: filters.type === t.value }"
            :style="filters.type === t.value ? `background:${docTypeColor(t.value)};border-color:${docTypeColor(t.value)};color:#fff` : ''"
            @click="setType(t.value)"
          >{{ t.shortLabel }}</button>
        </div>
      </div>
    </div>

    <!-- Documents Grid -->
    <ShimmerLoader v-if="store.loading" variant="cards" col-class="col-12 col-sm-6 col-lg-4 col-xl-3" :count="8" />

    <div v-else-if="store.documents.length" class="row g-3">
      <div
        v-for="doc in store.documents"
        :key="doc.id"
        class="col-12 col-sm-6 col-lg-4 col-xl-3"
      >
        <div class="doc-card" @click="openDetail(doc)">
          <!-- Coloured top stripe -->
          <div class="doc-card__stripe" :style="`background:${docTypeColor(doc.type)}`" />

          <!-- Header row -->
          <div class="doc-card__head">
            <div class="doc-card__type-icon" :style="`background:${docTypeColor(doc.type)}18;color:${docTypeColor(doc.type)}`">
              <i :class="docTypeIcon(doc.type)" />
            </div>
            <div class="doc-menu" @click.stop>
              <button class="btn btn-icon btn-light btn-sm" @click="toggleMenu(doc.id)">
                <i class="bi bi-three-dots-vertical" />
              </button>
              <div v-if="openMenuId === doc.id" class="doc-menu__dropdown">
                <button class="doc-menu__item" @click="openModal(doc); openMenuId = null">
                  <i class="bi bi-pencil me-2" />Edit
                </button>
                <a v-if="doc.file_path" class="doc-menu__item" :href="`/storage/${doc.file_path}`" target="_blank" @click="openMenuId = null">
                  <i class="bi bi-eye me-2" />View File
                </a>
                <button class="doc-menu__item text-danger" @click="confirmDelete(doc); openMenuId = null">
                  <i class="bi bi-trash me-2" />Delete
                </button>
              </div>
            </div>
          </div>

          <!-- Body -->
          <div class="doc-card__body">
            <div class="doc-card__badge" :style="`background:${docTypeColor(doc.type)}15;color:${docTypeColor(doc.type)}`">
              {{ docTypeLabel(doc.type) }}
            </div>
            <h6 class="doc-card__title">{{ doc.title }}</h6>
            <p class="doc-card__member"><i class="bi bi-person me-1" />{{ doc.member_name }}</p>
            <div v-if="doc.document_number" class="doc-card__number">
              <i class="bi bi-upc me-1" />{{ doc.document_number }}
            </div>

            <!-- Expiry and attachment live in the body rather than a footer
                 strip: most types cannot expire and many have no file, which
                 left the strip empty or near-empty on most cards. -->
            <div v-if="doc.expiry_date || doc.file_path" class="doc-card__meta">
              <span v-if="doc.expiry_date" class="doc-card__expiry" :class="expiryClass(doc.expiry_date)">
                <i class="bi bi-calendar-event me-1" />{{ formatDate(doc.expiry_date) }}
              </span>
              <i v-if="doc.file_path" class="bi bi-paperclip doc-card__attachment" title="Has attachment" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="fl-card">
      <!-- A search or type filter that matched nothing is not an empty locker:
           offering "Add First Document" there is wrong, since documents exist —
           they are just filtered out. -->
      <div v-if="isFiltered" class="empty-state">
        <i class="bi bi-search empty-icon" />
        <h6 class="empty-title">{{ noMatchTitle }}</h6>
        <p class="empty-subtitle">{{ noMatchHint }}</p>
        <button class="btn btn-outline-primary" @click="resetFilters">
          <i class="bi bi-x-lg me-2" />Clear {{ filters.search ? 'Search' : 'Filter' }}
        </button>
      </div>

      <div v-else class="empty-state">
        <i class="bi bi-file-earmark-lock empty-icon" />
        <h6 class="empty-title">No Documents Yet</h6>
        <p class="empty-subtitle">Start by adding family ID documents like Aadhaar, PAN, Passport, etc.</p>
        <button class="btn btn-primary" @click="openModal()">
          <i class="bi bi-plus-lg me-2" />Add First Document
        </button>
      </div>
    </div>

    <!-- Document Detail Offcanvas -->
    <AppOffcanvas
      v-model="showDetailOffcanvas"
      :title="viewingDoc?.title ?? ''"
      :subtitle="viewingDoc ? docTypeLabel(viewingDoc.type) : ''"
    >
      <template v-if="viewingDoc">
        <!-- File Preview -->
        <div v-if="viewingDoc.file_path" class="doc-preview mb-4">
          <button
            v-if="isImage(viewingDoc.file_path)"
            type="button"
            class="doc-preview__zoom"
            title="Click to enlarge"
            @click="openLightbox(viewingDoc)"
          >
            <img
              :src="`/storage/${viewingDoc.file_path}`"
              class="doc-preview__img"
              :alt="viewingDoc.title"
            />
            <span class="doc-preview__zoom-hint"><i class="bi bi-arrows-fullscreen" /> Click to enlarge</span>
          </button>
          <a
            v-else
            :href="`/storage/${viewingDoc.file_path}`"
            target="_blank"
            class="doc-preview__file"
          >
            <i class="bi bi-file-earmark-pdf" />
            <span>{{ viewingDoc.file_name || 'View File' }}</span>
            <i class="bi bi-box-arrow-up-right ms-auto" />
          </a>
        </div>

        <!-- Details List -->
        <div class="doc-detail-list">
          <div class="doc-detail-row">
            <span class="doc-detail-row__label">Member</span>
            <span class="doc-detail-row__value">{{ viewingDoc.member_name }}</span>
          </div>
          <div v-if="viewingDoc.document_number" class="doc-detail-row">
            <span class="doc-detail-row__label">Document No.</span>
            <span class="doc-detail-row__value">{{ viewingDoc.document_number }}</span>
          </div>
          <div v-if="viewingDoc.issue_date" class="doc-detail-row">
            <span class="doc-detail-row__label">Issue Date</span>
            <span class="doc-detail-row__value">{{ formatDate(viewingDoc.issue_date) }}</span>
          </div>
          <div v-if="viewingDoc.expiry_date" class="doc-detail-row">
            <span class="doc-detail-row__label">Expiry Date</span>
            <span class="doc-detail-row__value" :class="expiryClass(viewingDoc.expiry_date)">{{ formatDate(viewingDoc.expiry_date) }}</span>
          </div>
          <div class="doc-detail-row">
            <span class="doc-detail-row__label">Reminder</span>
            <span class="doc-detail-row__value">
              {{ viewingDoc.is_reminder_enabled ? `${viewingDoc.reminder_days_before} days before expiry` : 'Disabled' }}
            </span>
          </div>
          <div v-if="viewingDoc.notes" class="doc-detail-row doc-detail-row--notes">
            <span class="doc-detail-row__label">Notes</span>
            <span class="doc-detail-row__value">{{ viewingDoc.notes }}</span>
          </div>
        </div>
      </template>

      <template #footer>
        <button class="btn btn-primary" @click="showDetailOffcanvas = false; openModal(viewingDoc)">
          <i class="bi bi-pencil me-2" />Edit Document
        </button>
      </template>
    </AppOffcanvas>

    <!-- Add / Edit Document Offcanvas -->
    <AppOffcanvas
      v-model="showDocOffcanvas"
      :title="editingDoc ? 'Edit Document' : 'Add Document'"
      :subtitle="editingDoc ? 'Update document details.' : 'Fill in the document details below.'"
      :icon="editingDoc ? 'bi bi-pencil-square' : 'bi bi-file-earmark-plus'"
    >
      <form id="docForm" novalidate @submit.prevent="handleSubmit">
        <div class="row g-3">
          <FormField
            label="Document Type"
            required
            :error="errors.type" field="type"
            class="col-12"
            :class="{ 'col-md-6': showTitleField }"
          >
            <template #default="{ id }">
              <SelectField
                :id="id"
                v-model="form.type"
                :options="docTypes"
                placeholder="Select type"
              />
            </template>
          </FormField>
          <FormField required
            v-if="showTitleField"
            label="Document Title"
            :error="errors.title" field="title"
            class="col-12 col-md-6"
          >
            <template #default="{ id }">
              <input :id="id" v-model="form.title" type="text" class="form-control" />
            </template>
          </FormField>
          <FormField required label="Member Name" :error="errors.member_name" field="member_name" class="col-12 col-md-6">
            <template #default="{ id }">
              <input :id="id" v-model="form.member_name" type="text" class="form-control" />
            </template>
          </FormField>
          <FormField label="Document Number" :error="errors.document_number" field="document_number" class="col-12 col-md-6">
            <template #default="{ id }">
              <input :id="id" v-model="form.document_number" type="text" class="form-control" />
            </template>
          </FormField>
          <template v-if="showExpiryFields">
            <FormField label="Issue Date" :error="errors.issue_date" field="issue_date" class="col-12 col-md-6">
              <template #default="{ id }">
                <input :id="id" v-model="form.issue_date" type="date" class="form-control" />
              </template>
            </FormField>
            <FormField label="Expiry Date" :error="errors.expiry_date" field="expiry_date" class="col-12 col-md-6">
              <template #default="{ id }">
                <input :id="id" v-model="form.expiry_date" type="date" class="form-control" />
              </template>
            </FormField>
          </template>
          <div class="col-12">
            <label class="form-label fw-semibold">Upload File <span class="text-muted" style="font-weight:400">(PDF/Image, max 10MB)</span></label>
            <input ref="fileInput" type="file" class="form-control" accept=".pdf,.jpg,.jpeg,.png" @change="onFileChange" />

            <div v-if="upload" class="upload-preview mt-2">
              <img v-if="upload.isImage" :src="upload.src" :alt="upload.name" class="upload-preview__img" />
              <div v-else class="upload-preview__file">
                <i class="bi bi-file-earmark-pdf" />
                <span class="text-truncate">{{ upload.name }}</span>
              </div>
              <div class="upload-preview__caption">
                <span class="text-truncate">{{ upload.name }}</span>
                <button v-if="selectedFile" type="button" class="upload-preview__clear" @click="clearFile">
                  <i class="bi bi-x-lg" /> Remove
                </button>
                <span v-else class="text-muted">Current file</span>
              </div>
            </div>
          </div>
          <FormField label="Notes" :error="errors.notes" field="notes" class="col-12">
            <template #default="{ id }">
              <textarea :id="id" v-model="form.notes" rows="3" class="form-control" />
            </template>
          </FormField>
          <template v-if="showExpiryFields">
            <div class="col-12">
              <div class="form-check form-switch">
                <input v-model="form.is_reminder_enabled" class="form-check-input" type="checkbox" id="reminderToggle" />
                <label class="form-check-label fw-semibold" for="reminderToggle">Enable Expiry Reminder</label>
              </div>
            </div>
            <div v-if="form.is_reminder_enabled" class="col-12">
              <label class="form-label fw-semibold">Remind {{ form.reminder_days_before }} days before expiry</label>
              <input v-model.number="form.reminder_days_before" type="range" class="form-range" min="7" max="90" step="7" />
            </div>
          </template>
        </div>
      </form>

      <template #footer>
        <button type="submit" form="docForm" class="btn btn-primary" :disabled="formLoading">
          <span v-if="formLoading" class="spinner-border spinner-border-sm me-2" />
          {{ editingDoc ? 'Update Document' : 'Add Document' }}
        </button>
      </template>
    </AppOffcanvas>

    <!-- Delete Document Confirm -->
    <ConfirmModal
      v-model="showDeleteModal"
      :title="`Delete ${docToDelete?.title}?`"
      message="This document will be permanently deleted and cannot be recovered."
      confirm-text="Delete"
      cancel-text="Cancel"
      icon="bi bi-trash"
      variant="danger"
      :loading="deleting"
      @confirm="handleConfirmDelete"
    />
    <!-- Image lightbox. Documents are often photos or screenshots, so `fit`
         alone is not enough to read them — clicking again switches to actual
         size and lets the overlay scroll. -->
    <div
      v-if="lightboxDoc"
      class="doc-lightbox"
      @click.self="closeLightbox"
    >
      <div class="doc-lightbox__bar" @click.stop>
        <span class="doc-lightbox__name text-truncate">{{ lightboxDoc.file_name || lightboxDoc.title }}</span>
        <button type="button" class="doc-lightbox__btn" :title="zoomed ? 'Fit to screen' : 'Actual size'" @click="zoomed = !zoomed">
          <i :class="zoomed ? 'bi bi-zoom-out' : 'bi bi-zoom-in'" />
        </button>
        <a class="doc-lightbox__btn" :href="`/storage/${lightboxDoc.file_path}`" target="_blank" title="Open in new tab">
          <i class="bi bi-box-arrow-up-right" />
        </a>
        <button type="button" class="doc-lightbox__btn" title="Close" @click="closeLightbox">
          <i class="bi bi-x-lg" />
        </button>
      </div>

      <div class="doc-lightbox__stage" :class="{ 'is-zoomed': zoomed }" @click.self="closeLightbox">
        <img
          :src="`/storage/${lightboxDoc.file_path}`"
          :alt="lightboxDoc.title"
          :class="zoomed ? 'doc-lightbox__img is-zoomed' : 'doc-lightbox__img'"
          @click="zoomed = !zoomed"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, computed, onMounted, onBeforeUnmount, provide} from 'vue'
import { useDocumentStore } from '@/stores/documents'
import { useToast } from '@/composables/useToast'
import ShimmerLoader from '@/components/ShimmerLoader.vue'
import AppOffcanvas from '@/components/AppOffcanvas.vue'
import ConfirmModal from '@/components/ConfirmModal.vue'
import FormField from '@/components/FormField.vue'
import SelectField from '@/components/SelectField.vue'
import { useFormErrors } from '@/composables/useFormErrors'

const store = useDocumentStore()
const { showToast } = useToast()
const { errors, clear: clearErrors, capture: captureErrors, clearField } = useFormErrors()
// FormField clears its own message as the user edits.
provide('clearFormField', clearField)
let modalInstance = null

const filters = reactive({ search: '', type: '' })
const form = reactive({
  title: '', type: '', member_name: '', document_number: '',
  issue_date: '', expiry_date: '', notes: '',
  is_reminder_enabled: true, reminder_days_before: 30,
})
const editingDoc = ref(null)
const formLoading = ref(false)
const selectedFile = ref(null)
const filePreviewUrl = ref(null)
const fileInput = ref(null)
const showDocOffcanvas = ref(false)
const showDetailOffcanvas = ref(false)
const viewingDoc = ref(null)
const openMenuId = ref(null)
const lightboxDoc = ref(null)
const zoomed = ref(false)
const showDeleteModal = ref(false)
const docToDelete = ref(null)
const deleting = ref(false)

function toggleMenu(id) {
  openMenuId.value = openMenuId.value === id ? null : id
}

function openLightbox(doc) {
  clearErrors()
  lightboxDoc.value = doc
  zoomed.value = false
}

function closeLightbox() {
  lightboxDoc.value = null
}

function onKeydown(e) {
  if (e.key === 'Escape') closeLightbox()
}

function openDetail(doc) {
  viewingDoc.value = doc
  showDetailOffcanvas.value = true
}

function isImage(path) {
  return /\.(jpg|jpeg|png|gif|webp)$/i.test(path)
}

/**
 * `expires` drives the issue/expiry/reminder block: only Passport and Driving
 * License actually expire in India — Aadhaar, PAN, Voter ID and a birth
 * certificate are issued once for life, so asking for an expiry date on them
 * invites wrong data (and a reminder that should never fire). `other` is
 * unknown by definition, so it gets the full set.
 *
 * `customTitle` marks the types whose name does not already identify the
 * document. Everything else has its title derived — see derivedTitle().
 */
const docTypes = [
  { value: 'aadhaar',          label: 'Aadhaar Card',      shortLabel: 'Aadhaar',  expires: false },
  { value: 'pan',              label: 'PAN Card',           shortLabel: 'PAN',      expires: false },
  { value: 'passport',         label: 'Passport',           shortLabel: 'Passport', expires: true },
  { value: 'driving_license',  label: 'Driving License',    shortLabel: 'DL',       expires: true },
  { value: 'birth_certificate',label: 'Birth Certificate',  shortLabel: 'Birth',    expires: false },
  { value: 'voter_id',         label: 'Voter ID',           shortLabel: 'Voter',    expires: false },
  { value: 'other',            label: 'Other',              shortLabel: 'Other',    expires: true, customTitle: true },
]

const selectedType = computed(() => docTypes.find((t) => t.value === form.type) ?? null)

/** `Other` needs a typed title; every other type derives one. */
const showTitleField = computed(() => !!selectedType.value?.customTitle)

/** Issue date, expiry date and the reminder travel together. */
const showExpiryFields = computed(() => !!selectedType.value?.expires)

/**
 * The title the app writes when the field is hidden. Type alone is not unique
 * — a family has several Aadhaar cards — so the member name goes in it, which
 * also keeps `?search=` (title, document_number, member_name) working.
 */
function derivedTitle(type, memberName) {
  const label = docTypes.find((t) => t.value === type)?.label ?? 'Document'
  const member = (memberName ?? '').trim()
  return member ? `${label} — ${member}` : label
}

const docTypeColors = {
  aadhaar:           '#6C5CE7',
  pan:               '#00b894',
  passport:          '#0984e3',
  driving_license:   '#fdcb6e',
  birth_certificate: '#fd79a8',
  voter_id:          '#e17055',
  other:             '#636e72',
}

const docTypeIcons = {
  aadhaar:           'bi bi-fingerprint',
  pan:               'bi bi-credit-card-2-front',
  passport:          'bi bi-book',
  driving_license:   'bi bi-car-front',
  birth_certificate: 'bi bi-hearts',
  voter_id:          'bi bi-check2-square',
  other:             'bi bi-file-earmark-text',
}

function docTypeLabel(type) {
  return docTypes.find((t) => t.value === type)?.label ?? type
}

function docTypeColor(type) {
  return docTypeColors[type] ?? '#6C5CE7'
}

function docTypeIcon(type) {
  return docTypeIcons[type] ?? 'bi bi-file-earmark-text'
}

function setType(val) {
  filters.type = val
  fetchDocs()
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

/**
 * Object URLs are held by the browser until revoked, so every swap releases the
 * previous one. PDFs get no URL — they show as a named chip instead.
 */
function setSelectedFile(file) {
  if (filePreviewUrl.value) URL.revokeObjectURL(filePreviewUrl.value)
  filePreviewUrl.value = file?.type?.startsWith('image/') ? URL.createObjectURL(file) : null
  selectedFile.value = file
}

function onFileChange(e) {
  setSelectedFile(e.target.files[0] ?? null)
}

function clearFile() {
  setSelectedFile(null)
  if (fileInput.value) fileInput.value.value = ''
}

/**
 * What to show under the upload field: the file just picked, or — when editing
 * a document that already has one and nothing new is chosen — the stored file.
 */
const upload = computed(() => {
  if (selectedFile.value) {
    return {
      isImage: !!filePreviewUrl.value,
      src: filePreviewUrl.value,
      name: selectedFile.value.name,
    }
  }

  const stored = editingDoc.value?.file_path
  if (!stored) return null

  return {
    isImage: isImage(stored),
    src: `/storage/${stored}`,
    name: editingDoc.value.file_name || stored.split('/').pop(),
  }
})

let searchTimer = null
function debouncedFetch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(fetchDocs, 400)
}

async function fetchDocs() {
  await store.fetchDocuments({ ...filters })
}

const isFiltered = computed(() => !!(filters.search.trim() || filters.type))

/** The heading states what was not found; the hint says what to do next. */
const noMatchTitle = computed(() => {
  const term = filters.search.trim()
  return term ? `No results for “${term}”` : `No ${docTypeLabel(filters.type)} Documents`
})

const noMatchHint = computed(() => {
  const term = filters.search.trim()
  const type = filters.type ? docTypeLabel(filters.type) : ''

  if (term && type) return `Nothing under ${type} matches. Try another type, or clear the filter.`
  if (term) return 'Try a different spelling, or search by member name or document number.'
  return 'Nothing filed under this type yet.'
})

function resetFilters() {
  filters.search = ''
  filters.type = ''
  fetchDocs()
}

function openModal(doc = null) {
  editingDoc.value = doc
  clearErrors()
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
  clearFile()
  showDocOffcanvas.value = true
}

/** Dates the form may need to blank out, so '' is sent rather than skipped. */
const CLEARABLE = new Set(['issue_date', 'expiry_date'])

/**
 * Reconciles the form with the fields the chosen type actually has. Hidden
 * inputs still hold whatever was loaded, so they are resolved here rather than
 * left to leak stale values into the request.
 */
function buildPayload() {
  const payload = { ...form }
  const stored = editingDoc.value

  if (!showTitleField.value) {
    // The app owns the title when the field is hidden — but a title a user
    // typed themselves is theirs to keep. Regenerate only when it still
    // matches what we would have produced, or when the type just changed and
    // the old title describes the wrong kind of document.
    const typeChanged = stored && stored.type !== form.type
    const wasDerived =
      !stored || typeChanged || stored.title === derivedTitle(stored.type, stored.member_name)

    payload.title = wasDerived ? derivedTitle(form.type, form.member_name) : stored.title
  }

  if (!showExpiryFields.value) {
    // Switching Passport -> PAN must not leave the old expiry behind: it would
    // keep the document in "Expiring Soon" forever. '' clears the column —
    // toDate('') is null, and the `nullable` rule skips validating it.
    payload.issue_date = ''
    payload.expiry_date = ''
    payload.is_reminder_enabled = false
  }

  return payload
}

async function handleSubmit() {
  clearErrors()
  formLoading.value = true
  const fd = new FormData()
  Object.entries(buildPayload()).forEach(([k, v]) => {
    if (v === null || (v === '' && !CLEARABLE.has(k))) return
    if (typeof v === 'boolean') fd.append(k, v ? '1' : '0')
    else fd.append(k, v)
  })
  if (selectedFile.value) fd.append('file', selectedFile.value)
  try {
    if (editingDoc.value) {
      await store.updateDocument(editingDoc.value.id, fd)
      showToast('Document updated!', 'success')
    } else {
      await store.createDocument(fd)
      showToast('Document added!', 'success')
    }
    showDocOffcanvas.value = false
    fetchDocs()
  } catch (err) {
    // 422 means per-field messages; anything else is a real failure.
    if (!captureErrors(err)) showToast(err.response?.data?.message ?? 'Error occurred', 'danger')
  } finally {
    formLoading.value = false
  }
}

async function confirmDelete(doc) {
  docToDelete.value = doc
  showDeleteModal.value = true
}

async function handleConfirmDelete() {
  if (!docToDelete.value) return
  deleting.value = true
  try {
    await store.deleteDocument(docToDelete.value.id)
    showToast('Document deleted', 'success')
    showDeleteModal.value = false
    docToDelete.value = null
    fetchDocs()
  } catch {
    showToast('Failed to delete', 'danger')
  } finally {
    deleting.value = false
  }
}

function closeMenus() {
  openMenuId.value = null
}

onMounted(() => {
  fetchDocs()
  document.addEventListener('click', closeMenus)
  document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', closeMenus)
  document.removeEventListener('keydown', onKeydown)
  if (filePreviewUrl.value) URL.revokeObjectURL(filePreviewUrl.value)
})
</script>

<style scoped>
/* ═══════════════════════════════════════════════
   Search + filter pills
═══════════════════════════════════════════════ */
.doc-search-wrap {
  position: relative;
  min-width: 220px;
}

.doc-search-icon {
  position: absolute;
  left: 0.85rem;
  top: 50%;
  transform: translateY(-50%);
  color: #a0aec0;
  font-size: 0.9rem;
  pointer-events: none;
}

.doc-search-input {
  padding-left: 2.4rem;
  border-radius: 50px;
  border: 1.5px solid #e2e8f0;
  background: #fafbff;

  &:focus {
    border-color: #6C5CE7;
    box-shadow: 0 0 0 3px rgba(108,92,231,0.1);
    background: #fff;
  }
}

.doc-filter-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.doc-filter-pill {
  padding: 0.35rem 0.85rem;
  border-radius: 50px;
  border: 1.5px solid #e2e8f0;
  background: #fff;
  font-size: 0.78rem;
  font-weight: 600;
  color: #4a5568;
  cursor: pointer;
  transition: all 0.18s ease;
  white-space: nowrap;

  &:hover { border-color: #a29bfe; color: #6C5CE7; }
  &.active {
    background: #6C5CE7;
    border-color: #6C5CE7;
    color: #fff;
  }
}

/* ═══════════════════════════════════════════════
   Document card
═══════════════════════════════════════════════ */
.doc-card {
  height: 100%;
  background: #fff;
  border-radius: 16px;
  border: 1.5px solid #eef0f7;
  box-shadow: 0 2px 10px rgba(0,0,0,0.04);
  overflow: hidden;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 10px 28px rgba(0,0,0,0.1);
  }
}

.doc-card__stripe {
  height: 5px;
  width: 100%;
  flex-shrink: 0;
}

.doc-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1rem 0.5rem;
}

.doc-card__type-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  flex-shrink: 0;
}

.doc-card__body {
  padding: 0 1rem 0.75rem;
  flex: 1;
}

.doc-card__badge {
  display: inline-block;
  padding: 0.15rem 0.6rem;
  border-radius: 50px;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  margin-bottom: 0.5rem;
}

.doc-card__title {
  font-size: 0.95rem;
  font-weight: 700;
  color: #1a202c;
  margin: 0 0 0.25rem;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.doc-card__member {
  font-size: 0.8rem;
  color: #718096;
  margin: 0 0 0.25rem;
}

.doc-card__number {
  font-size: 0.75rem;
  color: #a0aec0;
  font-family: monospace;
}

.doc-card__meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.doc-card__expiry {
  font-size: 0.75rem;
  font-weight: 600;
}

.doc-card__attachment {
  margin-left: auto;
  color: #a0aec0;
  font-size: 0.9rem;
}

/* ═══════════════════════════════════════════════
   Three-dot menu
═══════════════════════════════════════════════ */
.doc-menu {
  position: relative;
  flex-shrink: 0;
}

.doc-menu__dropdown {
  position: absolute;
  right: 0;
  top: calc(100% + 4px);
  background: #fff;
  border: 1px solid #eef0f7;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.12);
  min-width: 150px;
  z-index: 200;
  overflow: hidden;
}

.doc-menu__item {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 0.6rem 1rem;
  background: transparent;
  border: none;
  font-size: 0.875rem;
  font-weight: 500;
  color: #2d3748;
  cursor: pointer;
  text-align: left;
  text-decoration: none;
  transition: background 0.15s;

  &:hover { background: #f8f9fc; }
  &.text-danger { color: #d63031 !important; }
  &.text-danger:hover { background: #fff5f5; }
}

/* ═══════════════════════════════════════════════
   Detail offcanvas
═══════════════════════════════════════════════ */
.doc-preview {
  border-radius: 12px;
  overflow: hidden;
  border: 1.5px solid #eef0f7;
}

.doc-preview__img {
  width: 100%;
  max-height: 280px;
  object-fit: contain;
  background: #f8f9fc;
  display: block;
}

.upload-preview {
  border-radius: 12px;
  overflow: hidden;
  border: 1.5px solid #eef0f7;
}

.upload-preview__img {
  width: 100%;
  max-height: 200px;
  object-fit: contain;
  background: #f8f9fc;
  display: block;
}

.upload-preview__file {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.85rem 1rem;
  background: #f8f9fc;
  color: #2d3748;
  font-weight: 600;
  font-size: 0.9rem;

  i { font-size: 1.35rem; color: #e17055; }
}

.upload-preview__caption {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  border-top: 1.5px solid #eef0f7;
  font-size: 0.8rem;
  color: #5f6780;
}

.upload-preview__clear {
  flex-shrink: 0;
  border: 0;
  background: none;
  padding: 0;
  color: #e17055;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;

  i { font-size: 0.7rem; }
}

.doc-preview__zoom {
  display: block;
  position: relative;
  width: 100%;
  padding: 0;
  border: 0;
  background: none;
  cursor: zoom-in;

  &:hover .doc-preview__zoom-hint { opacity: 1; }
}

.doc-preview__zoom-hint {
  position: absolute;
  right: 0.5rem;
  bottom: 0.5rem;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.6rem;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.65);
  color: #fff;
  font-size: 0.72rem;
  font-weight: 600;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.doc-lightbox {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  background: rgba(0, 0, 0, 0.92);
}

.doc-lightbox__bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  color: #fff;
}

.doc-lightbox__name {
  flex: 1;
  min-width: 0;
  font-size: 0.85rem;
  font-weight: 600;
  opacity: 0.85;
}

.doc-lightbox__btn {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  text-decoration: none;
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover { background: rgba(255, 255, 255, 0.25); color: #fff; }
}

.doc-lightbox__stage {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 1rem 1rem;
  overflow: auto;

  &.is-zoomed { align-items: flex-start; }
}

.doc-lightbox__img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 8px;
  cursor: zoom-in;

  &.is-zoomed {
    max-width: none;
    max-height: none;
    cursor: zoom-out;
  }
}

.doc-preview__file {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  background: #f8f9fc;
  text-decoration: none;
  color: #2d3748;
  font-weight: 600;
  font-size: 0.9rem;

  i:first-child { font-size: 1.5rem; color: #e17055; }
  &:hover { background: #f0f2ff; }
}

.doc-detail-list {
  display: flex;
  flex-direction: column;
  border: 1.5px solid #eef0f7;
  border-radius: 12px;
  overflow: hidden;
}

.doc-detail-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  padding: 0.75rem 1.25rem;
  border-bottom: 1px solid #f4f5fb;

  &:last-child { border-bottom: none; }
  &--notes { flex-direction: column; gap: 0.25rem; }
}

.doc-detail-row__label {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: #8a94a6;
  flex-shrink: 0;
}

.doc-detail-row__value {
  font-size: 0.875rem;
  font-weight: 500;
  color: #2d3748;
  text-align: right;

  .doc-detail-row--notes & { text-align: left; }
}
</style>
