<template>
  <div class="dashboard-root">

    <!-- ── Welcome Banner ─────────────────────────────── -->
    <div class="dash-banner mb-4">
      <div class="dash-banner__blob dash-banner__blob--1" />
      <div class="dash-banner__blob dash-banner__blob--2" />
      <div class="d-flex align-items-center justify-content-between flex-wrap gap-3 position-relative">
        <div class="d-flex align-items-center gap-3">
          <div class="dash-banner__avatar">
            {{ user?.name?.charAt(0)?.toUpperCase() ?? '?' }}
          </div>
          <div>
            <div class="dash-banner__greeting">Good {{ greeting }} ☀️</div>
            <h4 class="dash-banner__name mb-0">{{ user?.name?.split(' ')[0] }},</h4>
            <p class="dash-banner__sub mb-0">Here's what's happening with your family today.</p>
          </div>
        </div>
        <div class="dash-banner__date-box">
          <div class="dash-banner__date-day">{{ todayDay }}</div>
          <div class="dash-banner__date-full">{{ todayFull }}</div>
          <div class="dash-banner__family"><i class="bi bi-house-heart me-1" />{{ user?.family?.name ?? 'My Family' }}</div>
        </div>
      </div>
    </div>

    <!-- ── Shimmer ─────────────────────────────────────── -->
    <ShimmerLoader v-if="loading" variant="dashboard" />

    <template v-else-if="dashData">

      <!-- ── Stat Cards ──────────────────────────────────── -->
      <div class="row g-3 mb-4">
        <!-- Documents -->
        <div class="col-6 col-lg-3">
          <div class="dash-stat dash-stat--purple">
            <div class="dash-stat__icon-wrap">
              <i class="bi bi-file-earmark-text" />
            </div>
            <div class="dash-stat__body">
              <div class="dash-stat__label">Documents</div>
              <div class="dash-stat__value">{{ dashData.stats.documents }}</div>
              <div class="dash-stat__foot">
                <span v-if="dashData.stats.expiring_documents" class="dash-stat__alert">
                  <i class="bi bi-exclamation-circle me-1" />{{ dashData.stats.expiring_documents }} expiring
                </span>
                <span v-else class="dash-stat__ok"><i class="bi bi-check-circle me-1" />All valid</span>
              </div>
            </div>
          </div>
        </div>
        <!-- Expenses -->
        <div class="col-6 col-lg-3">
          <div class="dash-stat dash-stat--green">
            <div class="dash-stat__icon-wrap">
              <i class="bi bi-wallet2" />
            </div>
            <div class="dash-stat__body">
              <div class="dash-stat__label">This Month</div>
              <div class="dash-stat__value">₹{{ formatAmount(dashData.stats.total_expense_this_month) }}</div>
              <div class="dash-stat__foot">
                <span class="dash-stat__ok"><i class="bi bi-graph-up me-1" />Total expenses</span>
              </div>
            </div>
          </div>
        </div>
        <!-- Bills -->
        <div class="col-6 col-lg-3">
          <div class="dash-stat" :class="dashData.stats.overdue_bills ? 'dash-stat--red' : 'dash-stat--orange'">
            <div class="dash-stat__icon-wrap">
              <i class="bi bi-receipt" />
            </div>
            <div class="dash-stat__body">
              <div class="dash-stat__label">Pending Bills</div>
              <div class="dash-stat__value">{{ dashData.stats.pending_bills }}</div>
              <div class="dash-stat__foot">
                <span v-if="dashData.stats.overdue_bills" class="dash-stat__alert">
                  <i class="bi bi-exclamation-triangle me-1" />{{ dashData.stats.overdue_bills }} overdue
                </span>
                <span v-else class="dash-stat__ok"><i class="bi bi-check-circle me-1" />On track</span>
              </div>
            </div>
          </div>
        </div>
        <!-- Tasks -->
        <div class="col-6 col-lg-3">
          <div class="dash-stat dash-stat--blue">
            <div class="dash-stat__icon-wrap">
              <i class="bi bi-check2-square" />
            </div>
            <div class="dash-stat__body">
              <div class="dash-stat__label">Tasks</div>
              <div class="dash-stat__value">{{ dashData.stats.pending_tasks }}</div>
              <div class="dash-stat__foot">
                <span class="dash-stat__ok"><i class="bi bi-hourglass-split me-1" />Pending</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Quick Actions ───────────────────────────────── -->
      <div class="dash-quick-actions mb-4">
        <Link href="/app/documents" class="dash-qa-btn">
          <span class="dash-qa-btn__icon" style="background:#ede9fe;color:#6C5CE7"><i class="bi bi-file-earmark-plus" /></span>
          <span>Add Document</span>
        </Link>
        <Link href="/app/expenses" class="dash-qa-btn">
          <span class="dash-qa-btn__icon" style="background:#d1fae5;color:#00b894"><i class="bi bi-plus-circle" /></span>
          <span>Log Expense</span>
        </Link>
        <Link href="/app/tasks" class="dash-qa-btn">
          <span class="dash-qa-btn__icon" style="background:#e0f2fe;color:#0984e3"><i class="bi bi-check2-circle" /></span>
          <span>New Task</span>
        </Link>
        <Link href="/app/bills" class="dash-qa-btn">
          <span class="dash-qa-btn__icon" style="background:#fff3cd;color:#e17055"><i class="bi bi-receipt-cutoff" /></span>
          <span>Add Bill</span>
        </Link>
        <Link href="/app/medical" class="dash-qa-btn">
          <span class="dash-qa-btn__icon" style="background:#fee2e2;color:#d63031"><i class="bi bi-heart-pulse" /></span>
          <span>Medical</span>
        </Link>
        <Link href="/app/albums" class="dash-qa-btn">
          <span class="dash-qa-btn__icon" style="background:#fef6e4;color:#fdcb6e"><i class="bi bi-images" /></span>
          <span>Albums</span>
        </Link>
      </div>

      <!-- ── Main Content Grid ───────────────────────────── -->
      <div class="row g-4">

        <!-- Left Column ─── 8 cols -->
        <div class="col-lg-8">

          <!-- Monthly Expense Chart -->
          <div class="dash-card mb-4">
            <div class="dash-card__header">
              <div>
                <h6 class="dash-card__title">Monthly Expenses</h6>
                <p class="dash-card__subtitle mb-0">Last 6 months overview</p>
              </div>
              <Link href="/app/expenses" class="dash-card__link">View All <i class="bi bi-arrow-right ms-1" /></Link>
            </div>
            <div class="dash-card__body">
              <div v-if="dashData.monthly_expenses?.length" style="height:210px">
                <Bar :data="expenseChartData" :options="chartOptions" />
              </div>
              <div v-else class="dash-empty">
                <div class="dash-empty__icon"><i class="bi bi-bar-chart-line" /></div>
                <p class="dash-empty__text">No expense data yet</p>
                <Link href="/app/expenses" class="btn btn-sm btn-primary px-4">Add first expense</Link>
              </div>
            </div>
          </div>

          <!-- Pending Tasks -->
          <div class="dash-card mb-4">
            <div class="dash-card__header">
              <div>
                <h6 class="dash-card__title">Pending Tasks</h6>
                <p class="dash-card__subtitle mb-0">{{ dashData.pending_tasks?.length || 0 }} tasks need attention</p>
              </div>
              <Link href="/app/tasks" class="dash-card__link">View All <i class="bi bi-arrow-right ms-1" /></Link>
            </div>
            <div class="dash-card__body">
              <template v-if="dashData.pending_tasks?.length">
                <div
                  v-for="task in dashData.pending_tasks"
                  :key="task.id"
                  class="dash-list-row"
                >
                  <span :class="`dash-priority dash-priority--${task.priority}`">{{ task.priority }}</span>
                  <div class="flex-grow-1 min-w-0">
                    <div class="dash-list-row__title">{{ task.title }}</div>
                    <div v-if="task.due_date" class="dash-list-row__meta">
                      <i class="bi bi-calendar3 me-1" />{{ formatDate(task.due_date) }}
                    </div>
                  </div>
                  <div v-if="task.assignee" class="dash-assignee">
                    {{ task.assignee.name?.charAt(0) }}
                  </div>
                </div>
              </template>
              <div v-else class="dash-empty">
                <div class="dash-empty__icon text-success"><i class="bi bi-check2-all" /></div>
                <p class="dash-empty__text">All tasks completed! 🎉</p>
              </div>
            </div>
          </div>

          <!-- Recent Activity -->
          <div class="dash-card">
            <div class="dash-card__header">
              <div>
                <h6 class="dash-card__title">Recent Activity</h6>
                <p class="dash-card__subtitle mb-0">Latest family actions</p>
              </div>
            </div>
            <div class="dash-card__body">
              <template v-if="dashData.recent_activities?.length">
                <div
                  v-for="(activity, idx) in dashData.recent_activities"
                  :key="activity.id"
                  class="dash-timeline-row"
                  :class="{ 'dash-timeline-row--last': idx === dashData.recent_activities.length - 1 }"
                >
                  <div class="dash-timeline-row__dot" :style="`background:${moduleColor(activity.module)}`">
                    <i :class="`bi ${moduleIcon(activity.module)}`" />
                  </div>
                  <div class="flex-grow-1 min-w-0">
                    <div class="dash-timeline-row__desc">{{ activity.description }}</div>
                    <div class="dash-timeline-row__meta">
                      <i class="bi bi-person me-1" />{{ activity.user?.name }}
                      <span class="mx-1">·</span>{{ timeAgo(activity.created_at) }}
                    </div>
                  </div>
                </div>
              </template>
              <div v-else class="dash-empty">
                <div class="dash-empty__icon"><i class="bi bi-activity" /></div>
                <p class="dash-empty__text">No recent activity</p>
              </div>
            </div>
          </div>

        </div>

        <!-- Right Column ─── 4 cols -->
        <div class="col-lg-4">

          <!-- Upcoming Bills -->
          <div class="dash-card mb-4">
            <div class="dash-card__header">
              <div>
                <h6 class="dash-card__title">Upcoming Bills</h6>
                <p class="dash-card__subtitle mb-0">Due in next 30 days</p>
              </div>
              <Link href="/app/bills" class="dash-card__link">View All <i class="bi bi-arrow-right ms-1" /></Link>
            </div>
            <div class="dash-card__body">
              <template v-if="dashData.upcoming_bills?.length">
                <div
                  v-for="bill in dashData.upcoming_bills"
                  :key="bill.id"
                  class="dash-bill-row"
                >
                  <div class="dash-bill-row__icon">
                    <i class="bi bi-lightning-charge" />
                  </div>
                  <div class="flex-grow-1 min-w-0">
                    <div class="dash-list-row__title">{{ bill.name }}</div>
                    <div class="dash-list-row__meta"><i class="bi bi-calendar3 me-1" />{{ formatDate(bill.due_date) }}</div>
                  </div>
                  <div class="text-end">
                    <div class="dash-bill-row__amount">₹{{ formatAmount(bill.amount) }}</div>
                    <span :class="`dash-status dash-status--${bill.status}`">{{ bill.status }}</span>
                  </div>
                </div>
              </template>
              <div v-else class="dash-empty">
                <div class="dash-empty__icon"><i class="bi bi-receipt" /></div>
                <p class="dash-empty__text">No upcoming bills</p>
              </div>
            </div>
          </div>

          <!-- Expiring Documents -->
          <div class="dash-card mb-4">
            <div class="dash-card__header">
              <div>
                <h6 class="dash-card__title">Expiring Documents</h6>
                <p class="dash-card__subtitle mb-0">Needs renewal soon</p>
              </div>
              <Link href="/app/documents" class="dash-card__link">View All <i class="bi bi-arrow-right ms-1" /></Link>
            </div>
            <div class="dash-card__body">
              <template v-if="dashData.expiring_documents?.length">
                <div
                  v-for="doc in dashData.expiring_documents"
                  :key="doc.id"
                  class="dash-list-row"
                >
                  <div class="dash-doc-icon">
                    <i class="bi bi-file-earmark-lock" />
                  </div>
                  <div class="flex-grow-1 min-w-0">
                    <div class="dash-list-row__title text-truncate">{{ doc.title }}</div>
                    <div class="dash-list-row__meta"><i class="bi bi-clock-history me-1" />Expires: {{ formatDate(doc.expiry_date) }}</div>
                  </div>
                </div>
              </template>
              <div v-else class="dash-empty">
                <div class="dash-empty__icon text-success"><i class="bi bi-shield-check" /></div>
                <p class="dash-empty__text">All documents are valid</p>
              </div>
            </div>
          </div>

          <!-- Upcoming Appointments -->
          <div class="dash-card">
            <div class="dash-card__header">
              <div>
                <h6 class="dash-card__title">Appointments</h6>
                <p class="dash-card__subtitle mb-0">Upcoming medical visits</p>
              </div>
              <Link href="/app/medical" class="dash-card__link">View All <i class="bi bi-arrow-right ms-1" /></Link>
            </div>
            <div class="dash-card__body">
              <template v-if="dashData.upcoming_appointments?.length">
                <div
                  v-for="appt in dashData.upcoming_appointments"
                  :key="appt.id"
                  class="dash-list-row"
                >
                  <div class="dash-appt-icon">
                    <i class="bi bi-hospital" />
                  </div>
                  <div class="flex-grow-1 min-w-0">
                    <div class="dash-list-row__title">Dr. {{ appt.doctor_name }}</div>
                    <div class="dash-list-row__meta text-truncate">
                      <i class="bi bi-person me-1" />{{ appt.member_name }}
                      <span class="mx-1">·</span><i class="bi bi-calendar3 me-1" />{{ formatDate(appt.date) }}
                    </div>
                  </div>
                </div>
              </template>
              <div v-else class="dash-empty">
                <div class="dash-empty__icon"><i class="bi bi-calendar-check" /></div>
                <p class="dash-empty__text">No upcoming appointments</p>
              </div>
            </div>
          </div>

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
const todayDay = new Date().toLocaleDateString('en-IN', { weekday: 'long' })
const todayFull = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })

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

