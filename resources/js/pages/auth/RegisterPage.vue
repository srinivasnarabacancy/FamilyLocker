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

        <div v-if="form.error" class="alert alert-danger py-2 small" role="alert">
          <i class="bi bi-exclamation-circle me-1" />{{ form.error }}
        </div>

        <form novalidate @submit.prevent="handleRegister">
        
          <div class="row g-2 mb-3">
            <FormField label="Your Name" required :error="form.errors.name" field="name" class="col-6">
              <template #default="{ id }">
                <div class="input-icon-wrap">
                  <i class="bi bi-person input-icon"></i>
                  <input :id="id"
                    v-model="form.name"
                    type="text"
                    class="form-control form-control-lg ps-5"
                    placeholder="John Doe"
                    required
                  />
                </div>
              </template>
            </FormField>
            <FormField label="Family Name" required :error="form.errors.family_name" field="family_name" class="col-6">
              <template #default="{ id }">
                <div class="input-icon-wrap">
                  <i class="bi bi-house input-icon"></i>
                  <input :id="id"
                    v-model="form.family_name"
                    type="text"
                    class="form-control form-control-lg ps-5"
                    placeholder="The Smith Family"
                    required
                  />
                </div>
              </template>
            </FormField>
          </div>

          <FormField label="Email Address" required :error="form.errors.email" field="email" class="mb-3">
            <template #default="{ id }">
              <div class="input-icon-wrap">
                <i class="bi bi-envelope input-icon"></i>
                <input :id="id"
                  v-model="form.email"
                  type="email"
                  class="form-control form-control-lg ps-5"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </template>
          </FormField>

          <div class="row g-2 mb-4">
            <FormField label="Password" required :error="form.errors.password" field="password" class="col-6">
              <template #default="{ id }">
                <div class="input-icon-wrap">
                  <i class="bi bi-lock input-icon"></i>
                  <input :id="id"
                    v-model="form.password"
                    type="password"
                    class="form-control form-control-lg ps-5"
                    placeholder="Min. 8 chars"
                    required
                  />
                </div>
              </template>
            </FormField>
            <FormField label="Confirm Password" required :error="form.errors.password_confirmation" field="password_confirmation" class="col-6">
              <template #default="{ id }">
                <div class="input-icon-wrap">
                  <i class="bi bi-lock-fill input-icon"></i>
                  <input :id="id"
                    v-model="form.password_confirmation"
                    type="password"
                    class="form-control form-control-lg ps-5"
                    placeholder="Repeat password"
                    required
                  />
                </div>
              </template>
            </FormField>
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
          <RouterLink to="/login" class="text-primary fw-semibold">
            Sign in
          </RouterLink>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { provide } from 'vue'
import { useRouter } from 'vue-router'
import { useForm } from '@/composables/useForm'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import AuthLeftPanel from '@/components/AuthLeftPanel.vue'
import FormField from '@/components/FormField.vue'

const router = useRouter()
const auth = useAuthStore()
const { showToast } = useToast()

const form = useForm({
  name: '',
  family_name: '',
  email: '',
  password: '',
  password_confirmation: '',
})

// FormField clears its own message as the user edits.
provide('clearFormField', (field) => form.clearField(field))

async function handleRegister() {
  const result = await form.run((data) => auth.register(data))

  // No account is created at this point. A failure here — including a mail
  // outage — leaves nothing behind, so the user can simply submit again.
  // form.error already carries the reason and is shown above the form.
  if (!result) return

  showToast(`We sent a 6-digit code to ${result.email}.`, 'success')
  router.push({ name: 'verify-email' })
}
</script>
