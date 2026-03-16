<template>
  <div>
    <!-- Welcome Banner -->
    <div
      class="rounded-3 p-4 mb-4 text-white"
      style="background: linear-gradient(135deg, var(--fl-primary) 0%, var(--fl-primary-dark) 100%)"
    >
      <div class="d-flex align-items-center justify-content-between flex-wrap gap-3">
        <div>
          <h4 class="fw-bold mb-1">Good {{ greeting }}, {{ user?.name?.split(' ')[0] }}! 👋</h4>
          <p class="mb-0 opacity-75 small">Here's what's happening with your family today.</p>
        </div>
        <div class="text-end">
          <div class="fw-bold fs-5">{{ today }}</div>
          <div class="small opacity-75">{{ user?.family?.name }}</div>
        </div>
      </div>
    </div>

    <!-- Stats Grid -->
    <ShimmerLoader v-if="loading" variant="dashboard" />

    <template v-else-if="dashData">
      <!-- Stat Cards Row 1 -->
      <div class="row g-3 mb-4">
        <div class="col-6 col-md-3">
          <div class="stat-card">
            <div class="stat-icon" style="background:#ede9fe">
              <i class="bi bi-file-earmark-text" style="color:var(--fl-primary)" />
            </div>
            <div class="stat-info">
              <div class="stat-label">Documents</div>
              <div class="stat-value">{{ dashData.stats.documents }}</div>
              <span v-if="dashData.stats.expiring_documents" class="badge bg-warning text-dark stat-badge">
                {{ dashData.stats.expiring_documents }} expiring
              </span>
            </div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="stat-card">
            <div class="stat-icon" style="background:#d1fae5">
              <i class="bi bi-wallet2" style="color:var(--fl-success)" />
            </div>
            <div class="stat-info">
              <div class="stat-label">This Month</div>
              <div class="stat-value">₹{{ formatAmount(dashData.stats.total_expense_this_month) }}</div>
              <span class="stat-badge text-muted small">Total expenses</span>
            </div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="stat-card">
            <div class="stat-icon" style="background:#fee2e2">
              <i class="bi bi-receipt" :style="{ color: dashData.stats.overdue_bills ? '#d63031' : '#f59e0b' }" />
            </div>
            <div class="stat-info">
              <div class="stat-label">Pending Bills</div>
              <div class="stat-value">{{ dashData.stats.pending_bills }}</div>
              <span v-if="dashData.stats.overdue_bills" class="badge bg-danger stat-badge">
                {{ dashData.stats.overdue_bills }} overdue
              </span>
            </div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="stat-card">
            <div class="stat-icon" style="background:#e0f2fe">
              <i class="bi bi-check2-square" style="color:var(--fl-info)" />
            </div>
            <div class="stat-info">
              <div class="stat-label">Tasks</div>
              <div class="stat-value">{{ dashData.stats.pending_tasks }}</div>
              <span class="stat-badge text-muted small">pending</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Content Grid -->
      <div class="row g-4">
        <!-- Left Column -->
        <div class="col-lg-8">
          <!-- Monthly Expense Chart -->
          <div class="fl-card p-4 mb-4">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <h6 class="fw-bold mb-0">Monthly Expenses</h6>
              <Link href="/app/expenses" class="btn btn-sm btn-outline-primary">View All</Link>
            </div>
            <div v-if="dashData.monthly_expenses?.length" style="height:200px">
              <Bar :data="expenseChartData" :options="chartOptions" />
            </div>
            <div v-else class="empty-state py-4">
              <i class="bi bi-bar-chart empty-icon fs-2" />
              <p class="empty-subtitle mb-0">No expense data yet</p>
            </div>
          </div>

          <!-- Pending Tasks -->
          <div class="fl-card p-4 mb-4">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <h6 class="fw-bold mb-0">Pending Tasks</h6>
              <Link href="/app/tasks" class="btn btn-sm btn-outline-primary">View All</Link>
            </div>
            <div v-if="dashData.pending_tasks?.length">
              <div
                v-for="task in dashData.pending_tasks"
                :key="task.id"
                class="d-flex align-items-center gap-3 py-2 border-bottom"
              >
                <span :class="`badge priority-${task.priority}`">{{ task.priority }}</span>
                <div class="flex-grow-1">
                  <div class="fw-semibold small">{{ task.title }}</div>
                  <div v-if="task.due_date" class="text-muted" style="font-size:0.75rem">
                    <i class="bi bi-calendar3 me-1" />{{ formatDate(task.due_date) }}
                  </div>
                </div>
                <span v-if="task.assignee" class="text-muted small">{{ task.assignee.name }}</span>
              </div>
            </div>
            <div v-else class="empty-state py-3">
              <i class="bi bi-check2-all empty-icon fs-2 text-success" />
              <p class="empty-subtitle mb-0">All tasks completed! 🎉</p>
            </div>
          </div>
        </div>

        <!-- Right Column -->
        <div class="col-lg-4">
          <!-- Upcoming Bills -->
          <div class="fl-card p-4 mb-4">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <h6 class="fw-bold mb-0">Upcoming Bills</h6>
              <Link href="/app/bills" class="btn btn-sm btn-outline-primary">View All</Link>
            </div>
            <div v-if="dashData.upcoming_bills?.length">
              <div
                v-for="bill in dashData.upcoming_bills"
                :key="bill.id"
                class="d-flex align-items-center justify-content-between py-2 border-bottom"
              >
                <div>
                  <div class="fw-semibold small">{{ bill.name }}</div>
                  <div class="text-muted" style="font-size:0.75rem">{{ formatDate(bill.due_date) }}</div>
                </div>
                <div class="text-end">
                  <div class="fw-bold small">₹{{ formatAmount(bill.amount) }}</div>
                  <span :class="`badge status-${bill.status}`">{{ bill.status }}</span>
                </div>
              </div>
            </div>
            <div v-else class="empty-state py-3">
              <i class="bi bi-receipt empty-icon fs-2" />
              <p class="empty-subtitle mb-0">No upcoming bills</p>
            </div>
          </div>

          <!-- Expiring Documents -->
          <div class="fl-card p-4 mb-4">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <h6 class="fw-bold mb-0">Expiring Documents</h6>
              <Link href="/app/documents" class="btn btn-sm btn-outline-primary">View All</Link>
            </div>
            <div v-if="dashData.expiring_documents?.length">
              <div
                v-for="doc in dashData.expiring_documents"
                :key="doc.id"
                class="d-flex align-items-center gap-2 py-2 border-bottom"
              >
                <i class="bi bi-file-earmark-lock text-warning" />
                <div class="flex-grow-1 min-w-0">
                  <div class="fw-semibold small text-truncate">{{ doc.title }}</div>
                  <div class="text-muted" style="font-size:0.75rem">
                    Expires: {{ formatDate(doc.expiry_date) }}
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="empty-state py-3">
              <i class="bi bi-shield-check empty-icon fs-2 text-success" />
              <p class="empty-subtitle mb-0">All documents are valid</p>
            </div>
          </div>

          <!-- Upcoming Appointments -->
          <div class="fl-card p-4">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <h6 class="fw-bold mb-0">Appointments</h6>
              <Link href="/app/medical" class="btn btn-sm btn-outline-primary">View All</Link>
            </div>
            <div v-if="dashData.upcoming_appointments?.length">
              <div
                v-for="appt in dashData.upcoming_appointments"
                :key="appt.id"
                class="d-flex align-items-center gap-2 py-2 border-bottom"
              >
                <div class="rounded-circle bg-danger d-flex align-items-center justify-content-center text-white" style="width:34px;height:34px;font-size:0.8rem;flex-shrink:0">
                  <i class="bi bi-hospital" />
                </div>
                <div class="flex-grow-1 min-w-0">
                  <div class="fw-semibold small">Dr. {{ appt.doctor_name }}</div>
                  <div class="text-muted text-truncate" style="font-size:0.75rem">
                    {{ appt.member_name }} &bull; {{ formatDate(appt.date) }}
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="empty-state py-3">
              <i class="bi bi-calendar-check empty-icon fs-2" />
              <p class="empty-subtitle mb-0">No upcoming appointments</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Activity -->
      <div class="fl-card p-4 mt-4">
        <h6 class="fw-bold mb-3">Recent Activity</h6>
        <div v-if="dashData.recent_activities?.length">
          <div
            v-for="activity in dashData.recent_activities"
            :key="activity.id"
            class="d-flex align-items-start gap-3 py-2 border-bottom"
          >
            <div class="rounded-circle d-flex align-items-center justify-content-center" :style="`background:${moduleColor(activity.module)};width:34px;height:34px;flex-shrink:0`">
              <i :class="`bi ${moduleIcon(activity.module)} text-white`" style="font-size:0.9rem" />
            </div>
            <div class="flex-grow-1 min-w-0">
              <div class="small fw-semibold">{{ activity.description }}</div>
              <div class="text-muted" style="font-size:0.75rem">
                {{ activity.user?.name }} &bull; {{ timeAgo(activity.created_at) }}
              </div>
            </div>
          </div>
        </div>
        <div v-else class="empty-state py-3">
          <i class="bi bi-activity empty-icon fs-2" />
          <p class="empty-subtitle mb-0">No recent activity</p>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Link, usePage } from '@inertiajs/vue3'
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js'
import { useDashboardStore } from '@/stores/dashboard'
import ShimmerLoader from '@/components/ShimmerLoader.vue'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const page = usePage()
const dashboardStore = useDashboardStore()
const loading = computed(() => dashboardStore.loading)
const dashData = computed(() => dashboardStore.data)
const user = computed(() => page.props.auth?.user ?? null)

