<template>
  <div>
    <div class="page-header">
      <div>
        <h4 class="page-title">Medical</h4>
        <p class="page-subtitle">Health records, medicines & appointments</p>
      </div>
    </div>

    <!-- Tabs -->
    <ul class="nav nav-pills mb-4 gap-1">
      <li class="nav-item">
        <button class="nav-link" :class="{ active: tab === 'records' }" @click="tab = 'records'">
          <i class="bi bi-file-medical me-2" />Records
        </button>
      </li>
      <li class="nav-item">
        <button class="nav-link" :class="{ active: tab === 'medicines' }" @click="tab = 'medicines'">
          <i class="bi bi-capsule me-2" />Medicines
        </button>
      </li>
      <li class="nav-item">
        <button class="nav-link" :class="{ active: tab === 'appointments' }" @click="tab = 'appointments'">
          <i class="bi bi-calendar-heart me-2" />Appointments
        </button>
      </li>
    </ul>

    <!-- Records Tab -->
    <template v-if="tab === 'records'">
      <div class="page-header">
        <div />
        <button class="btn btn-primary" @click="openRecordModal()">
          <i class="bi bi-plus-lg me-2" />Add Record
        </button>
      </div>
      <ShimmerLoader v-if="store.loading" variant="medical" :count="6" />
      <div v-else-if="store.records.length" class="row g-3">
        <div v-for="rec in store.records" :key="rec.id" class="col-12 col-sm-6 col-lg-4">
          <div class="fl-card p-3">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <span class="badge" :class="recordTypeBadge(rec.type)">{{ rec.type }}</span>
              <div class="dropdown">
                <button class="btn btn-icon btn-light btn-sm" data-bs-toggle="dropdown">
                  <i class="bi bi-three-dots-vertical" />
                </button>
                <ul class="dropdown-menu dropdown-menu-end">
                  <li><a class="dropdown-item" href="#" @click.prevent="openRecordModal(rec)"><i class="bi bi-pencil me-2" />Edit</a></li>
                  <li v-if="rec.file_path"><a class="dropdown-item" :href="`/storage/${rec.file_path}`" target="_blank"><i class="bi bi-eye me-2" />View File</a></li>
                  <li><a class="dropdown-item text-danger" href="#" @click.prevent="deleteRecord(rec)"><i class="bi bi-trash me-2" />Delete</a></li>
                </ul>
              </div>
            </div>
            <h6 class="fw-bold mb-1">{{ rec.title }}</h6>
            <div class="text-muted small mb-1">
              <i class="bi bi-person me-1" />{{ rec.member_name }}
            </div>
            <div v-if="rec.doctor_name" class="text-muted small mb-1">
              <i class="bi bi-person-badge me-1" />Dr. {{ rec.doctor_name }}
            </div>
            <div class="text-muted small">
              <i class="bi bi-calendar3 me-1" />{{ formatDate(rec.date) }}
            </div>
          </div>
        </div>
      </div>
      <div v-else class="fl-card">
        <div class="empty-state">
          <i class="bi bi-file-medical empty-icon" />
          <h6 class="empty-title">No Medical Records</h6>
          <button class="btn btn-primary" @click="openRecordModal()"><i class="bi bi-plus-lg me-2" />Add Record</button>
        </div>
      </div>
    </template>

    <!-- Medicines Tab -->
    <template v-if="tab === 'medicines'">
      <div class="page-header">
        <div />
        <button class="btn btn-primary" @click="openMedModal()">
          <i class="bi bi-plus-lg me-2" />Add Medicine
        </button>
      </div>
      <div class="fl-card overflow-hidden">
        <div v-if="store.medicines.length" class="table-responsive">
          <table class="table mb-0">
            <thead>
              <tr>
                <th>Member</th>
                <th>Medicine</th>
                <th>Dosage</th>
                <th>Frequency</th>
                <th>Duration</th>
                <th>Status</th>
                <th class="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="med in store.medicines" :key="med.id">
                <td>{{ med.member_name }}</td>
                <td class="fw-semibold">{{ med.name }}</td>
                <td>{{ med.dosage ?? '-' }}</td>
                <td>{{ med.frequency ?? '-' }}</td>
                <td>
                  <span v-if="med.start_date">{{ formatDate(med.start_date) }}</span>
                  <span v-if="med.end_date"> → {{ formatDate(med.end_date) }}</span>
                  <span v-if="!med.start_date">-</span>
                </td>
                <td>
                  <span class="badge" :class="med.is_active ? 'bg-success' : 'bg-secondary'">
                    {{ med.is_active ? 'Active' : 'Inactive' }}
                  </span>
                </td>
                <td class="text-center">
                  <button class="btn btn-icon btn-light btn-sm me-1" @click="openMedModal(med)"><i class="bi bi-pencil" /></button>
                  <button class="btn btn-icon btn-light btn-sm text-danger" @click="deleteMedicine(med)"><i class="bi bi-trash" /></button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="empty-state">
          <i class="bi bi-capsule empty-icon" />
          <h6 class="empty-title">No Medicines Tracked</h6>
          <button class="btn btn-primary" @click="openMedModal()"><i class="bi bi-plus-lg me-2" />Add Medicine</button>
        </div>
      </div>
    </template>

    <!-- Appointments Tab -->
    <template v-if="tab === 'appointments'">
      <div class="page-header">
        <div />
        <button class="btn btn-primary" @click="openApptModal()">
          <i class="bi bi-plus-lg me-2" />Schedule Appointment
        </button>
      </div>
      <div class="row g-3">
        <div v-for="appt in store.appointments" :key="appt.id" class="col-12 col-sm-6 col-lg-4">
          <div class="fl-card p-3">
            <div class="d-flex justify-content-between align-items-start">
              <div
                class="rounded-2 d-flex align-items-center justify-content-center text-white me-3"
                style="width:44px;height:44px;background:#d63031;flex-shrink:0"
              >
                <i class="bi bi-hospital fs-5" />
              </div>
              <div class="flex-grow-1">
                <h6 class="fw-bold mb-1">Dr. {{ appt.doctor_name }}</h6>
                <div class="text-muted small">{{ appt.specialty }}</div>
              </div>
              <div class="dropdown">
                <button class="btn btn-icon btn-light btn-sm" data-bs-toggle="dropdown">
                  <i class="bi bi-three-dots-vertical" />
                </button>
                <ul class="dropdown-menu dropdown-menu-end">
                  <li><a class="dropdown-item" href="#" @click.prevent="openApptModal(appt)"><i class="bi bi-pencil me-2" />Edit</a></li>
                  <li><a class="dropdown-item text-danger" href="#" @click.prevent="deleteAppt(appt)"><i class="bi bi-trash me-2" />Delete</a></li>
                </ul>
              </div>
            </div>
            <hr class="my-2" />
            <div class="small text-muted">
              <div><i class="bi bi-person me-1" />{{ appt.member_name }}</div>
              <div><i class="bi bi-calendar3 me-1" />{{ formatDate(appt.date) }} {{ appt.time ? `at ${appt.time}` : '' }}</div>
              <div v-if="appt.location"><i class="bi bi-geo-alt me-1" />{{ appt.location }}</div>
            </div>
            <div class="mt-2">
              <span class="badge" :class="apptStatusBadge(appt.status)">{{ appt.status }}</span>
            </div>
          </div>
        </div>
        <div v-if="!store.appointments.length" class="col-12">
          <div class="fl-card">
            <div class="empty-state">
              <i class="bi bi-calendar-heart empty-icon" />
              <h6 class="empty-title">No Appointments</h6>
              <button class="btn btn-primary" @click="openApptModal()"><i class="bi bi-plus-lg me-2" />Schedule</button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Record Modal -->
    <div class="modal fade" id="recordModal" tabindex="-1">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ editingRecord ? 'Edit' : 'Add' }} Medical Record</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" />
          </div>
          <div class="modal-body">
            <form id="recForm" @submit.prevent="handleRecordSubmit">
              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label">Member Name *</label>
                  <input v-model="recForm.member_name" type="text" class="form-control" required />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Type *</label>
                  <select v-model="recForm.type" class="form-select" required>
                    <option value="record">Medical Record</option>
                    <option value="prescription">Prescription</option>
                    <option value="report">Report</option>
                    <option value="vaccination">Vaccination</option>
                  </select>
                </div>
                <div class="col-12">
                  <label class="form-label">Title *</label>
                  <input v-model="recForm.title" type="text" class="form-control" required />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Doctor Name</label>
                  <input v-model="recForm.doctor_name" type="text" class="form-control" />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Hospital</label>
                  <input v-model="recForm.hospital_name" type="text" class="form-control" />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Date *</label>
                  <input v-model="recForm.date" type="date" class="form-control" required />
                </div>
                <div class="col-12">
                  <label class="form-label">Diagnosis / Notes</label>
                  <textarea v-model="recForm.notes" rows="2" class="form-control" />
                </div>
                <div class="col-12">
                  <label class="form-label">Upload File</label>
                  <input ref="recFileInput" type="file" class="form-control" accept=".pdf,.jpg,.jpeg,.png" @change="recFile = $event.target.files[0]" />
                </div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-light" data-bs-dismiss="modal">Cancel</button>
            <button type="submit" form="recForm" class="btn btn-primary" :disabled="formLoading">
              <span v-if="formLoading" class="spinner-border spinner-border-sm me-2" />Save
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Medicine Modal -->
    <div class="modal fade" id="medModal" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ editingMed ? 'Edit' : 'Add' }} Medicine</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" />
          </div>
          <div class="modal-body">
            <form id="medForm" @submit.prevent="handleMedSubmit">
              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label">Member Name *</label>
                  <input v-model="medForm.member_name" type="text" class="form-control" required />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Medicine Name *</label>
                  <input v-model="medForm.name" type="text" class="form-control" required />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Dosage</label>
                  <input v-model="medForm.dosage" type="text" class="form-control" placeholder="e.g. 500mg" />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Frequency</label>
                  <input v-model="medForm.frequency" type="text" class="form-control" placeholder="e.g. Twice daily" />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Start Date</label>
                  <input v-model="medForm.start_date" type="date" class="form-control" />
                </div>
                <div class="col-md-6">
                  <label class="form-label">End Date</label>
                  <input v-model="medForm.end_date" type="date" class="form-control" />
                </div>
                <div class="col-12">
                  <div class="form-check form-switch">
                    <input v-model="medForm.is_active" class="form-check-input" type="checkbox" id="isActiveToggle" />
                    <label class="form-check-label" for="isActiveToggle">Currently Active</label>
                  </div>
                </div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-light" data-bs-dismiss="modal">Cancel</button>
            <button type="submit" form="medForm" class="btn btn-primary" :disabled="formLoading">
              <span v-if="formLoading" class="spinner-border spinner-border-sm me-2" />Save
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Appointment Modal -->
    <div class="modal fade" id="apptModal" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ editingAppt ? 'Edit' : 'Schedule' }} Appointment</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" />
          </div>
          <div class="modal-body">
            <form id="apptForm" @submit.prevent="handleApptSubmit">
              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label">Member Name *</label>
                  <input v-model="apptForm.member_name" type="text" class="form-control" required />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Doctor Name *</label>
                  <input v-model="apptForm.doctor_name" type="text" class="form-control" required />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Specialty</label>
                  <input v-model="apptForm.specialty" type="text" class="form-control" placeholder="e.g. Cardiologist" />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Date *</label>
                  <input v-model="apptForm.date" type="date" class="form-control" required />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Time</label>
                  <input v-model="apptForm.time" type="time" class="form-control" />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Status</label>
                  <select v-model="apptForm.status" class="form-select">
                    <option value="scheduled">Scheduled</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div class="col-12">
                  <label class="form-label">Location / Hospital</label>
                  <input v-model="apptForm.location" type="text" class="form-control" />
                </div>
                <div class="col-12">
                  <label class="form-label">Notes</label>
                  <textarea v-model="apptForm.notes" rows="2" class="form-control" />
                </div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-light" data-bs-dismiss="modal">Cancel</button>
            <button type="submit" form="apptForm" class="btn btn-primary" :disabled="formLoading">
              <span v-if="formLoading" class="spinner-border spinner-border-sm me-2" />Save
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
import { useMedicalStore } from '@/stores/medical'
import { useToast } from '@/composables/useToast'
import ShimmerLoader from '@/components/ShimmerLoader.vue'

