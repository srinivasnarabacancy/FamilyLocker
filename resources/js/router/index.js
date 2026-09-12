import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const AuthLayout = () => import('@/layouts/AuthLayout.vue')
const AppLayout = () => import('@/layouts/AppLayout.vue')

const LoginPage = () => import('@/pages/auth/LoginPage.vue')
const RegisterPage = () => import('@/pages/auth/RegisterPage.vue')
const VerifyEmailPage = () => import('@/pages/auth/VerifyEmailPage.vue')

const DashboardPage = () => import('@/pages/DashboardPage.vue')
const DocumentsPage = () => import('@/pages/DocumentsPage.vue')
const ExpensesPage = () => import('@/pages/ExpensesPage.vue')
const MedicalPage = () => import('@/pages/MedicalPage.vue')
const AlbumsPage = () => import('@/pages/AlbumsPage.vue')
const AlbumDetailPage = () => import('@/pages/AlbumDetailPage.vue')
const BillsPage = () => import('@/pages/BillsPage.vue')
const TasksPage = () => import('@/pages/TasksPage.vue')
const RemindersPage = () => import('@/pages/RemindersPage.vue')
const FamilyPage = () => import('@/pages/FamilyPage.vue')
const ProfilePage = () => import('@/pages/ProfilePage.vue')

// `title` replaces the `pageTitle` prop the Inertia routes used to pass down.
const routes = [
  {
    path: '/',
    component: AuthLayout,
    redirect: '/login',
    children: [
      { path: 'login', name: 'login', component: LoginPage, meta: { guest: true, title: 'Login' } },
      { path: 'register', name: 'register', component: RegisterPage, meta: { guest: true, title: 'Register' } },
      {
        path: 'verify-email',
        name: 'verify-email',
        component: VerifyEmailPage,
        // Reachable two ways: mid sign-up (no account exists yet, so no
        // session), or signed in with an address still unverified.
        meta: { allowUnverified: true, title: 'Verify Email' },
      },
    ],
  },
  {
    path: '/app',
    component: AppLayout,
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: { name: 'dashboard' } },
      { path: 'dashboard', name: 'dashboard', component: DashboardPage, meta: { title: 'Dashboard' } },
      { path: 'documents', name: 'documents', component: DocumentsPage, meta: { title: 'Documents' } },
      { path: 'expenses', name: 'expenses', component: ExpensesPage, meta: { title: 'Expenses' } },
      { path: 'medical', name: 'medical', component: MedicalPage, meta: { title: 'Medical' } },
      { path: 'albums', name: 'albums', component: AlbumsPage, meta: { title: 'Albums' } },
      { path: 'albums/:id', name: 'album-detail', component: AlbumDetailPage, meta: { title: 'Album' } },
      { path: 'bills', name: 'bills', component: BillsPage, meta: { title: 'Bills' } },
      { path: 'tasks', name: 'tasks', component: TasksPage, meta: { title: 'Tasks' } },
      { path: 'reminders', name: 'reminders', component: RemindersPage, meta: { title: 'Reminders' } },
      { path: 'family', name: 'family', component: FamilyPage, meta: { title: 'Family' } },
      { path: 'profile', name: 'profile', component: ProfilePage, meta: { title: 'Profile' } },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/login' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    return { top: 0 }
  },
})

/**
 * Mirrors the Laravel middleware stack the Inertia routes used:
 * `guest`, `auth`, and `verified`.
 */
router.beforeEach(async (to) => {
  const auth = useAuthStore()
  await auth.initialize()

  // A sign-up awaiting its code has no session yet, so it is admitted to the
  // verification screen and nowhere else.
  if (to.name === 'verify-email' && !auth.isAuthenticated) {
    return auth.pendingRegistration() ? true : { name: 'register' }
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login' }
  }

  // Signed in but unverified: everything except the OTP screen is off limits.
  if (auth.isAuthenticated && !auth.isVerified && to.meta.requiresAuth && !to.meta.allowUnverified) {
    return { name: 'verify-email' }
  }

  if (auth.isAuthenticated && auth.isVerified) {
    // Already verified — the OTP screen and the guest pages have nothing to show.
    if (to.meta.guest || to.name === 'verify-email') return { name: 'dashboard' }
  }

  if (to.meta.guest && auth.isAuthenticated && !auth.isVerified) {
    return { name: 'verify-email' }
  }

  return true
})

router.afterEach((to) => {
  const title = to.meta.title
  document.title = title ? `${title} - FamilyLocker` : 'FamilyLocker'
})

export default router
