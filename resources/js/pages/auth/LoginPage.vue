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
            <div class="input-icon-wrap">
              <i class="bi bi-lock input-icon"></i>
              <input
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                class="form-control form-control-lg ps-5 pe-5"
                :class="{ 'is-invalid': form.errors.password }"
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                class="password-toggle"
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

<style scoped>
/* ── Input wrapper ──────────────────────────────────── */
.input-icon-wrap {
  position: relative;
}

/* Icon anchored to the left */
.input-icon-wrap .input-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: #a0aec0;
  font-size: 1rem;
  z-index: 5;
  pointer-events: none;
  transition: color 0.2s ease;
}

/* Float the eye-toggle inside the right edge */
.password-toggle {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  z-index: 5;
  background: transparent;
  border: none;
  padding: 0.25rem 0.4rem;
  color: #a0aec0;
  font-size: 1.05rem;
  line-height: 1;
  cursor: pointer;
  border-radius: 6px;
  transition: color 0.2s ease, background 0.2s ease;

  &:hover {
    color: #6c5ce7;
    background: rgba(108, 92, 231, 0.08);
  }

  &:focus-visible {
    outline: 2px solid rgba(108, 92, 231, 0.4);
    outline-offset: 1px;
  }
}

/* ── Input fields ────────────────────────────────────── */
:deep(.form-control) {
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  background: #fafbff;
  color: #2d3748;
  font-size: 0.95rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;

  &::placeholder {
    color: #c4cdd8;
  }

  &:hover:not(:focus):not(.is-invalid) {
    border-color: #b8b8f8;
    background: #fff;
  }

  &:focus {
    border-color: #6c5ce7;
    background: #fff;
    box-shadow: 0 0 0 3.5px rgba(108, 92, 231, 0.14);
    outline: none;
  }

  /* Shift icon colour when input is focused */
  &:focus ~ .input-icon,
  &:focus + .input-icon {
    color: #6c5ce7;
  }

  &.is-invalid {
    border-color: #e53e3e;
    background: #fff5f5;
    box-shadow: 0 0 0 3px rgba(229, 62, 62, 0.1);
  }
}

/* Colour the left icon when the sibling input is focused */
.input-icon-wrap:focus-within .input-icon {
  color: #6c5ce7;
}
</style>
