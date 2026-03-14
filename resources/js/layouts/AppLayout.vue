<template>
  <div class="app-layout">
    <CsrfMetaSync />
    <!-- Sidebar Overlay (mobile) -->
    <div
      v-if="sidebarOpen"
      class="sidebar-overlay"
      @click="sidebarOpen = false"
    />

    <!-- Sidebar -->
    <aside class="sidebar" :class="{ open: sidebarOpen }">
      <div class="sidebar__brand">
        <div class="brand-logo">🏠</div>
        <span class="brand-name">FamilyLocker</span>
      </div>

      <nav class="sidebar__nav">
        <span class="nav-section-title">Main</span>
        <Link
          v-for="item in mainNavItems"
          :key="item.href"
          :href="item.href"
          class="nav-link"
          :class="{ active: isActive(item.components) }"
          @click="sidebarOpen = false"
        >
          <i :class="item.icon" />
          <span>{{ item.label }}</span>
        </Link>

        <span class="nav-section-title mt-2">Account</span>
        <Link
          href="/app/family"
          class="nav-link"
          :class="{ active: isActive(['FamilyPage']) }"
          @click="sidebarOpen = false"
        >
          <i class="bi bi-people" />
          <span>Family</span>
        </Link>
        <Link
          href="/app/profile"
          class="nav-link"
          :class="{ active: isActive(['ProfilePage']) }"
          @click="sidebarOpen = false"
        >
          <i class="bi bi-person-circle" />
          <span>Profile</span>
        </Link>
      </nav>

      <div class="sidebar__footer">
        <button class="btn btn-sm btn-outline-danger w-100" @click="handleLogout">
          <i class="bi bi-box-arrow-left me-2" />
          Logout
        </button>
      </div>
    </aside>

    <!-- Main content -->
    <div class="main-content">
      <!-- Topbar -->
      <header class="main-content__topbar">
        <div class="d-flex align-items-center gap-3">
          <button
            class="btn btn-icon btn-light d-lg-none"
            @click="sidebarOpen = !sidebarOpen"
          >
            <i class="bi bi-list fs-5" />
          </button>
          <div>
            <h6 class="mb-0 fw-bold text-dark">{{ currentPageTitle }}</h6>
            <small class="text-muted" v-if="user?.family?.name">
              {{ user.family.name }}
            </small>
          </div>
        </div>

        <div class="d-flex align-items-center gap-2">
          <!-- User avatar -->
          <div class="d-flex align-items-center gap-2">
            <div
              class="rounded-circle bg-primary d-flex align-items-center justify-content-center text-white fw-bold"
              style="width:36px;height:36px;font-size:0.875rem;"
            >
              {{ userInitials }}
            </div>
            <div class="d-none d-sm-block">
              <div class="fw-semibold small text-dark lh-1">{{ user?.name }}</div>
              <div class="text-muted" style="font-size:0.72rem">
                {{ formatRoleLabel(user?.role) }}
              </div>
            </div>
          </div>
        </div>
      </header>

      <!-- Page body -->
      <main class="main-content__body">
        <slot />
      </main>
    </div>

    <ToastContainer />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Link, router, usePage } from '@inertiajs/vue3'
import CsrfMetaSync from '@/components/CsrfMetaSync.vue'
import ToastContainer from '@/components/ToastContainer.vue'
import { formatRoleLabel } from '@/constants/roles'

const page = usePage()
const sidebarOpen = ref(false)

const mainNavItems = [
  { href: '/app/dashboard', label: 'Dashboard', icon: 'bi bi-grid-1x2', components: ['DashboardPage'] },
  { href: '/app/documents', label: 'Documents', icon: 'bi bi-file-earmark-text', components: ['DocumentsPage'] },
  { href: '/app/expenses', label: 'Expenses', icon: 'bi bi-wallet2', components: ['ExpensesPage'] },
  { href: '/app/medical', label: 'Medical', icon: 'bi bi-heart-pulse', components: ['MedicalPage'] },
  { href: '/app/albums', label: 'Albums', icon: 'bi bi-images', components: ['AlbumsPage', 'AlbumDetailPage'] },
  { href: '/app/bills', label: 'Bills', icon: 'bi bi-receipt', components: ['BillsPage'] },
  { href: '/app/tasks', label: 'Tasks', icon: 'bi bi-check2-square', components: ['TasksPage'] },
]

const user = computed(() => page.props.auth?.user ?? null)
const currentPageTitle = computed(() => page.props.pageTitle ?? 'FamilyLocker')

const userInitials = computed(() => {
  const name = user.value?.name ?? ''
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
})

function isActive(components) {
  return components.includes(page.component)
}

async function handleLogout() {
  localStorage.removeItem('auth_token')
  router.post('/logout', {
    _token: page.props.csrf_token,
  })
}
</script>