const store = useMedicalStore()
const { showToast } = useToast()

const tab = ref('records')
const formLoading = ref(false)

// Record modal
let recordModalInstance = null
let medModalInstance = null
let apptModalInstance = null

const editingRecord = ref(null)
const editingMed = ref(null)
const editingAppt = ref(null)

const recForm = reactive({ member_name: '', type: 'record', title: '', doctor_name: '', hospital_name: '', date: '', notes: '' })
const medForm = reactive({ member_name: '', name: '', dosage: '', frequency: '', start_date: '', end_date: '', is_active: true })
const apptForm = reactive({ member_name: '', doctor_name: '', specialty: '', date: '', time: '', location: '', notes: '', status: 'scheduled' })

const recFile = ref(null)
const recFileInput = ref(null)

function recordTypeBadge(t) {
  const map = { record: 'bg-primary bg-opacity-10 text-primary', prescription: 'bg-success bg-opacity-10 text-success', report: 'bg-warning bg-opacity-10 text-warning', vaccination: 'bg-danger bg-opacity-10 text-danger' }
  return map[t] ?? 'bg-secondary bg-opacity-10 text-secondary'
}

function apptStatusBadge(s) {
  const map = { scheduled: 'bg-info bg-opacity-10 text-info', completed: 'bg-success bg-opacity-10 text-success', cancelled: 'bg-danger bg-opacity-10 text-danger' }
  return map[s] ?? 'bg-secondary'
}

