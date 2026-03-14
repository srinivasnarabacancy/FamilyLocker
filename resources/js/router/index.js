import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// Auth layouts
const AuthLayout = () => import('@/layouts/AuthLayout.vue')
const AppLayout = () => import('@/layouts/AppLayout.vue')

// Auth pages
const LoginPage = () => import('@/pages/auth/LoginPage.vue')
const RegisterPage = () => import('@/pages/auth/RegisterPage.vue')

// App pages
const DashboardPage = () => import('@/pages/DashboardPage.vue')
const DocumentsPage = () => import('@/pages/DocumentsPage.vue')
const ExpensesPage = () => import('@/pages/ExpensesPage.vue')
const MedicalPage = () => import('@/pages/MedicalPage.vue')
const AlbumsPage = () => import('@/pages/AlbumsPage.vue')
const AlbumDetailPage = () => import('@/pages/AlbumDetailPage.vue')
const BillsPage = () => import('@/pages/BillsPage.vue')
const TasksPage = () => import('@/pages/TasksPage.vue')
const FamilyPage = () => import('@/pages/FamilyPage.vue')
const ProfilePage = () => import('@/pages/ProfilePage.vue')

const routes = [
  {
    path: '/',
    component: AuthLayout,
    redirect: '/login',
    children: [
      { path: 'login', name: 'login', component: LoginPage },
      { path: 'register', name: 'register', component: RegisterPage },
    ],
  },
  {
    path: '/app',
    component: AppLayout,
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: { name: 'dashboard' } },
      { path: 'dashboard', name: 'dashboard', component: DashboardPage },
      { path: 'documents', name: 'documents', component: DocumentsPage },
      { path: 'expenses', name: 'expenses', component: ExpensesPage },
      { path: 'medical', name: 'medical', component: MedicalPage },
      { path: 'albums', name: 'albums', component: AlbumsPage },
      { path: 'albums/:id', name: 'album-detail', component: AlbumDetailPage },
      { path: 'bills', name: 'bills', component: BillsPage },
      { path: 'tasks', name: 'tasks', component: TasksPage },
      { path: 'family', name: 'family', component: FamilyPage },
      { path: 'profile', name: 'profile', component: ProfilePage },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/login',
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    return { top: 0 }
  },
})

router.beforeEach(async (to) => {
  const authStore = useAuthStore()
  await authStore.initialize()

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return { name: 'login' }
  }

  if ((to.name === 'login' || to.name === 'register') && authStore.isAuthenticated) {
    return { name: 'dashboard' }
  }

  return true
})

export default router
