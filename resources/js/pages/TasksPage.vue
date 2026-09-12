<template>
  <div>
    <div class="page-header">
      <div>
        <h4 class="page-title">Tasks</h4>
        <p class="page-subtitle">Family task management</p>
      </div>
      <button class="btn btn-primary" @click="openModal()">
        <i class="bi bi-plus-lg me-2" />New Task
      </button>
    </div>

    <!-- Filter Row -->
    <div class="fl-card p-3 mb-4">
      <div class="row g-2">
        <div class="col-6 col-md-3">
          <SelectField
            v-model="filters.status"
            @change="fetchTasks"
            :options="[{ value: 'pending', label: 'Pending' }, { value: 'in_progress', label: 'In Progress' }, { value: 'completed', label: 'Completed' }, { value: 'cancelled', label: 'Cancelled' }]"
            placeholder="All Status"
          />
        </div>
        <div class="col-6 col-md-3">
          <SelectField
            v-model="filters.priority"
            @change="fetchTasks"
            :options="[{ value: 'urgent', label: 'Urgent' }, { value: 'high', label: 'High' }, { value: 'medium', label: 'Medium' }, { value: 'low', label: 'Low' }]"
            placeholder="All Priority"
          />
        </div>
        <div class="col-6 col-md-2">
          <div class="form-check form-switch d-flex align-items-center h-100">
            <input v-model="filters.my_tasks" class="form-check-input" type="checkbox" id="myTasks" @change="fetchTasks" />
            <label class="form-check-label ms-2" for="myTasks">My Tasks</label>
          </div>
        </div>
        <div class="col-6 col-md-2">
          <button class="btn btn-outline-secondary w-100" @click="resetFilters">Clear</button>
        </div>
      </div>
    </div>

    <!-- Kanban-style columns for mobile -->
    <ShimmerLoader v-if="store.loading" variant="table" :count="6" :cols="5" />

    <div v-else-if="store.tasks.length">
      <!-- Table view for larger screens -->
      <div class="fl-card overflow-hidden d-none d-lg-block">
        <div class="table-responsive">
          <table class="table mb-0">
            <thead>
              <tr>
                <th style="width:40px" />
                <th>Task</th>
                <th>Priority</th>
                <th>Assigned To</th>
                <th>Due Date</th>
                <th>Status</th>
                <th class="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="task in store.tasks"
                :key="task.id"
                :class="{ 'opacity-50': task.status === 'completed' }"
              >
                <td>
                  <input
                    type="checkbox"
                    class="form-check-input"
                    :checked="task.status === 'completed'"
                    @change="toggleComplete(task)"
                  />
                </td>
                <td>
                  <div class="fw-semibold" :class="{ 'text-decoration-line-through': task.status === 'completed' }">
                    {{ task.title }}
                  </div>
                  <div v-if="task.description" class="text-muted small text-truncate" style="max-width:250px">{{ task.description }}</div>
                </td>
                <td><span :class="`badge priority-${task.priority}`">{{ task.priority }}</span></td>
                <td>{{ task.assignee?.name ?? 'Unassigned' }}</td>
                <td>
                  <span :class="dueDateClass(task.due_date)" class="small">
                    {{ task.due_date ? formatDate(task.due_date) : '—' }}
                  </span>
                </td>
                <td>
                  <SelectField
                    :model-value="task.status"
                    :options="taskStatuses"
                    style="width:150px"
                    @change="(value) => updateStatus(task, value)"
                  />
                </td>
                <td class="text-center">
                  <button class="btn btn-icon btn-light btn-sm me-1" @click="openModal(task)"><i class="bi bi-pencil" /></button>
                  <button class="btn btn-icon btn-light btn-sm text-danger" @click="deleteTask(task)"><i class="bi bi-trash" /></button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Card view for mobile -->
      <div class="d-lg-none">
        <div
          v-for="task in store.tasks"
          :key="task.id"
          class="fl-card p-3 mb-3"
        >
          <div class="d-flex align-items-start gap-3">
            <input
              type="checkbox"
              class="form-check-input mt-1"
              :checked="task.status === 'completed'"
              @change="toggleComplete(task)"
            />
            <div class="flex-grow-1">
              <div class="d-flex justify-content-between align-items-start gap-2 mb-1">
                <h6
                  class="fw-semibold mb-0"
                  :class="{ 'text-decoration-line-through text-muted': task.status === 'completed' }"
                >
                  {{ task.title }}
                </h6>
                <div class="d-flex gap-1">
                  <button class="btn btn-icon btn-light btn-sm" @click="openModal(task)"><i class="bi bi-pencil" /></button>
                  <button class="btn btn-icon btn-light btn-sm text-danger" @click="deleteTask(task)"><i class="bi bi-trash" /></button>
                </div>
              </div>
              <div class="d-flex flex-wrap gap-2 align-items-center">
                <span :class="`badge priority-${task.priority}`">{{ task.priority }}</span>
                <span :class="`badge status-${task.status}`">{{ task.status.replace('_', ' ') }}</span>
                <span v-if="task.due_date" class="small" :class="dueDateClass(task.due_date)">
                  <i class="bi bi-calendar3 me-1" />{{ formatDate(task.due_date) }}
                </span>
                <span v-if="task.assignee" class="small text-muted">
                  <i class="bi bi-person me-1" />{{ task.assignee.name }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="fl-card">
      <div class="empty-state">
        <i class="bi bi-check2-square empty-icon" />
        <h6 class="empty-title">No Tasks Found</h6>
        <p class="empty-subtitle">Create tasks for your family members.</p>
        <button class="btn btn-primary" @click="openModal()"><i class="bi bi-plus-lg me-2" />Create Task</button>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <div class="modal fade" id="taskModal" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ editing ? 'Edit' : 'New' }} Task</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" />
          </div>
          <div class="modal-body">
            <form id="taskForm" novalidate @submit.prevent="handleSubmit">
              <div class="row g-3">
                <FormField label="Task Title" required :error="errors.title" field="title" class="col-12">
                  <template #default="{ id }">
                    <input :id="id" v-model="form.title" type="text" class="form-control" />
                  </template>
                </FormField>
                <FormField label="Priority" :error="errors.priority" field="priority" class="col-md-6">
                  <template #default="{ id }">
                    <SelectField
                      :id="id"
                      v-model="form.priority"
                      :options="[{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }, { value: 'urgent', label: 'Urgent' }]"
                    />
                  </template>
                </FormField>
                <FormField label="Due Date" :error="errors.due_date" field="due_date" class="col-md-6">
                  <template #default="{ id }">
                    <input :id="id" v-model="form.due_date" type="date" class="form-control" />
                  </template>
                </FormField>
                <FormField label="Assign To" :error="errors.assigned_to" field="assigned_to" class="col-md-6">
                  <template #default="{ id }">
                    <SelectField
                      :id="id"
                      v-model="form.assigned_to"
                      :options="familyMembers" value-key="id" label-key="name"
                      placeholder="Unassigned"
                    />
                  </template>
                </FormField>
                <FormField label="Category" :error="errors.category" field="category" class="col-md-6">
                  <template #default="{ id }">
                    <input :id="id" v-model="form.category" type="text" class="form-control" placeholder="e.g. Shopping, Maintenance" />
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
            <button type="submit" form="taskForm" class="btn btn-primary" :disabled="formLoading">
              <span v-if="formLoading" class="spinner-border spinner-border-sm me-2" />Save
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

    <!-- Shared confirmation modal — see components/ConfirmModal.vue -->
    <ConfirmModal
      v-model="showDeleteModal"
      :title="`Delete ${taskToDelete?.title}?`"
      message="This task will be permanently deleted and cannot be recovered."
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
import { Modal } from 'bootstrap'
import { useTaskStore } from '@/stores/tasks'
import { useToast } from '@/composables/useToast'
import ShimmerLoader from '@/components/ShimmerLoader.vue'
import ConfirmModal from '@/components/ConfirmModal.vue'
import api from '@/services/api'
import FormField from '@/components/FormField.vue'
import SelectField from '@/components/SelectField.vue'
import { useFormErrors } from '@/composables/useFormErrors'

