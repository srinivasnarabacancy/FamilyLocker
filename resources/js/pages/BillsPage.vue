<template>
  <div>
    <div class="page-header">
      <div>
        <h4 class="page-title">Bills</h4>
        <p class="page-subtitle">Track household bills and due dates</p>
      </div>
      <button class="btn btn-primary" @click="openModal()">
        <i class="bi bi-plus-lg me-2" />Add Bill
      </button>
    </div>

    <!-- Filter Tabs -->
    <div class="d-flex gap-2 mb-4 flex-wrap">
      <button
        v-for="f in statusFilters"
        :key="f.value"
        class="btn btn-sm"
        :class="activeFilter === f.value ? 'btn-primary' : 'btn-outline-secondary'"
        @click="setFilter(f.value)"
      >
        {{ f.label }}
        <span v-if="f.count" class="badge ms-1 rounded-pill bg-white text-primary">{{ f.count }}</span>
      </button>
    </div>

    <ShimmerLoader v-if="store.loading" variant="cards" col-class="col-12 col-sm-6 col-lg-4" :count="6" />

    <div v-else-if="store.bills.length" class="row g-3">
      <div
        v-for="bill in store.bills"
        :key="bill.id"
        class="col-12 col-sm-6 col-lg-4"
      >
        <div class="fl-card p-3 h-100">
          <div class="d-flex align-items-start justify-content-between mb-3">
            <div class="d-flex align-items-center gap-2">
              <div
                class="rounded-2 d-flex align-items-center justify-content-center"
                :style="`width:40px;height:40px;background:${catColor(bill.category)}20`"
              >
                <i :class="`bi ${catIcon(bill.category)}`" :style="`color:${catColor(bill.category)}`" />
              </div>
              <div>
                <div class="fw-bold small">{{ bill.name }}</div>
                <div class="text-muted small text-capitalize">{{ bill.category }}</div>
              </div>
            </div>
            <div class="dropdown">
              <button class="btn btn-icon btn-light btn-sm" data-bs-toggle="dropdown">
                <i class="bi bi-three-dots-vertical" />
              </button>
              <ul class="dropdown-menu dropdown-menu-end">
                <li v-if="bill.status !== 'paid'"><a class="dropdown-item text-success" href="#" @click.prevent="markPaid(bill)"><i class="bi bi-check-circle me-2" />Mark Paid</a></li>
                <li><a class="dropdown-item" href="#" @click.prevent="openModal(bill)"><i class="bi bi-pencil me-2" />Edit</a></li>
                <li><a class="dropdown-item text-danger" href="#" @click.prevent="deleteBill(bill)"><i class="bi bi-trash me-2" />Delete</a></li>
              </ul>
            </div>
          </div>

          <div class="d-flex align-items-center justify-content-between mb-2">
            <div class="fs-5 fw-bold">₹{{ formatAmount(bill.amount) }}</div>
            <span :class="`badge status-${bill.status}`">{{ bill.status }}</span>
          </div>

          <div class="small text-muted">
            <div><i class="bi bi-calendar3 me-1" />Due: {{ formatDate(bill.due_date) }}</div>
            <div v-if="bill.paid_date"><i class="bi bi-check-circle me-1 text-success" />Paid: {{ formatDate(bill.paid_date) }}</div>
            <div v-if="bill.is_recurring" class="text-primary">
              <i class="bi bi-arrow-repeat me-1" />Recurring: {{ bill.recurring_period }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="fl-card">
      <div class="empty-state">
        <i class="bi bi-receipt empty-icon" />
        <h6 class="empty-title">No Bills Found</h6>
        <p class="empty-subtitle">Start tracking your household bills.</p>
        <button class="btn btn-primary" @click="openModal()"><i class="bi bi-plus-lg me-2" />Add Bill</button>
      </div>
    </div>

    <!-- Add/Edit Bill — shared offcanvas, matching Documents -->
    <AppOffcanvas
      v-model="showBillOffcanvas"
      :title="editing ? 'Edit Bill' : 'Add Bill'"
      :subtitle="editing ? 'Update the bill details.' : 'Fill in the bill details below.'"
      :icon="editing ? 'bi bi-pencil-square' : 'bi bi-receipt'"
    >
      <form id="billForm" novalidate @submit.prevent="handleSubmit">
        <div class="row g-3">
          <FormField label="Bill Name" required :error="errors.name" field="name" class="col-md-6">
            <template #default="{ id }">
              <input :id="id" v-model="form.name" type="text" class="form-control" />
            </template>
          </FormField>
          <FormField label="Category" required :error="errors.category" field="category" class="col-md-6">
            <template #default="{ id }">
              <SelectField
                :id="id"
                v-model="form.category"
                :options="billCategories"
                placeholder="Select"
              />
            </template>
          </FormField>
          <FormField label="Amount (₹)" required :error="errors.amount" field="amount" class="col-md-6">
            <template #default="{ id }">
              <input :id="id" v-model="form.amount" type="number" step="0.01" class="form-control" />
            </template>
          </FormField>
          <FormField label="Due Date" required :error="errors.due_date" field="due_date" class="col-md-6">
            <template #default="{ id }">
              <input :id="id" v-model="form.due_date" type="date" class="form-control" />
            </template>
          </FormField>
          <FormField label="Provider" :error="errors.provider" field="provider" class="col-md-6">
            <template #default="{ id }">
              <input :id="id" v-model="form.provider" type="text" class="form-control" placeholder="e.g. BSES, Jio" />
            </template>
          </FormField>
          <div class="col-md-6 d-flex align-items-center">
            <div class="form-check form-switch mt-3">
              <input v-model="form.is_recurring" class="form-check-input" type="checkbox" id="recurringToggle" />
              <label class="form-check-label" for="recurringToggle">Recurring Bill</label>
            </div>
          </div>
          <FormField required
            v-if="form.is_recurring"
            label="Recurring Period"
            :error="errors.recurring_period" field="recurring_period"
            class="col-12"
          >
            <template #default="{ id }">
              <SelectField
                :id="id"
                v-model="form.recurring_period"
                :options="[{ value: 'monthly', label: 'Monthly' }, { value: 'quarterly', label: 'Quarterly' }, { value: 'yearly', label: 'Yearly' }]"
              />
            </template>
          </FormField>
          <FormField label="Notes" :error="errors.notes" field="notes" class="col-12">
            <template #default="{ id }">
              <textarea :id="id" v-model="form.notes" rows="2" class="form-control" />
            </template>
          </FormField>
        </div>
      </form>

      <!-- Single action, matching Documents. The offcanvas header already has
           a close button, so a separate Cancel is redundant. -->
      <template #footer>
        <button type="submit" form="billForm" class="btn btn-primary" :disabled="formLoading">
          <span v-if="formLoading" class="spinner-border spinner-border-sm me-2" />
          {{ editing ? 'Update Bill' : 'Add Bill' }}
        </button>
      </template>
    </AppOffcanvas>
  </div>

    <!-- Shared confirmation modal — see components/ConfirmModal.vue -->
    <ConfirmModal
      v-model="showDeleteModal"
      :title="`Delete ${billToDelete?.name}?`"
      message="This bill will be permanently deleted and cannot be recovered."
      confirm-text="Delete"
      cancel-text="Cancel"
      icon="bi bi-trash"
      variant="danger"
      :loading="deleting"
      @confirm="handleConfirmDelete"
    />
</template>

<script setup>
import { reactive, ref, computed, onMounted, provide} from 'vue'
import { useBillStore } from '@/stores/bills'
import { useToast } from '@/composables/useToast'
import ShimmerLoader from '@/components/ShimmerLoader.vue'
import ConfirmModal from '@/components/ConfirmModal.vue'
import AppOffcanvas from '@/components/AppOffcanvas.vue'
import FormField from '@/components/FormField.vue'
import SelectField from '@/components/SelectField.vue'
import { useFormErrors } from '@/composables/useFormErrors'

const store = useBillStore()
const { showToast } = useToast()
const { errors, clear: clearErrors, capture: captureErrors, clearField } = useFormErrors()
// FormField clears its own message as the user edits.
provide('clearFormField', clearField)
const showBillOffcanvas = ref(false)

const activeFilter = ref('')
const form = reactive({ name: '', category: '', amount: '', due_date: '', provider: '', is_recurring: false, recurring_period: 'monthly', notes: '' })
const editing = ref(null)
const formLoading = ref(false)

const billCategories = [
  { value: 'electricity', label: 'Electricity' },
  { value: 'water', label: 'Water' },
  { value: 'gas', label: 'Gas' },
  { value: 'internet', label: 'Internet' },
  { value: 'phone', label: 'Phone' },
  { value: 'rent', label: 'Rent' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'subscription', label: 'Subscription' },
  { value: 'other', label: 'Other' },
]

const catIcons = { electricity: 'bi-lightning', water: 'bi-droplet', gas: 'bi-fire', internet: 'bi-wifi', phone: 'bi-phone', rent: 'bi-house', insurance: 'bi-shield', subscription: 'bi-star', other: 'bi-receipt' }
const catColors = { electricity: '#fdcb6e', water: '#74b9ff', gas: '#e17055', internet: '#6C5CE7', phone: '#00b894', rent: '#a29bfe', insurance: '#00cec9', subscription: '#fd79a8', other: '#b2bec3' }

function catIcon(c) { return catIcons[c] ?? 'bi-receipt' }
function catColor(c) { return catColors[c] ?? '#6C5CE7' }

const statusFilters = computed(() => [
  { value: '', label: 'All', count: null },
  { value: 'pending', label: 'Pending', count: store.bills.filter((b) => b.status === 'pending').length || null },
  { value: 'overdue', label: 'Overdue', count: store.bills.filter((b) => b.status === 'overdue').length || null },
  { value: 'paid', label: 'Paid', count: null },
])

function setFilter(f) {
  activeFilter.value = f
  store.fetchBills(f ? { status: f } : {})
}

function formatDate(d) {
  return d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'
}

function formatAmount(v) {
  return Number(v ?? 0).toLocaleString('en-IN')
}

function openModal(bill = null) {
  clearErrors()
  editing.value = bill
  if (bill) {
    Object.assign(form, { name: bill.name, category: bill.category, amount: bill.amount, due_date: bill.due_date?.substring(0, 10), provider: bill.provider ?? '', is_recurring: bill.is_recurring, recurring_period: bill.recurring_period ?? 'monthly', notes: bill.notes ?? '' })
  } else {
    Object.assign(form, { name: '', category: '', amount: '', due_date: '', provider: '', is_recurring: false, recurring_period: 'monthly', notes: '' })
  }
  showBillOffcanvas.value = true
}

async function handleSubmit() {
  clearErrors()
  formLoading.value = true
  try {
    if (editing.value) {
      await store.updateBill(editing.value.id, form)
      showToast('Bill updated!', 'success')
    } else {
      await store.createBill(form)
      showToast('Bill added!', 'success')
    }
    showBillOffcanvas.value = false
    store.fetchBills()
  } catch (err) {
    // 422 means per-field messages; anything else is a real failure.
    if (!captureErrors(err)) showToast(err.response?.data?.message ?? 'Error', 'danger')
  } finally {
    formLoading.value = false
  }
}

async function markPaid(bill) {
  await store.markPaid(bill.id)
  showToast('Bill marked as paid!', 'success')
  store.fetchBills()
}

const showDeleteModal = ref(false)
const billToDelete = ref(null)
const deleting = ref(false)

async function deleteBill(bill) {
  billToDelete.value = bill
  showDeleteModal.value = true
}

async function handleConfirmDelete() {
  if (!billToDelete.value) return

  deleting.value = true
  try {
    await store.deleteBill(target.value.id)
    showToast('Bill deleted', 'success')
    showDeleteModal.value = false
  } catch {
    showToast('Failed to delete', 'danger')
  } finally {
    deleting.value = false
  }
}

onMounted(() => {
  store.fetchBills()
})
</script>
