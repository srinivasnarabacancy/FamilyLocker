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
          <select v-model="filters.status" class="form-select" @change="fetchTasks">
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div class="col-6 col-md-3">
          <select v-model="filters.priority" class="form-select" @change="fetchTasks">
            <option value="">All Priority</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
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
    <div v-if="store.loading" class="page-loader"><div class="spinner-border" /></div>

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
                  <select
                    :value="task.status"
                    class="form-select form-select-sm"
                    style="width:130px"
                    @change="updateStatus(task, $event.target.value)"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
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
            <form id="taskForm" @submit.prevent="handleSubmit">
              <div class="row g-3">
                <div class="col-12">
                  <label class="form-label">Task Title *</label>
                  <input v-model="form.title" type="text" class="form-control" required />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Priority</label>
                  <select v-model="form.priority" class="form-select">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Due Date</label>
                  <input v-model="form.due_date" type="date" class="form-control" />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Assign To</label>
                  <select v-model="form.assigned_to" class="form-select">
                    <option value="">Unassigned</option>
                    <option v-for="m in familyMembers" :key="m.id" :value="m.id">{{ m.name }}</option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Category</label>
                  <input v-model="form.category" type="text" class="form-control" placeholder="e.g. Shopping, Maintenance" />
                </div>
                <div class="col-12">
                  <label class="form-label">Description</label>
                  <textarea v-model="form.description" rows="2" class="form-control" />
                </div>
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
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import { Modal } from 'bootstrap'
import { useTaskStore } from '@/stores/tasks'
import { useToast } from '@/composables/useToast'
import api from '@/services/api'

const store = useTaskStore()
const { showToast } = useToast()
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
  editing.value = task
  if (task) {
    Object.assign(form, { title: task.title, priority: task.priority, due_date: task.due_date?.substring(0, 10) ?? '', assigned_to: task.assigned_to ?? '', category: task.category ?? '', description: task.description ?? '' })
  } else {
    Object.assign(form, { title: '', priority: 'medium', due_date: '', assigned_to: '', category: '', description: '' })
  }
  modalInstance?.show()
}

async function handleSubmit() {
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
    showToast(err.response?.data?.message ?? 'Error', 'danger')
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

async function deleteTask(task) {
  if (!confirm(`Delete task "${task.title}"?`)) return
  await store.deleteTask(task.id)
  showToast('Task deleted', 'success')
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