const store = useTaskStore()
const { showToast } = useToast()
const taskStatuses = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const { errors, clear: clearErrors, capture: captureErrors, clearField } = useFormErrors()
// FormField clears its own message as the user edits.
provide('clearFormField', clearField)
let modalInstance = null

const filters = reactive({ status: '', priority: '', my_tasks: false })
const form = reactive({ title: '', priority: 'medium', due_date: '', assigned_to: '', category: '', description: '' })
const editing = ref(null)
const formLoading = ref(false)
const familyMembers = ref([])

function formatDate(d) {
  return d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'
}

function dueDateClass(d) {
  if (!d) return ''
  const days = Math.ceil((new Date(d) - new Date()) / 86400000)
  if (days < 0) return 'text-danger'
  if (days <= 2) return 'text-warning'
  return 'text-muted'
}

function resetFilters() {
  Object.assign(filters, { status: '', priority: '', my_tasks: false })
  fetchTasks()
}

async function fetchTasks() {
  const params = {}
  if (filters.status) params.status = filters.status
  if (filters.priority) params.priority = filters.priority
  if (filters.my_tasks) params.my_tasks = 1
  await store.fetchTasks(params)
}

function openModal(task = null) {
  clearErrors()
  editing.value = task
  if (task) {
    Object.assign(form, { title: task.title, priority: task.priority, due_date: task.due_date?.substring(0, 10) ?? '', assigned_to: task.assigned_to ?? '', category: task.category ?? '', description: task.description ?? '' })
  } else {
    Object.assign(form, { title: '', priority: 'medium', due_date: '', assigned_to: '', category: '', description: '' })
  }
  modalInstance?.show()
}

async function handleSubmit() {
  clearErrors()
  formLoading.value = true
  const payload = { ...form }
  if (!payload.assigned_to) delete payload.assigned_to
  try {
    if (editing.value) {
      await store.updateTask(editing.value.id, payload)
      showToast('Task updated!', 'success')
    } else {
      await store.createTask(payload)
      showToast('Task created!', 'success')
    }
    modalInstance?.hide()
    fetchTasks()
  } catch (err) {
    // 422 means per-field messages; anything else is a real failure.
    if (!captureErrors(err)) showToast(err.response?.data?.message ?? 'Error', 'danger')
  } finally {
    formLoading.value = false
  }
}

async function updateStatus(task, status) {
  await store.updateStatus(task.id, status)
  showToast('Status updated', 'success')
}

async function toggleComplete(task) {
  const newStatus = task.status === 'completed' ? 'pending' : 'completed'
  await store.updateStatus(task.id, newStatus)
}

const showDeleteModal = ref(false)
const taskToDelete = ref(null)
const deleting = ref(false)

async function deleteTask(task) {
  taskToDelete.value = task
  showDeleteModal.value = true
}

async function handleConfirmDelete() {
  if (!taskToDelete.value) return

  deleting.value = true
  try {
    await store.deleteTask(target.value.id)
    showToast('Task deleted', 'success')
    showDeleteModal.value = false
  } catch {
    showToast('Failed to delete', 'danger')
  } finally {
    deleting.value = false
  }
}

onMounted(async () => {
  fetchTasks()
  modalInstance = new Modal(document.getElementById('taskModal'))
  try {
    const { data } = await api.get('/family/members')
    familyMembers.value = data.data
  } catch {}
})
</script>
