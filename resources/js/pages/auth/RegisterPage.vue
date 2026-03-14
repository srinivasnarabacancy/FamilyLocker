<template>
  <div class="auth-card">
    <div class="auth-logo">
      <div class="logo-box">🏠</div>
      <div class="logo-text">
        <h2>FamilyLocker</h2>
        <p>Create your family vault.</p>
      </div>
    </div>

    <h5 class="fw-bold mb-1">Get started</h5>
    <p class="text-muted small mb-4">Create your account and set up your family.</p>

    <form @submit.prevent="handleRegister">
        
      <div class="mb-3">
        <label class="form-label">Your Name</label>
        <input
          v-model="form.name"
          type="text"
          class="form-control"
          :class="{ 'is-invalid': form.errors.name }"
          placeholder="John Doe"
          required
        />
        <div v-if="form.errors.name" class="invalid-feedback">{{ form.errors.name }}</div>
      </div>
      <div class="mb-3">
        <label class="form-label">Family Name</label>
        <input
          v-model="form.family_name"
          type="text"
          class="form-control"
          :class="{ 'is-invalid': form.errors.family_name }"
          placeholder="e.g. The Smith Family"
          required
        />
        <div v-if="form.errors.family_name" class="invalid-feedback">{{ form.errors.family_name }}</div>
      </div>
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
      <div class="row g-3 mb-3">
        <div class="col-6">
          <label class="form-label">Password</label>
          <input
            v-model="form.password"
            type="password"
            class="form-control"
            :class="{ 'is-invalid': form.errors.password }"
            placeholder="Min. 8 characters"
            required
          />
          <div v-if="form.errors.password" class="invalid-feedback">{{ form.errors.password }}</div>
        </div>
        <div class="col-6">
          <label class="form-label">Confirm Password</label>
          <input
            v-model="form.password_confirmation"
            type="password"
            class="form-control"
            placeholder="Repeat password"
            required
          />
        </div>
      </div>

      <button
        type="submit"
        class="btn btn-primary w-100 py-2"
        :disabled="form.processing"
      >
        <span v-if="form.processing" class="spinner-border spinner-border-sm me-2" />
        <span v-else><i class="bi bi-person-plus me-2" /></span>
        Create Account
      </button>
    </form>

    <p class="text-center text-muted small mt-4 mb-0">
      Already have an account?
      <Link href="/login" class="text-primary fw-semibold">
        Sign in
      </Link>
    </p>
  </div>
</template>

<script setup>
import { Link, useForm, usePage } from '@inertiajs/vue3'

const form = useForm({
  name: '',
  family_name: '',
  email: '',
  password: '',
  password_confirmation: '',
})
const page = usePage()

async function handleRegister() {
  form
    .transform((data) => ({
      ...data,
      _token: page.props.csrf_token,
    }))
    .post('/register', {
      preserveScroll: true,
    })
}
</script>
