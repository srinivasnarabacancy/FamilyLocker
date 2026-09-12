<template>
  <div class="app-layout">
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
        <RouterLink
          v-for="item in mainNavItems"
          :key="item.href"
          :to="item.href"
          class="nav-link"
          :class="{ active: isActive(item.routes) }"
          @click="sidebarOpen = false"
        >
          <span class="nav-icon"><i :class="item.icon" /></span>
          <span class="nav-label">{{ item.label }}</span>
          <span v-if="isActive(item.routes)" class="nav-active-dot" />
        </RouterLink>

        <div class="nav-divider" />
        <span class="nav-section-title">Account</span>
        <RouterLink
          to="/app/family"
          class="nav-link"
          :class="{ active: isActive(['family']) }"
          @click="sidebarOpen = false"
        >
          <span class="nav-icon"><i class="bi bi-people" /></span>
          <span class="nav-label">Family</span>
          <span v-if="isActive(['family'])" class="nav-active-dot" />
        </RouterLink>
        <RouterLink
          to="/app/profile"
          class="nav-link"
          :class="{ active: isActive(['profile']) }"
          @click="sidebarOpen = false"
        >
          <span class="nav-icon"><i class="bi bi-person-circle" /></span>
          <span class="nav-label">Profile</span>
          <span v-if="isActive(['profile'])" class="nav-active-dot" />
        </RouterLink>
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
              <img v-if="user?.avatar" :src="`/storage/${user.avatar}`" :alt="user?.name" @error="$event.target.style.display='none'" />
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
                <img v-if="user?.avatar" :src="`/storage/${user.avatar}`" :alt="user?.name" @error="$event.target.style.display='none'" />
                <span v-else>{{ userInitials }}</span>
              </div>
              <div>
                <div class="topbar-dropdown__name">{{ user?.name }}</div>
                <div class="topbar-dropdown__role">{{ formatRoleLabel(user?.role) }}</div>
              </div>
            </div>
            <div class="topbar-dropdown__divider" />
            <RouterLink to="/app/profile" class="topbar-dropdown__item" @click="userMenuOpen = false">
              <i class="bi bi-person-circle" />
              My Profile
            </RouterLink>
            <button class="topbar-dropdown__item topbar-dropdown__item--danger" @click="userMenuOpen = false; handleLogout()">
              <i class="bi bi-box-arrow-right" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <!-- Page body -->
      <main class="main-content__body">
        <router-view />
      </main>
    </div>

    <!-- Toasts are rendered by App.vue (bottom-right). ToastContainer is the
         top-centre variant — disabled for now so notifications do not appear
         twice. Re-enable here and remove App.vue's inline container to switch. -->
    <!-- <ToastContainer /> -->

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
import { useRoute, useRouter } from 'vue-router'
// import ToastContainer from '@/components/ToastContainer.vue'
import ConfirmModal from '@/components/ConfirmModal.vue'
import { formatRoleLabel } from '@/constants/roles'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const sidebarOpen = ref(false)

// `routes` replaces the Inertia component names the active check used to match.
const mainNavItems = [
  { href: '/app/dashboard', label: 'Dashboard', icon: 'bi bi-grid-1x2', routes: ['dashboard'] },
  { href: '/app/documents', label: 'Documents', icon: 'bi bi-file-earmark-text', routes: ['documents'] },
  { href: '/app/expenses', label: 'Expenses', icon: 'bi bi-wallet2', routes: ['expenses'] },
  { href: '/app/medical', label: 'Medical', icon: 'bi bi-heart-pulse', routes: ['medical'] },
  { href: '/app/albums', label: 'Albums', icon: 'bi bi-images', routes: ['albums', 'album-detail'] },
  { href: '/app/bills', label: 'Bills', icon: 'bi bi-receipt', routes: ['bills'] },
  { href: '/app/tasks', label: 'Tasks', icon: 'bi bi-check2-square', routes: ['tasks'] },
  { href: '/app/reminders', label: 'Reminders', icon: 'bi bi-bell', routes: ['reminders'] },
]

const user = computed(() => auth.user)
const currentPageTitle = computed(() => route.meta.title ?? 'FamilyLocker')

const userInitials = computed(() => {
  const name = user.value?.name ?? ''
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
})

function isActive(routeNames) {
  return routeNames.includes(route.name)
}

const userMenuOpen = ref(false)

function closeUserMenu() {
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
  try {
    await auth.logout()
    router.push({ name: 'login' })
  } finally {
    loggingOut.value = false
    showLogoutModal.value = false
  }
}
</script>
