<template>
  <div class="auth-card">
    <div class="auth-logo">
      <div class="logo-box">🏠</div>
      <div class="logo-text">
        <h2>FamilyLocker</h2>
        <p>Your family, secured.</p>
      </div>
    </div>

    <h5 class="fw-bold mb-1">Welcome back!</h5>
    <p class="text-muted small mb-4">Sign in to your account to continue.</p>

    <form @submit.prevent="handleLogin">
      <div class="mb-3">
        <label class="form-label">Email Address</label>
        <input
          v-model="form.email"
          type="email"
          class="form-control"
          :class="{ 'is-invalid': form.errors.email }"
          placeholder="you@example.com"
          required
        />
        <div v-if="form.errors.email" class="invalid-feedback">{{ form.errors.email }}</div>
      </div>
      <div class="mb-3">
        <label class="form-label">Password</label>
        <div class="input-group">
          <input
            v-model="form.password"
            :type="showPassword ? 'text' : 'password'"
            class="form-control"
            :class="{ 'is-invalid': form.errors.password }"
            placeholder="Enter your password"
            required
          />
          <button
            type="button"
            class="btn btn-outline-secondary"
            @click="showPassword = !showPassword"
          >
            <i :class="showPassword ? 'bi bi-eye-slash' : 'bi bi-eye'" />
          </button>
        </div>
        <div v-if="form.errors.password" class="invalid-feedback d-block">{{ form.errors.password }}</div>
      </div>

      <button
        type="submit"
        class="btn btn-primary w-100 py-2"
        :disabled="form.processing"
      >
        <span v-if="form.processing" class="spinner-border spinner-border-sm me-2" />
        <span v-else><i class="bi bi-box-arrow-in-right me-2" /></span>
        Sign In
      </button>
    </form>

    <p class="text-center text-muted small mt-4 mb-0">
      Don't have an account?
      <Link href="/register" class="text-primary fw-semibold">
        Create one
      </Link>
    </p>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Link, useForm, usePage } from '@inertiajs/vue3'

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
