<template>
  <div class="reminders-page">

    <!-- ── Hero Banner ─────────────────────────────────────────────────────── -->
    <div class="reminders-hero mb-4">
      <div class="reminders-hero-bg" />
      <div class="reminders-hero-content">
        <div class="d-flex align-items-center gap-3">
          <div class="hero-icon-wrap">
            <i class="bi bi-bell-fill" />
          </div>
          <div>
            <h3 class="hero-title mb-0">Reminders</h3>
            <p class="hero-sub mb-0">Birthdays, anniversaries &amp; special occasions</p>
          </div>
        </div>
        <button class="btn btn-add-reminder" @click="openModal()">
          <i class="bi bi-plus-lg me-1" /> New Reminder
        </button>
      </div>
    </div>

    <!-- ── Filter Bar ────────────────────────────────────────────────────── -->
    <div class="filter-bar mb-4">
      <div class="filter-group">
        <span class="filter-label">Type</span>
        <div class="seg-control">
          <button
            v-for="opt in typeOptions"
            :key="opt.value"
            class="seg-btn"
            :class="{ active: filters.type === opt.value }"
            @click="setTypeFilter(opt.value)"
          >
            <i :class="opt.icon" />
            {{ opt.label }}
          </button>
        </div>
      </div>
      <div class="filter-group">
        <span class="filter-label">Status</span>
        <div class="seg-control">
          <button class="seg-btn" :class="{ active: filters.is_active === '' }"   @click="setActiveFilter('')">All</button>
          <button class="seg-btn" :class="{ active: filters.is_active === '1' }"  @click="setActiveFilter('1')">
            <i class="bi bi-check-circle me-1" />Active
          </button>
          <button class="seg-btn" :class="{ active: filters.is_active === '0' }"  @click="setActiveFilter('0')">
            <i class="bi bi-dash-circle me-1" />Inactive
          </button>
        </div>
      </div>
      <button v-if="filtersApplied" class="filter-clear-btn" @click="resetFilters">
        <i class="bi bi-x-lg me-1" />Reset
      </button>
    </div>

    <!-- ── Loading ─────────────────────────────────────────────────────────── -->
    <ShimmerLoader v-if="store.loading" variant="table" :count="4" :cols="4" />

    <!-- ── Grouped Timeline ────────────────────────────────────────────────── -->
    <template v-else-if="store.reminders.length">
      <div
        v-for="group in groupedReminders"
        :key="group.label"
        class="reminder-group mb-4"
      >
        <!-- Group header -->
        <div class="group-header mb-3">
          <div class="group-icon-wrap" :class="`gicon-${group.key}`">
            <i :class="group.icon" />
          </div>
          <span class="group-label">{{ group.label }}</span>
          <span class="group-count">{{ group.items.length }}</span>
        </div>

        <!-- Cards grid -->
        <div class="reminder-grid">
          <div
            v-for="r in group.items"
            :key="r.id"
            class="reminder-ticket"
            :class="[`ticket-${r.type}`, { 'ticket-inactive': !r.is_active }]"
          >
            <!-- Ticket notch decoration -->
            <div class="ticket-notch ticket-notch-left" />
            <div class="ticket-notch ticket-notch-right" />

            <!-- Top section -->
            <div class="ticket-top">
              <div class="ticket-type-icon" :class="`type-icon-${r.type}`">
                <i :class="typeIcon(r.type)" />
              </div>
              <div class="ticket-actions">
                <button class="tkt-btn" @click="openModal(r)" title="Edit">
                  <i class="bi bi-pencil" />
                </button>
                <button class="tkt-btn tkt-btn-danger" @click="confirmDelete(r)" title="Delete">
                  <i class="bi bi-trash" />
                </button>
              </div>
            </div>

            <!-- Title + desc -->
            <div class="ticket-body">
              <div class="ticket-title">{{ r.title }}</div>
              <div v-if="r.description" class="ticket-desc">{{ r.description }}</div>
            </div>

            <!-- Divider dashed line -->
            <div class="ticket-dashed" />

            <!-- Bottom meta -->
            <div class="ticket-footer">
              <div class="ticket-date">
                <i class="bi bi-calendar3 me-1" />
                {{ formatDate(r.occasion_date) }}
              </div>
              <div class="ticket-countdown" :class="countdownColorClass(r.days_until)">
                <template v-if="r.days_until === 0">
                  <span class="countdown-num">Today</span>
                </template>
                <template v-else-if="r.days_until === 1">
                  <span class="countdown-num">1</span>
                  <span class="countdown-lbl">day left</span>
                </template>
                <template v-else-if="r.days_until > 0">
                  <span class="countdown-num">{{ r.days_until }}</span>
                  <span class="countdown-lbl">days left</span>
                </template>
                <template v-else>
                  <span class="countdown-num">{{ Math.abs(r.days_until) }}</span>
                  <span class="countdown-lbl">days ago</span>
                </template>
              </div>
            </div>

            <!-- Tag strip -->
            <div class="ticket-tags">
              <span class="tkt-tag" :class="`tag-${r.type}`">
                <i :class="typeIcon(r.type)" />
                {{ typeLabel(r.type) }}
              </span>
              <span v-if="r.recurs_yearly" class="tkt-tag tag-yearly">
                <i class="bi bi-arrow-repeat" />Yearly
              </span>
              <span v-if="!r.is_active" class="tkt-tag tag-inactive">
                <i class="bi bi-dash-circle" />Inactive
              </span>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ── Empty state ─────────────────────────────────────────────────────── -->
    <div v-else class="reminders-empty">
      <div class="empty-bell-wrap">
        <i class="bi bi-bell-slash" />
      </div>
      <h5 class="mt-3 mb-1 fw-bold">No Reminders Yet</h5>
      <p class="text-muted mb-3">Add birthdays, anniversaries &amp; special occasions to never forget a moment.</p>
      <button class="btn btn-add-reminder" @click="openModal()">
        <i class="bi bi-plus-lg me-1" /> Add Your First Reminder
      </button>
    </div>

    <!-- ── Add / Edit Offcanvas ───────────────────────────────────────────── -->
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
import { reactive, ref, computed, onMounted } from 'vue'
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

