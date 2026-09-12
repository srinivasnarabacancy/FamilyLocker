<template>
  <div>
    <div class="page-header">
      <div>
        <h4 class="page-title">Expenses</h4>
        <p class="page-subtitle">Track and manage family spending</p>
      </div>
      <div class="d-flex gap-2">
        <button class="btn btn-outline-secondary btn-sm" @click="showSummary = !showSummary">
          <i class="bi bi-bar-chart me-2" />{{ showSummary ? 'Hide' : 'Show' }} Summary
        </button>
        <button class="btn btn-primary" @click="openModal()">
          <i class="bi bi-plus-lg me-2" />Add Expense
        </button>
      </div>
    </div>

    <!-- Summary Section -->
    <transition name="slide-up">
      <div v-if="showSummary && summary" class="row g-3 mb-4">
        <div class="col-md-4">
          <div class="fl-card p-4 text-center">
            <div class="text-muted small mb-1">Total This Month</div>
            <div class="fs-3 fw-bold text-primary">₹{{ formatAmount(summary.total_monthly) }}</div>
          </div>
        </div>
        <div class="col-md-8">
          <div class="fl-card p-4">
            <h6 class="fw-bold mb-3">Category Breakdown</h6>
            <div v-if="summary.category_breakdown?.length" style="height:160px">
              <Doughnut :data="categoryChartData" :options="{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }" />
            </div>
            <p v-else class="text-muted text-center small mb-0">No data for selected month</p>
          </div>
        </div>
      </div>
    </transition>

    <!-- Filters -->
    <div class="fl-card p-3 mb-4">
      <div class="row g-2 align-items-end">
        <FormField label="Month" :error="errors.month" field="month" class="col-12 col-sm-6 col-md-3">
          <template #default="{ id }">
            <input :id="id" v-model="filters.month" type="month" class="form-control" @change="fetchAll" />
          </template>
        </FormField>
        <FormField label="Category" :error="errors.category_id" field="category_id" class="col-6 col-md-3">
          <template #default="{ id }">
            <SelectField
              :id="id"
              v-model="filters.category_id"
              @change="fetchExpenses"
              :options="store.categories" value-key="id" label-key="name"
              placeholder="All Categories"
            />
          </template>
        </FormField>
        <div class="col-6 col-md-2">
          <button class="btn btn-outline-secondary w-100" @click="resetFilters">Clear</button>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="fl-card overflow-hidden">
      <ShimmerLoader v-if="store.loading" variant="table" :count="6" :cols="5" />
      <div v-else-if="store.expenses.length" class="table-responsive">
        <table class="table mb-0">
          <thead>
            <tr>
              <th>Date</th>
              <th>Title</th>
              <th>Category</th>
              <th>Payment</th>
              <th class="text-end">Amount</th>
              <th class="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="exp in store.expenses" :key="exp.id">
              <td class="text-nowrap">{{ formatDate(exp.date) }}</td>
              <td>
                <div class="fw-semibold">{{ exp.title }}</div>
                <div v-if="exp.description" class="text-muted small text-truncate" style="max-width:200px">{{ exp.description }}</div>
              </td>
              <td>
                <span v-if="exp.category" class="badge bg-light text-dark">{{ exp.category.name }}</span>
                <span v-else class="text-muted small">—</span>
              </td>
              <td>
                <span class="badge" :class="methodBadge(exp.payment_method)">{{ exp.payment_method }}</span>
              </td>
              <td class="text-end fw-bold">₹{{ formatAmount(exp.amount) }}</td>
              <td class="text-center">
                <button class="btn btn-icon btn-light btn-sm me-1" @click="openModal(exp)">
                  <i class="bi bi-pencil" />
                </button>
                <button class="btn btn-icon btn-light btn-sm text-danger" @click="deleteExpense(exp)">
                  <i class="bi bi-trash" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="empty-state">
        <i class="bi bi-wallet2 empty-icon" />
        <h6 class="empty-title">No Expenses Found</h6>
        <p class="empty-subtitle">Start tracking your family expenses.</p>
        <button class="btn btn-primary" @click="openModal()">
          <i class="bi bi-plus-lg me-2" />Add Expense
        </button>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <div class="modal fade" id="expenseModal" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ editing ? 'Edit' : 'Add' }} Expense</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" />
          </div>
          <div class="modal-body">
            <form id="expForm" novalidate @submit.prevent="handleSubmit">
              <div class="row g-3">
                <FormField label="Title" required :error="errors.title" field="title" class="col-12">
                  <template #default="{ id }">
                    <input :id="id" v-model="form.title" type="text" class="form-control" />
                  </template>
                </FormField>
                <FormField label="Amount (₹)" required :error="errors.amount" field="amount" class="col-md-6">
                  <template #default="{ id }">
                    <input :id="id" v-model="form.amount" type="number" step="0.01" class="form-control" />
                  </template>
                </FormField>
                <FormField label="Date" required :error="errors.date" field="date" class="col-md-6">
                  <template #default="{ id }">
                    <input :id="id" v-model="form.date" type="date" class="form-control" />
                  </template>
                </FormField>
                <FormField label="Category" :error="errors.category_id" field="category_id" class="col-md-6">
                  <template #default="{ id }">
                    <SelectField
                      :id="id"
                      v-model="form.category_id"
                      :options="store.categories" value-key="id" label-key="name"
                      placeholder="None"
                    />
                  </template>
                </FormField>
                <FormField label="Payment Method" :error="errors.payment_method" field="payment_method" class="col-md-6">
                  <template #default="{ id }">
                    <SelectField
                      :id="id"
                      v-model="form.payment_method"
                      :options="[{ value: 'cash', label: 'Cash' }, { value: 'card', label: 'Card' }, { value: 'upi', label: 'UPI' }, { value: 'net_banking', label: 'Net Banking' }]"
                    />
                  </template>
                </FormField>
                <FormField label="Description" :error="errors.description" field="description" class="col-12">
                  <template #default="{ id }">
                    <textarea :id="id" v-model="form.description" rows="2" class="form-control" />
                  </template>
                </FormField>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-light" data-bs-dismiss="modal">Cancel</button>
            <button type="submit" form="expForm" class="btn btn-primary" :disabled="formLoading">
              <span v-if="formLoading" class="spinner-border spinner-border-sm me-2" />
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

    <!-- Shared confirmation modal — see components/ConfirmModal.vue -->
    <ConfirmModal
      v-model="showDeleteModal"
      :title="`Delete ${expenseToDelete?.title}?`"
      message="This expense will be permanently deleted and cannot be recovered."
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
import { Modal } from 'bootstrap'
import { Doughnut } from 'vue-chartjs'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { useExpenseStore } from '@/stores/expenses'
import { useToast } from '@/composables/useToast'
import ShimmerLoader from '@/components/ShimmerLoader.vue'
import ConfirmModal from '@/components/ConfirmModal.vue'
import FormField from '@/components/FormField.vue'
import SelectField from '@/components/SelectField.vue'
import { useFormErrors } from '@/composables/useFormErrors'

