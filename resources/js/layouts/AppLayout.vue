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
      <!-- Brand -->
      <div class="sidebar__brand">
        <div class="brand-logo-wrap">
          <div class="brand-logo">🏠</div>
          <div class="brand-glow" />
        </div>
        <div class="brand-text">
          <span class="brand-name">FamilyLocker</span>
          <span class="brand-tagline">Family Workspace</span>
        </div>
        <button class="sidebar-close d-lg-none" @click="sidebarOpen = false">
          <i class="bi bi-x-lg" />
        </button>
      </div>

      <!-- Nav -->
      <nav class="sidebar__nav">
        <span class="nav-section-title">Main Menu</span>
        <Link
          v-for="item in mainNavItems"
          :key="item.href"
          :href="item.href"
          class="nav-link"
          :class="{ active: isActive(item.components) }"
          @click="sidebarOpen = false"
        >
          <span class="nav-icon"><i :class="item.icon" /></span>
          <span class="nav-label">{{ item.label }}</span>
          <span v-if="isActive(item.components)" class="nav-active-dot" />
        </Link>

        <div class="nav-divider" />
        <span class="nav-section-title">Account</span>
        <Link
          href="/app/family"
          class="nav-link"
          :class="{ active: isActive(['FamilyPage']) }"
          @click="sidebarOpen = false"
        >
          <span class="nav-icon"><i class="bi bi-people" /></span>
          <span class="nav-label">Family</span>
          <span v-if="isActive(['FamilyPage'])" class="nav-active-dot" />
        </Link>
        <Link
          href="/app/profile"
          class="nav-link"
          :class="{ active: isActive(['ProfilePage']) }"
          @click="sidebarOpen = false"
        >
          <span class="nav-icon"><i class="bi bi-person-circle" /></span>
          <span class="nav-label">Profile</span>
          <span v-if="isActive(['ProfilePage'])" class="nav-active-dot" />
        </Link>
      </nav>

    </aside>

    <!-- Main content -->
    <div class="main-content">
      <!-- Topbar -->
      <header class="main-content__topbar">
        <div class="topbar-left">
          <button
            class="btn btn-icon btn-light d-lg-none"
            @click="sidebarOpen = !sidebarOpen"
          >
            <i class="bi bi-list fs-5" />
          </button>
          <div>
            <p class="topbar-title">{{ currentPageTitle }}</p>
            <p class="topbar-subtitle" v-if="user?.family?.name">
              {{ user.family.name }}
            </p>
          </div>
        </div>

        <div class="topbar-user-menu" :class="{ open: userMenuOpen }">
          <button class="topbar-user-trigger" @click.stop="userMenuOpen = !userMenuOpen">
            <div class="topbar-avatar">
              <img v-if="user?.avatar" :src="`/storage/${user.avatar}`" :alt="user?.name" />
              <span v-else>{{ userInitials }}</span>
            </div>
            <div class="d-none d-sm-block text-start">
              <div class="topbar-user-name">{{ user?.name }}</div>
              <div class="topbar-user-role">{{ formatRoleLabel(user?.role) }}</div>
            </div>
            <i class="bi bi-chevron-down topbar-chevron d-none d-sm-block" />
          </button>

          <div v-if="userMenuOpen" class="topbar-dropdown">
            <div class="topbar-dropdown__header">
              <div class="topbar-avatar topbar-avatar--lg">
                <img v-if="user?.avatar" :src="`/storage/${user.avatar}`" :alt="user?.name" />
                <span v-else>{{ userInitials }}</span>
              </div>
              <div>
                <div class="topbar-dropdown__name">{{ user?.name }}</div>
                <div class="topbar-dropdown__role">{{ formatRoleLabel(user?.role) }}</div>
              </div>
            </div>
            <div class="topbar-dropdown__divider" />
            <Link href="/app/profile" class="topbar-dropdown__item" @click="userMenuOpen = false">
              <i class="bi bi-person-circle" />
              My Profile
            </Link>
            <button class="topbar-dropdown__item topbar-dropdown__item--danger" @click="userMenuOpen = false; handleLogout()">
              <i class="bi bi-box-arrow-right" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <!-- Page body -->
      <main class="main-content__body">
        <slot />
      </main>
    </div>

    <ToastContainer />

    <!-- Logout Confirmation Modal -->
    <ConfirmModal
      v-model="showLogoutModal"
      title="Are you sure you want to log out?"
      message="You'll need to log in again to access your account."
      confirm-text="Logout"
      cancel-text="Cancel"
      icon="bi bi-box-arrow-right"
      variant="danger"
      :loading="loggingOut"
      @confirm="confirmLogout"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { Link, router, usePage } from '@inertiajs/vue3'
import CsrfMetaSync from '@/components/CsrfMetaSync.vue'
import ToastContainer from '@/components/ToastContainer.vue'
import ConfirmModal from '@/components/ConfirmModal.vue'
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

const userMenuOpen = ref(false)

function closeUserMenu(e) {
  userMenuOpen.value = false
}
onMounted(() => document.addEventListener('click', closeUserMenu))
onBeforeUnmount(() => document.removeEventListener('click', closeUserMenu))

const showLogoutModal = ref(false)
const loggingOut = ref(false)

function handleLogout() {
  showLogoutModal.value = true
}

async function confirmLogout() {
  loggingOut.value = true
  localStorage.removeItem('auth_token')
  router.post('/logout', {
    _token: page.props.csrf_token,
  })
}
</script>