// ── Static config ─────────────────────────────────────────────────────────────

const typeOptions = [
  { value: '', label: 'All', icon: 'bi bi-grid' },
  { value: 'birthday', label: 'Birthday', icon: 'bi bi-balloon-heart' },
  { value: 'anniversary', label: 'Anniversary', icon: 'bi bi-hearts' },
  { value: 'holiday', label: 'Holiday', icon: 'bi bi-star' },
  { value: 'other', label: 'Other', icon: 'bi bi-bell' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function typeIcon(type) {
  return { birthday: 'bi bi-balloon-heart', anniversary: 'bi bi-hearts', holiday: 'bi bi-star-fill', other: 'bi bi-bell-fill' }[type] ?? 'bi bi-bell-fill'
}

function typeLabel(type) {
  return { birthday: 'Birthday', anniversary: 'Anniversary', holiday: 'Holiday', other: 'Other' }[type] ?? type
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function countdownColorClass(days) {
  if (days === null || days === undefined) return 'cd-muted'
  if (days <= 0) return 'cd-today'
  if (days <= 7) return 'cd-week'
  if (days <= 30) return 'cd-month'
  return 'cd-later'
}

// ── Grouped reminders ─────────────────────────────────────────────────────────

const groupedReminders = computed(() => {
  const items = store.reminders
  const today    = items.filter(r => r.days_until !== null && r.days_until <= 0)
  const thisWeek = items.filter(r => r.days_until > 0 && r.days_until <= 7)
  const thisMonth= items.filter(r => r.days_until > 7 && r.days_until <= 30)
  const later    = items.filter(r => r.days_until === null || r.days_until > 30)
  const groups = []
  if (today.length)     groups.push({ key: 'today',  label: 'Today & Overdue', icon: 'bi bi-alarm-fill',    items: today })
  if (thisWeek.length)  groups.push({ key: 'week',   label: 'This Week',        icon: 'bi bi-lightning-fill', items: thisWeek })
  if (thisMonth.length) groups.push({ key: 'month',  label: 'This Month',       icon: 'bi bi-calendar-event', items: thisMonth })
  if (later.length)     groups.push({ key: 'later',  label: 'Coming Up',        icon: 'bi bi-calendar3',      items: later })
  if (!groups.length && items.length) groups.push({ key: 'all', label: 'All Reminders', icon: 'bi bi-bell', items })
  return groups
})

const filtersApplied = computed(() => filters.type !== '' || filters.is_active !== '')

// ── Filter actions ────────────────────────────────────────────────────────────

function setTypeFilter(val) {
  filters.type = val
  fetchReminders()
}

function setActiveFilter(val) {
  filters.is_active = val
  fetchReminders()
}

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

// ── Offcanvas ─────────────────────────────────────────────────────────────────

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
  fetchReminders()
}

onMounted(() => {
  fetchReminders()
})
</script>

<style scoped>
/* ── Hero Banner ──────────────────────────────────────────────────────────── */
.reminders-hero {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  padding: 28px 28px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%);
  box-shadow: 0 8px 32px rgba(99, 102, 241, 0.30);
}
.reminders-hero-bg {
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(circle at 80% 20%, rgba(255,255,255,0.15) 0%, transparent 50%),
    radial-gradient(circle at 20% 80%, rgba(255,255,255,0.10) 0%, transparent 40%);
  pointer-events: none;
}
.reminders-hero-content {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.hero-icon-wrap {
  width: 52px;
  height: 52px;
  background: rgba(255,255,255,0.22);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.6rem;
  color: #fff;
  flex-shrink: 0;
  backdrop-filter: blur(6px);
  border: 1px solid rgba(255,255,255,0.3);
}
.hero-title {
  font-size: 1.4rem;
  font-weight: 700;
  color: #fff;
  line-height: 1.2;
}
.hero-sub {
  color: rgba(255,255,255,0.80);
  font-size: 0.875rem;
  margin-top: 2px;
}
.btn-add-reminder {
  background: rgba(255,255,255,0.20);
  color: #fff;
  border: 1.5px solid rgba(255,255,255,0.50);
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.875rem;
  padding: 8px 18px;
  backdrop-filter: blur(6px);
  transition: background 0.2s, transform 0.15s;
  white-space: nowrap;
}
.btn-add-reminder:hover {
  background: rgba(255,255,255,0.35);
  color: #fff;
  transform: translateY(-1px);
}

/* ── Filter Bar ──────────────────────────────────────────────────────────── */
.filter-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  background: #fff;
  border: 1px solid #e8edf2;
  border-radius: 12px;
  padding: 12px 16px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}
.filter-group {
  display: flex;
  align-items: center;
  gap: 8px;
}
.filter-label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #94a3b8;
  white-space: nowrap;
}
/* Segmented control */
.seg-control {
  display: inline-flex;
  background: #f1f5f9;
  border-radius: 8px;
  padding: 3px;
  gap: 2px;
}
.seg-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 500;
  border: none;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
  line-height: 1.4;
}
.seg-btn:hover {
  background: #e2e8f0;
  color: #1e293b;
}
.seg-btn.active {
  background: #fff;
  color: #6366f1;
  font-weight: 600;
  box-shadow: 0 1px 4px rgba(0,0,0,0.10);
}
.seg-btn i { font-size: 0.8rem; }
.filter-clear-btn {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 12px;
  border-radius: 7px;
  font-size: 0.8rem;
  font-weight: 500;
  border: 1px solid #fca5a5;
  background: #fff5f5;
  color: #dc2626;
  cursor: pointer;
  transition: all 0.15s;
}
.filter-clear-btn:hover {
  background: #dc2626;
  color: #fff;
  border-color: #dc2626;
}

