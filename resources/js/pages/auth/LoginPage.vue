<template>
  <div class="auth-split">
    <!-- Left Panel (shared) -->
    <AuthLeftPanel />

    <!-- Right Panel -->
    <div class="auth-split__right">
      <div class="auth-split__form-wrap">

        <!-- Mobile brand (shown only on small screens) -->
        <div class="auth-split__mobile-brand d-lg-none mb-4">
          <div class="auth-split__brand-icon">🏠</div>
          <span>FamilyLocker</span>
        </div>

        <h3 class="fw-bold mb-1">Welcome back!</h3>
        <p class="text-muted small mb-4">Sign in to your account to continue.</p>

        <form @submit.prevent="handleLogin">
          <div class="mb-3">
            <label class="form-label fw-semibold">Email Address</label>
            <div class="input-icon-wrap">
              <i class="bi bi-envelope input-icon"></i>
              <input
                v-model="form.email"
                type="email"
                class="form-control form-control-lg ps-5"
                :class="{ 'is-invalid': form.errors.email }"
                placeholder="you@example.com"
                required
              />
            </div>
            <div v-if="form.errors.email" class="invalid-feedback d-block">{{ form.errors.email }}</div>
          </div>

          <div class="mb-4">
            <label class="form-label fw-semibold">Password</label>
            <div class="input-group input-icon-wrap">
              <i class="bi bi-lock input-icon"></i>
              <input
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                class="form-control form-control-lg ps-5"
                :class="{ 'is-invalid': form.errors.password }"
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                class="btn btn-outline-secondary"
                @click="showPassword = !showPassword"
                tabindex="-1"
              >
                <i :class="showPassword ? 'bi bi-eye-slash' : 'bi bi-eye'" />
              </button>
            </div>
            <div v-if="form.errors.password" class="invalid-feedback d-block">{{ form.errors.password }}</div>
          </div>

          <button
            type="submit"
            class="btn btn-primary w-100 py-2 fs-6 fw-semibold"
            :disabled="form.processing"
          >
            <span v-if="form.processing" class="spinner-border spinner-border-sm me-2" />
            <span v-else><i class="bi bi-box-arrow-in-right me-2" /></span>
            Sign In
          </button>
        </form>

        <div class="auth-divider"><span>or</span></div>

        <p class="text-center text-muted small mb-0">
          Don't have an account?
          <Link href="/register" class="text-primary fw-semibold">
            Create one free
          </Link>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Link, useForm, usePage } from '@inertiajs/vue3'
import AuthLeftPanel from '@/components/AuthLeftPanel.vue'

const form = useForm({ email: '', password: '' })
const showPassword = ref(false)
const page = usePage()

async function handleLogin() {
  form
    .transform((data) => ({
      ...data,
      _token: page.props.csrf_token,
    }))
    .post('/login', {
      preserveScroll: true,
    })
}
</script>
