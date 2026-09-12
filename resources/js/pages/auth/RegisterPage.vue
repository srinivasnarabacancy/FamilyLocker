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

        <h3 class="fw-bold mb-1">Get started</h3>
        <p class="text-muted small mb-4">Create your account and set up your family.</p>

        <form @submit.prevent="handleRegister">
        
          <div class="row g-2 mb-3">
            <div class="col-6">
              <label class="form-label fw-semibold">Your Name</label>
              <div class="input-icon-wrap">
                <i class="bi bi-person input-icon"></i>
                <input
                  v-model="form.name"
                  type="text"
                  class="form-control form-control-lg ps-5"
                  :class="{ 'is-invalid': form.errors.name }"
                  placeholder="John Doe"
                  required
                />
              </div>
              <div v-if="form.errors.name" class="invalid-feedback d-block">{{ form.errors.name }}</div>
            </div>
            <div class="col-6">
              <label class="form-label fw-semibold">Family Name</label>
              <div class="input-icon-wrap">
                <i class="bi bi-house input-icon"></i>
                <input
                  v-model="form.family_name"
                  type="text"
                  class="form-control form-control-lg ps-5"
                  :class="{ 'is-invalid': form.errors.family_name }"
                  placeholder="The Smith Family"
                  required
                />
              </div>
              <div v-if="form.errors.family_name" class="invalid-feedback d-block">{{ form.errors.family_name }}</div>
            </div>
          </div>

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

          <div class="row g-2 mb-4">
            <div class="col-6">
              <label class="form-label fw-semibold">Password</label>
              <div class="input-icon-wrap">
                <i class="bi bi-lock input-icon"></i>
                <input
                  v-model="form.password"
                  type="password"
                  class="form-control form-control-lg ps-5"
                  :class="{ 'is-invalid': form.errors.password }"
                  placeholder="Min. 8 chars"
                  required
                />
              </div>
              <div v-if="form.errors.password" class="invalid-feedback d-block">{{ form.errors.password }}</div>
            </div>
            <div class="col-6">
              <label class="form-label fw-semibold">Confirm Password</label>
              <div class="input-icon-wrap">
                <i class="bi bi-lock-fill input-icon"></i>
                <input
                  v-model="form.password_confirmation"
                  type="password"
                  class="form-control form-control-lg ps-5"
                  placeholder="Repeat password"
                  required
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            class="btn btn-primary w-100 py-2 fs-6 fw-semibold"
            :disabled="form.processing"
          >
            <span v-if="form.processing" class="spinner-border spinner-border-sm me-2" />
            <span v-else><i class="bi bi-person-plus me-2" /></span>
            Create Account
          </button>
        </form>

        <div class="auth-divider"><span>or</span></div>

        <p class="text-center text-muted small mb-0">
          Already have an account?
          <Link href="/login" class="text-primary fw-semibold">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Link, useForm, usePage } from '@inertiajs/vue3'
import AuthLeftPanel from '@/components/AuthLeftPanel.vue'

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