function formatDate(d) {
  return d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'
}

// Records
function openRecordModal(rec = null) {
  editingRecord.value = rec
  if (rec) {
    Object.assign(recForm, { member_name: rec.member_name, type: rec.type, title: rec.title, doctor_name: rec.doctor_name ?? '', hospital_name: rec.hospital_name ?? '', date: rec.date?.substring(0, 10) ?? '', notes: rec.notes ?? '' })
  } else {
    Object.assign(recForm, { member_name: '', type: 'record', title: '', doctor_name: '', hospital_name: '', date: '', notes: '' })
  }
  recFile.value = null
  recordModalInstance?.show()
}

async function handleRecordSubmit() {
  formLoading.value = true
  const fd = new FormData()
  Object.entries(recForm).forEach(([k, v]) => { if (v !== '') fd.append(k, v) })
  if (recFile.value) fd.append('file', recFile.value)
  try {
    if (editingRecord.value) {
      await store.updateRecord(editingRecord.value.id, fd)
      showToast('Record updated!', 'success')
    } else {
      await store.createRecord(fd)
      showToast('Record added!', 'success')
    }
    recordModalInstance?.hide()
    store.fetchRecords()
  } catch {
    showToast('Error occurred', 'danger')
  } finally {
    formLoading.value = false
  }
}