<style scoped>
/* ═══════════════════════════════════════════════════════
   Dashboard Root
═══════════════════════════════════════════════════════ */
.dashboard-root {
  width: 100%;
}

/* ═══════════════════════════════════════════════════════
   Welcome Banner
═══════════════════════════════════════════════════════ */
.dash-banner {
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #6C5CE7 0%, #a29bfe 60%, #74b9ff 100%);
  border-radius: 20px;
  padding: 2rem 2rem;
  color: #fff;
  box-shadow: 0 8px 32px rgba(108, 92, 231, 0.25);
}

.dash-banner__blob {
  position: absolute;
  border-radius: 50%;
  opacity: 0.12;
  pointer-events: none;
}
.dash-banner__blob--1 {
  width: 260px; height: 260px;
  background: #fff;
  top: -80px; right: -60px;
}
.dash-banner__blob--2 {
  width: 160px; height: 160px;
  background: #fff;
  bottom: -60px; left: 30%;
}

.dash-banner__avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(255,255,255,0.25);
  border: 2px solid rgba(255,255,255,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
  backdrop-filter: blur(4px);
}

.dash-banner__greeting {
  font-size: 0.8rem;
  font-weight: 600;
  opacity: 0.85;
  text-transform: uppercase;
  letter-spacing: 0.8px;
}

