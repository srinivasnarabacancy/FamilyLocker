<template>
  <div>
    <div class="page-header">
      <div>
        <h4 class="page-title">Medical</h4>
        <p class="page-subtitle">Medicines & appointments</p>
      </div>
    </div>

    <!-- Tabs -->
    <ul class="nav nav-pills mb-4 gap-1">
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

    <!-- Medicine Offcanvas -->
    <AppOffcanvas
      v-model="showMedOffcanvas"
      :title="editingMed ? 'Edit Medicine' : 'Add Medicine'"
      :subtitle="editingMed ? 'Update the medicine details.' : 'Track a medicine for a family member.'"
      icon="bi bi-capsule"
    >
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

          <!-- Medicine Image -->
          <div class="col-12">
            <label class="form-label">Medicine Image</label>
            <input type="file" class="form-control" accept=".jpg,.jpeg,.png,.webp" @change="onMedImageChange" />
            <div v-if="medImagePreview" class="mt-2">
              <img :src="medImagePreview" alt="Medicine preview" class="rounded" style="max-height:120px;object-fit:contain;border:1px solid #e5e7eb;" />
            </div>
            <div v-else-if="editingMed?.image_path && !medImage" class="mt-2">
              <img :src="`/storage/${editingMed.image_path}`" alt="Current image" class="rounded" style="max-height:120px;object-fit:contain;border:1px solid #e5e7eb;" />
            </div>
          </div>

          <div class="col-12">
            <div class="form-check form-switch">
              <input v-model="medForm.is_active" class="form-check-input" type="checkbox" id="isActiveToggle" />
              <label class="form-check-label" for="isActiveToggle">Currently Active</label>
            </div>
          </div>
          <div class="col-12">
            <div class="form-check form-switch">
              <input v-model="medForm.notify_on_completion" class="form-check-input" type="checkbox" id="notifyCompletionToggle" />
              <label class="form-check-label" for="notifyCompletionToggle">
                Notify family when course ends
                <span class="text-muted small d-block">Sends an email on the End Date</span>
              </label>
            </div>
          </div>
        </div>
      </form>
      <template #footer>
        <button type="submit" form="medForm" class="btn btn-primary" :disabled="formLoading">
          <span v-if="formLoading" class="spinner-border spinner-border-sm me-2" />
          {{ editingMed ? 'Save Changes' : 'Add Medicine' }}
        </button>
      </template>
    </AppOffcanvas>

    <!-- Appointment Offcanvas -->
    <AppOffcanvas
      v-model="showApptOffcanvas"
      :title="editingAppt ? 'Edit Appointment' : 'Schedule Appointment'"
      :subtitle="editingAppt ? 'Update the appointment details.' : 'Schedule a doctor visit for a family member.'"
      icon="bi bi-calendar-heart"
    >
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
            <textarea v-model="apptForm.notes" rows="3" class="form-control" />
          </div>
          <div class="col-12">
            <label class="form-label">
              Remind Days Before
              <span class="text-muted small ms-1">Send email {{ apptForm.remind_days_before }} day(s) before appointment</span>
            </label>
            <input v-model.number="apptForm.remind_days_before" type="number" class="form-control" min="0" max="365" />
          </div>
        </div>
      </form>
      <template #footer>
        <button type="submit" form="apptForm" class="btn btn-primary" :disabled="formLoading">
          <span v-if="formLoading" class="spinner-border spinner-border-sm me-2" />
          {{ editingAppt ? 'Save Changes' : 'Schedule Appointment' }}
        </button>
      </template>
    </AppOffcanvas>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import { useMedicalStore } from '@/stores/medical'
import { useToast } from '@/composables/useToast'
import AppOffcanvas from '@/components/AppOffcanvas.vue'

const store = useMedicalStore()
const { showToast } = useToast()

const tab = ref('medicines')
const formLoading = ref(false)

const editingMed = ref(null)
const editingAppt = ref(null)

const showMedOffcanvas = ref(false)
const showApptOffcanvas = ref(false)

const medForm = reactive({ member_name: '', name: '', dosage: '', frequency: '', start_date: '', end_date: '', is_active: true, notify_on_completion: false })
const apptForm = reactive({ member_name: '', doctor_name: '', specialty: '', date: '', time: '', location: '', notes: '', status: 'scheduled', remind_days_before: 1 })

const medImage = ref(null)
const medImagePreview = ref(null)

function apptStatusBadge(s) {
  const map = { scheduled: 'bg-info bg-opacity-10 text-info', completed: 'bg-success bg-opacity-10 text-success', cancelled: 'bg-danger bg-opacity-10 text-danger' }
  return map[s] ?? 'bg-secondary'
}

function formatDate(d) {
  return d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'
}

// Medicines
function onMedImageChange(e) {
  medImage.value = e.target.files[0] ?? null
  medImagePreview.value = medImage.value ? URL.createObjectURL(medImage.value) : null
}

function openMedModal(med = null) {
  editingMed.value = med
  if (med) {
    Object.assign(medForm, { member_name: med.member_name, name: med.name, dosage: med.dosage ?? '', frequency: med.frequency ?? '', start_date: med.start_date?.substring(0, 10) ?? '', end_date: med.end_date?.substring(0, 10) ?? '', is_active: med.is_active, notify_on_completion: med.notify_on_completion ?? false })
  } else {
    Object.assign(medForm, { member_name: '', name: '', dosage: '', frequency: '', start_date: '', end_date: '', is_active: true, notify_on_completion: false })
  }
  medImage.value = null
  medImagePreview.value = null
  showMedOffcanvas.value = true
}

async function handleMedSubmit() {
  formLoading.value = true
  const fd = new FormData()
  Object.entries(medForm).forEach(([k, v]) => {
    if (v !== '' && v !== null) fd.append(k, typeof v === 'boolean' ? (v ? 1 : 0) : v)
  })
  if (medImage.value) fd.append('image', medImage.value)
  try {
    if (editingMed.value) {
      await store.updateMedicine(editingMed.value.id, fd)
      showToast('Medicine updated!', 'success')
    } else {
      await store.createMedicine(fd)
      showToast('Medicine added!', 'success')
    }
    showMedOffcanvas.value = false
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
    Object.assign(apptForm, { member_name: appt.member_name, doctor_name: appt.doctor_name, specialty: appt.specialty ?? '', date: appt.date?.substring(0, 10) ?? '', time: appt.time ? appt.time.substring(0, 5) : '', location: appt.location ?? '', notes: appt.notes ?? '', status: appt.status, remind_days_before: appt.remind_days_before ?? 1 })
  } else {
    Object.assign(apptForm, { member_name: '', doctor_name: '', specialty: '', date: '', time: '', location: '', notes: '', status: 'scheduled', remind_days_before: 1 })
  }
  showApptOffcanvas.value = true
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
    showApptOffcanvas.value = false
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
  store.fetchMedicines()
  store.fetchAppointments()
})
</script>