ChartJS.register(ArcElement, Tooltip, Legend)

const store = useExpenseStore()
const { showToast } = useToast()
const { errors, clear: clearErrors, capture: captureErrors, clearField } = useFormErrors()
// FormField clears its own message as the user edits.
provide('clearFormField', clearField)
let modalInstance = null

const showSummary = ref(true)
const filters = reactive({ month: new Date().toISOString().substring(0, 7), category_id: '' })
const form = reactive({ title: '', amount: '', date: new Date().toISOString().substring(0, 10), category_id: '', payment_method: 'cash', description: '' })
const editing = ref(null)
const formLoading = ref(false)
const summary = computed(() => store.summary)

const categoryChartData = computed(() => {
  const breakdown = summary.value?.category_breakdown ?? []
  return {
    labels: breakdown.map((b) => b.category?.name ?? 'Uncategorized'),
    datasets: [{
      data: breakdown.map((b) => parseFloat(b.total)),
      backgroundColor: ['#6C5CE7','#00b894','#fdcb6e','#d63031','#0984e3','#e17055','#a29bfe','#74b9ff'],
    }],
  }
})

function formatDate(d) {
  return d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'
}

function formatAmount(v) {
  return Number(v ?? 0).toLocaleString('en-IN')
}

function methodBadge(m) {
  const map = { cash: 'bg-success bg-opacity-10 text-success', card: 'bg-primary bg-opacity-10 text-primary', upi: 'bg-warning bg-opacity-10 text-warning', net_banking: 'bg-info bg-opacity-10 text-info' }
  return map[m] ?? 'bg-secondary bg-opacity-10 text-secondary'
}

function resetFilters() {
  filters.month = new Date().toISOString().substring(0, 7)
  filters.category_id = ''
  fetchAll()
}

async function fetchAll() {
  await Promise.all([fetchExpenses(), store.fetchSummary(filters.month)])
}

async function fetchExpenses() {
  const params = {}
  if (filters.month) params.month = filters.month
  if (filters.category_id) params.category_id = filters.category_id
  await store.fetchExpenses(params)
}

function openModal(exp = null) {
  clearErrors()
  editing.value = exp
  if (exp) {
    Object.assign(form, {
      title: exp.title, amount: exp.amount, date: exp.date?.substring(0, 10),
      category_id: exp.category_id ?? '', payment_method: exp.payment_method, description: exp.description ?? '',
    })
  } else {
    Object.assign(form, { title: '', amount: '', date: new Date().toISOString().substring(0, 10), category_id: '', payment_method: 'cash', description: '' })
  }
  modalInstance?.show()
}

async function handleSubmit() {
  clearErrors()
  formLoading.value = true
  try {
    if (editing.value) {
      await store.updateExpense(editing.value.id, form)
      showToast('Expense updated!', 'success')
    } else {
      await store.createExpense(form)
      showToast('Expense added!', 'success')
    }
    modalInstance?.hide()
    fetchAll()
  } catch (err) {
    // 422 means per-field messages; anything else is a real failure.
    if (!captureErrors(err)) showToast(err.response?.data?.message ?? 'Error', 'danger')
  } finally {
    formLoading.value = false
  }
}

const showDeleteModal = ref(false)
const expToDelete = ref(null)
const deleting = ref(false)

async function deleteExpense(exp) {
  expToDelete.value = exp
  showDeleteModal.value = true
}

async function handleConfirmDelete() {
  if (!expToDelete.value) return

  deleting.value = true
  try {
    await store.deleteExpense(target.value.id)
    showToast('Expense deleted', 'success')
    showDeleteModal.value = false
  fetchAll()
  } catch {
    showToast('Failed to delete', 'danger')
  } finally {
    deleting.value = false
  }
}

onMounted(async () => {
  await store.fetchCategories()
  fetchAll()
  modalInstance = new Modal(document.getElementById('expenseModal'))
})
</script>