.dash-banner__name {
  font-size: 1.6rem;
  font-weight: 800;
  line-height: 1.2;
}

.dash-banner__sub {
  font-size: 0.875rem;
  opacity: 0.8;
  margin-top: 0.2rem;
}

.dash-banner__date-box {
  text-align: right;
  background: rgba(255,255,255,0.15);
  border-radius: 14px;
  padding: 0.75rem 1.25rem;
  backdrop-filter: blur(6px);
  border: 1px solid rgba(255,255,255,0.2);
}

.dash-banner__date-day {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  opacity: 0.8;
}

.dash-banner__date-full {
  font-size: 0.95rem;
  font-weight: 700;
}

.dash-banner__family {
  font-size: 0.75rem;
  opacity: 0.75;
  margin-top: 0.25rem;
}

/* ═══════════════════════════════════════════════════════
   Stat Cards
═══════════════════════════════════════════════════════ */
.dash-stat {
  background: #fff;
  border-radius: 16px;
  padding: 1.25rem 1.25rem 1rem;
  border: 1.5px solid #eef0f7;
  box-shadow: 0 2px 12px rgba(0,0,0,0.04);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 4px;
    border-radius: 16px 16px 0 0;
  }

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.1);
  }
}

.dash-stat--purple::before { background: linear-gradient(90deg, #6C5CE7, #a29bfe); }
.dash-stat--green::before  { background: linear-gradient(90deg, #00b894, #55efc4); }
.dash-stat--orange::before { background: linear-gradient(90deg, #e17055, #fdcb6e); }
.dash-stat--red::before    { background: linear-gradient(90deg, #d63031, #e17055); }
.dash-stat--blue::before   { background: linear-gradient(90deg, #0984e3, #74b9ff); }

.dash-stat__icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.3rem;
  margin-bottom: 0.75rem;
  flex-shrink: 0;
}

.dash-stat--purple .dash-stat__icon-wrap { background: #ede9fe; color: #6C5CE7; }
.dash-stat--green  .dash-stat__icon-wrap { background: #d1fae5; color: #00b894; }
.dash-stat--orange .dash-stat__icon-wrap { background: #fff3e0; color: #e17055; }
.dash-stat--red    .dash-stat__icon-wrap { background: #fee2e2; color: #d63031; }
.dash-stat--blue   .dash-stat__icon-wrap { background: #dbeafe; color: #0984e3; }

.dash-stat__label {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: #8a94a6;
  margin-bottom: 0.15rem;
}

.dash-stat__value {
  font-size: 1.65rem;
  font-weight: 800;
  color: #1a202c;
  line-height: 1.1;
  margin-bottom: 0.35rem;
}

.dash-stat__foot {
  font-size: 0.72rem;
  font-weight: 600;
}

.dash-stat__alert { color: #e17055; }
.dash-stat__ok    { color: #00b894; }

/* ═══════════════════════════════════════════════════════
   Quick Actions Bar
═══════════════════════════════════════════════════════ */
.dash-quick-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.dash-qa-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem 0.5rem 0.6rem;
  background: #fff;
  border: 1.5px solid #eef0f7;
  border-radius: 50px;
  font-size: 0.82rem;
  font-weight: 600;
  color: #2d3748;
  text-decoration: none;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 18px rgba(0,0,0,0.1);
    border-color: #c9c9f8;
    color: #6C5CE7;
  }
}

.dash-qa-btn__icon {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.95rem;
  flex-shrink: 0;
}

/* ═══════════════════════════════════════════════════════
   Card Shell
═══════════════════════════════════════════════════════ */
.dash-card {
  background: #fff;
  border: 1.5px solid #eef0f7;
  border-radius: 18px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.04);
  overflow: hidden;
  transition: box-shadow 0.2s ease;

  &:hover {
    box-shadow: 0 6px 24px rgba(0,0,0,0.07);
  }
}

.dash-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.1rem 1.4rem 0.9rem;
  border-bottom: 1px solid #f4f5fb;
}

.dash-card__title {
  font-size: 0.95rem;
  font-weight: 700;
  color: #1a202c;
  margin: 0;
}

.dash-card__subtitle {
  font-size: 0.75rem;
  color: #8a94a6;
  margin-top: 0.1rem;
}

.dash-card__link {
  font-size: 0.78rem;
  font-weight: 600;
  color: #6C5CE7;
  text-decoration: none;
  white-space: nowrap;

  &:hover { text-decoration: underline; }
}

.dash-card__body {
  padding: 0.5rem 0;
}

/* ═══════════════════════════════════════════════════════
   List Rows
═══════════════════════════════════════════════════════ */
.dash-list-row {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.7rem 1.4rem;
  border-bottom: 1px solid #f4f5fb;
  transition: background 0.15s;

  &:last-child { border-bottom: none; }
  &:hover { background: #fafbff; }
}

.dash-list-row__title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #2d3748;
  line-height: 1.3;
}

.dash-list-row__meta {
  font-size: 0.72rem;
  color: #8a94a6;
  margin-top: 0.1rem;
}

/* ═══════════════════════════════════════════════════════
   Priority Badges
═══════════════════════════════════════════════════════ */
.dash-priority {
  padding: 0.2rem 0.55rem;
  border-radius: 50px;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  flex-shrink: 0;
}
.dash-priority--high   { background: #fee2e2; color: #d63031; }
.dash-priority--medium { background: #fff3cd; color: #b45309; }
.dash-priority--low    { background: #d1fae5; color: #00b894; }

/* ═══════════════════════════════════════════════════════
   Assignee Avatar
═══════════════════════════════════════════════════════ */
.dash-assignee {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6C5CE7, #a29bfe);
  color: #fff;
  font-size: 0.7rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* ═══════════════════════════════════════════════════════
   Bills Row
═══════════════════════════════════════════════════════ */
.dash-bill-row {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.7rem 1.4rem;
  border-bottom: 1px solid #f4f5fb;
  transition: background 0.15s;

  &:last-child { border-bottom: none; }
  &:hover { background: #fafbff; }
}

.dash-bill-row__icon {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: #fff3e0;
  color: #e17055;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.95rem;
  flex-shrink: 0;
}

.dash-bill-row__amount {
  font-size: 0.85rem;
  font-weight: 700;
  color: #2d3748;
}

/* ═══════════════════════════════════════════════════════
   Status Pills
═══════════════════════════════════════════════════════ */
.dash-status {
  display: inline-block;
  padding: 0.15rem 0.5rem;
  border-radius: 50px;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}
.dash-status--pending { background: #fff3cd; color: #b45309; }
.dash-status--paid    { background: #d1fae5; color: #00b894; }
.dash-status--overdue { background: #fee2e2; color: #d63031; }

/* ═══════════════════════════════════════════════════════
   Expiring Doc Icon
═══════════════════════════════════════════════════════ */
.dash-doc-icon {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: #fff3cd;
  color: #e17055;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  flex-shrink: 0;
}

/* ═══════════════════════════════════════════════════════
   Appointment Icon
═══════════════════════════════════════════════════════ */
.dash-appt-icon {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: #fee2e2;
  color: #d63031;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  flex-shrink: 0;
}

/* ═══════════════════════════════════════════════════════
   Activity Timeline
═══════════════════════════════════════════════════════ */
.dash-timeline-row {
  display: flex;
  align-items: flex-start;
  gap: 0.85rem;
  padding: 0.8rem 1.4rem;
  position: relative;

  &:not(.dash-timeline-row--last)::after {
    content: '';
    position: absolute;
    left: calc(1.4rem + 17px);
    top: calc(0.8rem + 34px);
    bottom: 0;
    width: 2px;
    background: linear-gradient(180deg, #eef0f7 0%, transparent 100%);
  }
}

.dash-timeline-row__dot {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  color: #fff;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}

.dash-timeline-row__desc {
  font-size: 0.875rem;
  font-weight: 600;
  color: #2d3748;
  line-height: 1.3;
}

.dash-timeline-row__meta {
  font-size: 0.72rem;
  color: #8a94a6;
  margin-top: 0.15rem;
}

/* ═══════════════════════════════════════════════════════
   Empty State
═══════════════════════════════════════════════════════ */
.dash-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  color: #8a94a6;
}

.dash-empty__icon {
  font-size: 2.2rem;
  margin-bottom: 0.6rem;
  opacity: 0.5;
}

.dash-empty__text {
  font-size: 0.82rem;
  font-weight: 500;
  margin: 0 0 0.75rem;
  color: #adb5bd;
}

/* ═══════════════════════════════════════════════════════
   Responsive tweaks
═══════════════════════════════════════════════════════ */
@media (max-width: 576px) {
  .dash-banner {
    padding: 1.4rem 1.25rem;
  }
  .dash-banner__name { font-size: 1.3rem; }
  .dash-banner__date-box { display: none; }
  .dash-stat__value { font-size: 1.3rem; }
  .dash-quick-actions { gap: 0.5rem; }
  .dash-qa-btn { font-size: 0.75rem; padding: 0.4rem 0.75rem 0.4rem 0.5rem; }
}
</style>