/* ── Group Headers ────────────────────────────────────────────────────────── */
.group-header {
  display: flex;
  align-items: center;
  gap: 10px;
}
.group-icon-wrap {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.82rem;
  flex-shrink: 0;
}
.gicon-today { background: #dcfce7; color: #16a34a; }
.gicon-week  { background: #fef3c7; color: #d97706; }
.gicon-month { background: #ede9fe; color: #7c3aed; }
.gicon-later { background: #f1f5f9; color: #64748b; }
.gicon-all   { background: #ede9fe; color: #7c3aed; }
.group-label {
  font-size: 0.9rem;
  font-weight: 700;
  color: #1e293b;
  letter-spacing: -0.01em;
}
.group-count {
  background: #f1f5f9;
  color: #64748b;
  font-size: 0.72rem;
  font-weight: 700;
  border-radius: 20px;
  padding: 2px 8px;
  letter-spacing: 0.01em;
}

/* ── Grid ─────────────────────────────────────────────────────────────────── */
.reminder-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 20px;
}

/* ── Ticket Card ──────────────────────────────────────────────────────────── */
.reminder-ticket {
  position: relative;
  background: #fff;
  border-radius: 16px;
  padding: 20px 20px 14px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.07);
  border-top: 4px solid transparent;
  transition: transform 0.18s, box-shadow 0.18s;
  overflow: hidden;
}
.reminder-ticket:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.12);
}
.ticket-inactive {
  opacity: 0.55;
}

/* Per-type accent colours */
.ticket-birthday   { border-top-color: #ec4899; }
.ticket-anniversary{ border-top-color: #8b5cf6; }
.ticket-holiday    { border-top-color: #f59e0b; }
.ticket-other      { border-top-color: #06b6d4; }

/* Ticket punch-hole notches */
.ticket-notch {
  position: absolute;
  bottom: 52px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}
.ticket-notch-left  { left: -8px; }
.ticket-notch-right { right: -8px; }

/* Top row */
.ticket-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 12px;
}
.ticket-type-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  flex-shrink: 0;
}
.type-icon-birthday    { background: #fce7f3; color: #db2777; }
.type-icon-anniversary { background: #ede9fe; color: #7c3aed; }
.type-icon-holiday     { background: #fef9c3; color: #b45309; }
.type-icon-other       { background: #e0f2fe; color: #0284c7; }
.ticket-actions {
  display: flex;
  gap: 6px;
}
.tkt-btn {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.78rem;
  color: #64748b;
  cursor: pointer;
  transition: all 0.15s;
  padding: 0;
}
.tkt-btn:hover       { background: #6366f1; border-color: #6366f1; color: #fff; }
.tkt-btn-danger:hover{ background: #ef4444; border-color: #ef4444; color: #fff; }

/* Body */
.ticket-title {
  font-size: 1rem;
  font-weight: 700;
  color: #1e293b;
  line-height: 1.3;
}
.ticket-desc {
  font-size: 0.8rem;
  color: #94a3b8;
  margin-top: 3px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Dashed separator */
.ticket-dashed {
  border-top: 1.5px dashed #e2e8f0;
  margin: 14px 0 10px;
}

/* Footer: date + countdown */
.ticket-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.ticket-date {
  font-size: 0.78rem;
  color: #64748b;
}
.ticket-countdown {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  line-height: 1.1;
}
.countdown-num {
  font-size: 1.35rem;
  font-weight: 800;
  line-height: 1;
}
.countdown-lbl {
  font-size: 0.65rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: inherit;
  opacity: 0.75;
}
/* Countdown colour states */
.cd-today  { color: #10b981; }
.cd-week   { color: #f59e0b; }
.cd-month  { color: #6366f1; }
.cd-later  { color: #94a3b8; }
.cd-muted  { color: #cbd5e1; }

/* Tags */
.ticket-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}
.tkt-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 6px;
}
.tag-birthday    { background: #fce7f3; color: #be185d; }
.tag-anniversary { background: #ede9fe; color: #7c3aed; }
.tag-holiday     { background: #fef9c3; color: #92400e; }
.tag-other       { background: #e0f2fe; color: #0369a1; }
.tag-yearly      { background: #d1fae5; color: #065f46; }
.tag-inactive    { background: #f1f5f9; color: #64748b; }

/* ── Empty State ──────────────────────────────────────────────────────────── */
.reminders-empty {
  text-align: center;
  padding: 60px 20px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
}
.empty-bell-wrap {
  width: 72px;
  height: 72px;
  background: linear-gradient(135deg, #eef2ff, #ede9fe);
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  color: #6366f1;
}
</style>