async function deleteRecord(rec) {
  if (!confirm(`Delete record "${rec.title}"?`)) return
  await store.deleteRecord(rec.id)
  showToast('Record deleted', 'success')
  store.fetchRecords()
}

// Medicines
function openMedModal(med = null) {
  editingMed.value = med
  if (med) {
    Object.assign(medForm, { member_name: med.member_name, name: med.name, dosage: med.dosage ?? '', frequency: med.frequency ?? '', start_date: med.start_date?.substring(0, 10) ?? '', end_date: med.end_date?.substring(0, 10) ?? '', is_active: med.is_active })
  } else {
    Object.assign(medForm, { member_name: '', name: '', dosage: '', frequency: '', start_date: '', end_date: '', is_active: true })
  }
  medModalInstance?.show()
}

async function handleMedSubmit() {
  formLoading.value = true
  try {
    if (editingMed.value) {
      await store.updateMedicine(editingMed.value.id, medForm)
      showToast('Medicine updated!', 'success')
    } else {
      await store.createMedicine(medForm)
      showToast('Medicine added!', 'success')
    }
    medModalInstance?.hide()
    store.fetchMedicines()
  } catch {
    showToast('Error occurred', 'danger')
  } finally {
    formLoading.value = false
  }
}

async function deleteMedicine(med) {
  if (!confirm(`Delete medicine "${med.name}"?`)) return
  await store.deleteMedicine(med.id)
  showToast('Medicine deleted', 'success')
  store.fetchMedicines()
}

// Appointments
function openApptModal(appt = null) {
  editingAppt.value = appt
  if (appt) {
    Object.assign(apptForm, { member_name: appt.member_name, doctor_name: appt.doctor_name, specialty: appt.specialty ?? '', date: appt.date?.substring(0, 10) ?? '', time: appt.time ?? '', location: appt.location ?? '', notes: appt.notes ?? '', status: appt.status })
  } else {
    Object.assign(apptForm, { member_name: '', doctor_name: '', specialty: '', date: '', time: '', location: '', notes: '', status: 'scheduled' })
  }
  apptModalInstance?.show()
}

async function handleApptSubmit() {
  formLoading.value = true
  try {
    if (editingAppt.value) {
      await store.updateAppointment(editingAppt.value.id, apptForm)
      showToast('Appointment updated!', 'success')
    } else {
      await store.createAppointment(apptForm)
      showToast('Appointment scheduled!', 'success')
    }
    apptModalInstance?.hide()
    store.fetchAppointments()
  } catch {
    showToast('Error occurred', 'danger')
  } finally {
    formLoading.value = false
  }
}

async function deleteAppt(appt) {
  if (!confirm(`Delete appointment with Dr. ${appt.doctor_name}?`)) return
  await store.deleteAppointment(appt.id)
  showToast('Appointment deleted', 'success')
  store.fetchAppointments()
}

onMounted(() => {
  store.fetchRecords()
  store.fetchMedicines()
  store.fetchAppointments()
  recordModalInstance = new Modal(document.getElementById('recordModal'))
  medModalInstance = new Modal(document.getElementById('medModal'))
  apptModalInstance = new Modal(document.getElementById('apptModal'))
})
</script>
