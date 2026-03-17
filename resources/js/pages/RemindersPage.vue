<template>
  <div>
    <div class="page-header">
      <div>
        <h4 class="page-title">Reminders</h4>
        <p class="page-subtitle">Birthdays, anniversaries &amp; special occasions</p>
      </div>
      <button class="btn btn-primary" @click="openModal()">
        <i class="bi bi-plus-lg me-2" />New Reminder
      </button>
    </div>

    <!-- Filter Row -->
    <div class="fl-card p-3 mb-4">
      <div class="row g-2">
        <div class="col-6 col-md-3">
          <select v-model="filters.type" class="form-select" @change="fetchReminders">
            <option value="">All Types</option>
            <option value="birthday">Birthday</option>
            <option value="anniversary">Anniversary</option>
            <option value="holiday">Holiday</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div class="col-6 col-md-3">
          <select v-model="filters.is_active" class="form-select" @change="fetchReminders">
            <option value="">All</option>
            <option value="1">Active</option>
            <option value="0">Inactive</option>
          </select>
        </div>
        <div class="col-6 col-md-2">
          <button class="btn btn-outline-secondary w-100" @click="resetFilters">Clear</button>
        </div>
      </div>
    </div>

    <ShimmerLoader v-if="store.loading" variant="table" :count="5" :cols="5" />

    <template v-else-if="store.reminders.length">
      <!-- Table – desktop -->
      <div class="fl-card overflow-hidden d-none d-lg-block">
        <div class="table-responsive">
          <table class="table mb-0">
            <thead>
              <tr>
                <th>Reminder</th>
                <th>Type</th>
                <th>Date</th>
                <th>Next Occurrence</th>
                <th>Countdown</th>
                <th>Recurs</th>
                <th>Status</th>
                <th class="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in store.reminders" :key="r.id">
                <td>
                  <div class="fw-semibold">{{ r.title }}</div>
                  <div v-if="r.description" class="text-muted small text-truncate" style="max-width:220px">{{ r.description }}</div>
                </td>
                <td>
                  <span :class="`badge reminder-type-${r.type}`">
                    <i :class="`bi ${typeIcon(r.type)} me-1`" />{{ typeLabel(r.type) }}
                  </span>
                </td>
                <td class="small">{{ formatDate(r.occasion_date) }}</td>
                <td class="small">{{ formatDate(r.next_occurrence) }}</td>
                <td>
                  <span :class="countdownClass(r.days_until)" class="small fw-semibold">
                    {{ countdownLabel(r.days_until) }}
                  </span>
                </td>
                <td>
                  <i :class="r.recurs_yearly ? 'bi bi-arrow-repeat text-success' : 'bi bi-dash text-muted'" />
                </td>
                <td>
                  <span :class="r.is_active ? 'badge bg-success-subtle text-success' : 'badge bg-secondary-subtle text-secondary'">
                    {{ r.is_active ? 'Active' : 'Inactive' }}
                  </span>
                </td>
                <td class="text-center">
                  <button class="btn btn-icon btn-light btn-sm me-1" @click="openModal(r)"><i class="bi bi-pencil" /></button>
                  <button class="btn btn-icon btn-light btn-sm text-danger" @click="confirmDelete(r)"><i class="bi bi-trash" /></button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Cards – mobile -->
      <div class="d-lg-none">
        <div v-for="r in store.reminders" :key="r.id" class="fl-card p-3 mb-3">
          <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
            <div>
              <div class="fw-semibold">{{ r.title }}</div>
              <div v-if="r.description" class="text-muted small text-truncate">{{ r.description }}</div>
            </div>
            <div class="d-flex gap-1 flex-shrink-0">
              <button class="btn btn-icon btn-light btn-sm" @click="openModal(r)"><i class="bi bi-pencil" /></button>
              <button class="btn btn-icon btn-light btn-sm text-danger" @click="confirmDelete(r)"><i class="bi bi-trash" /></button>
            </div>
          </div>
          <div class="d-flex flex-wrap gap-2 align-items-center">
            <span :class="`badge reminder-type-${r.type}`">
              <i :class="`bi ${typeIcon(r.type)} me-1`" />{{ typeLabel(r.type) }}
            </span>
            <span class="small text-muted"><i class="bi bi-calendar3 me-1" />{{ formatDate(r.occasion_date) }}</span>
            <span :class="countdownClass(r.days_until)" class="small fw-semibold">
              {{ countdownLabel(r.days_until) }}
            </span>
            <span v-if="r.recurs_yearly" class="badge bg-info-subtle text-info"><i class="bi bi-arrow-repeat me-1" />Yearly</span>
          </div>
        </div>
      </div>
    </template>

    <div v-else class="fl-card">
      <div class="empty-state">
        <i class="bi bi-bell empty-icon" />
        <h6 class="empty-title">No Reminders Yet</h6>
        <p class="empty-subtitle">Add birthdays, anniversaries and other special occasions.</p>
        <button class="btn btn-primary" @click="openModal()"><i class="bi bi-plus-lg me-2" />Add Reminder</button>
      </div>
    </div>

    <!-- Add / Edit Offcanvas -->
    <AppOffcanvas
      v-model="showOffcanvas"
      :title="editing ? 'Edit Reminder' : 'New Reminder'"
      :subtitle="editing ? 'Update the reminder details.' : 'Add a birthday, anniversary or special occasion.'"
      icon="bi bi-bell"
    >
      <form id="reminderForm" @submit.prevent="handleSubmit">
        <div class="row g-3">
          <div class="col-12">
            <label class="form-label fw-semibold">Title <span class="text-danger">*</span></label>
            <input v-model="form.title" type="text" class="form-control" placeholder="e.g. Mom's Birthday" required />
          </div>
          <div class="col-12 col-md-6">
            <label class="form-label fw-semibold">Type</label>
            <select v-model="form.type" class="form-select">
              <option value="birthday">🎂 Birthday</option>
              <option value="anniversary">💞 Anniversary</option>
              <option value="holiday">⭐ Holiday</option>
              <option value="other">🔔 Other</option>
            </select>
          </div>
          <div class="col-12 col-md-6">
            <label class="form-label fw-semibold">Occasion Date <span class="text-danger">*</span></label>
            <input v-model="form.occasion_date" type="date" class="form-control" required />
          </div>
          <div class="col-12 col-md-6">
            <label class="form-label fw-semibold">Remind Days Before</label>
            <input v-model.number="form.remind_days_before" type="number" min="0" max="365" class="form-control" />
            <div class="form-text">Alert this many days ahead.</div>
          </div>
          <div class="col-12 col-md-6 d-flex align-items-start pt-4 mt-1">
            <div class="form-check form-switch">
              <input v-model="form.recurs_yearly" class="form-check-input" type="checkbox" id="recurYearly" />
              <label class="form-check-label fw-semibold" for="recurYearly">Recurs Yearly</label>
            </div>
          </div>
          <div class="col-12">
            <label class="form-label fw-semibold">Description</label>
            <textarea v-model="form.description" rows="3" class="form-control" placeholder="Optional notes…" />
          </div>
          <div class="col-12">
            <div class="form-check form-switch">
              <input v-model="form.is_active" class="form-check-input" type="checkbox" id="isActive" />
              <label class="form-check-label fw-semibold" for="isActive">Active</label>
            </div>
          </div>
        </div>
      </form>

      <template #footer>
        <button type="button" class="btn btn-light" @click="showOffcanvas = false">Cancel</button>
        <button type="submit" form="reminderForm" class="btn btn-primary" :disabled="formLoading">
          <span v-if="formLoading" class="spinner-border spinner-border-sm me-2" />
          {{ editing ? 'Save Changes' : 'Add Reminder' }}
        </button>
      </template>
    </AppOffcanvas>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import { useReminderStore } from '@/stores/reminders'