const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
})

const expenseChartData = computed(() => {
  const data = dashData.value?.monthly_expenses ?? []
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return {
    labels: data.map((d) => `${monthNames[d.month - 1]} ${d.year}`),
    datasets: [
      {
        label: 'Expenses (₹)',
        data: data.map((d) => parseFloat(d.total)),
        backgroundColor: 'rgba(108, 92, 231, 0.8)',
        borderRadius: 6,
      },
    ],
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    y: { ticks: { callback: (v) => `₹${v}` }, grid: { color: '#eef0f7' } },
    x: { grid: { display: false } },
  },
}

const moduleIcons = {
  documents: 'bi-file-earmark-text',
  expenses: 'bi-wallet2',
  medical: 'bi-heart-pulse',
  albums: 'bi-images',
  bills: 'bi-receipt',
  tasks: 'bi-check2-square',
}

const moduleColors = {
  documents: '#6C5CE7',
  expenses: '#00b894',
  medical: '#d63031',
  albums: '#fdcb6e',
  bills: '#e17055',
  tasks: '#0984e3',
}

function moduleIcon(m) { return moduleIcons[m] ?? 'bi-bell' }
function moduleColor(m) { return moduleColors[m] ?? '#6C5CE7' }

function formatAmount(v) {
  return Number(v ?? 0).toLocaleString('en-IN')
}

function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function timeAgo(dateStr) {
  const seconds = Math.floor((new Date() - new Date(dateStr)) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

onMounted(() => {
  dashboardStore.fetchDashboard()
})
</script>