import { useToast } from '@/composables/useToast'
import ShimmerLoader from '@/components/ShimmerLoader.vue'
import AppOffcanvas from '@/components/AppOffcanvas.vue'

const store = useReminderStore()
const { showToast } = useToast()

const filters = reactive({ type: '', is_active: '' })
const form = reactive({
  title: '',
  type: 'birthday',
  occasion_date: '',
  recurs_yearly: true,
  remind_days_before: 7,
  description: '',
  is_active: true,
})
const editing = ref(null)
const formLoading = ref(false)
const showOffcanvas = ref(false)

// ── Helpers ───────────────────────────────────────────────────────────────────

function typeIcon(type) {
  return { birthday: 'bi-balloon-heart', anniversary: 'bi-hearts', holiday: 'bi-star', other: 'bi-bell' }[type] ?? 'bi-bell'
}

function typeLabel(type) {
  return { birthday: 'Birthday', anniversary: 'Anniversary', holiday: 'Holiday', other: 'Other' }[type] ?? type
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function countdownLabel(days) {
  if (days === null || days === undefined) return '—'
  if (days === 0) return 'Today! 🎉'
  if (days === 1) return 'Tomorrow!'
  if (days < 0) return `${Math.abs(days)}d ago`
  return `In ${days} days`
}

function countdownClass(days) {
  if (days === null || days === undefined) return 'text-muted'
  if (days <= 0) return 'text-success'
  if (days <= 7) return 'text-warning'
  if (days <= 30) return 'text-primary'
  return 'text-muted'
}

// ── Data fetching ─────────────────────────────────────────────────────────────

function resetFilters() {
  Object.assign(filters, { type: '', is_active: '' })
  fetchReminders()
}

async function fetchReminders() {
  const params = {}
  if (filters.type) params.type = filters.type
  if (filters.is_active !== '') params.is_active = filters.is_active
  await store.fetchReminders(params)
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function openModal(reminder = null) {
  editing.value = reminder
  if (reminder) {
    Object.assign(form, {
      title: reminder.title,
      type: reminder.type,
      occasion_date: reminder.occasion_date?.substring(0, 10) ?? '',
      recurs_yearly: reminder.recurs_yearly,
      remind_days_before: reminder.remind_days_before,
      description: reminder.description ?? '',
      is_active: reminder.is_active,
    })
  } else {
    Object.assign(form, {
      title: '',
      type: 'birthday',
      occasion_date: '',
      recurs_yearly: true,
      remind_days_before: 7,
      description: '',
      is_active: true,
    })
  }
  showOffcanvas.value = true
}

async function handleSubmit() {
  formLoading.value = true
  try {
    if (editing.value) {
      await store.updateReminder(editing.value.id, { ...form })
      showToast('Reminder updated!', 'success')
    } else {
      await store.createReminder({ ...form })
      showToast('Reminder added!', 'success')
    }
    showOffcanvas.value = false
    fetchReminders()
  } catch (err) {
    showToast(err.response?.data?.message ?? 'Error saving reminder', 'danger')
  } finally {
    formLoading.value = false
  }
}

async function confirmDelete(reminder) {
  if (!confirm(`Delete reminder "${reminder.title}"?`)) return
  await store.deleteReminder(reminder.id)
  showToast('Reminder deleted', 'success')
}

onMounted(() => {
  fetchReminders()
  modalInstance = new Modal(document.getElementById('reminderModal'))
})
</script>

<style scoped>
.badge.reminder-type-birthday   { background: #fce7f3; color: #be185d; }
.badge.reminder-type-anniversary { background: #ede9fe; color: #7c3aed; }
.badge.reminder-type-holiday    { background: #fef9c3; color: #92400e; }
.badge.reminder-type-other      { background: #f1f5f9; color: #475569; }
</style>
