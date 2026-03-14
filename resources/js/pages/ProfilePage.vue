<template>
  <div>
    <div class="page-header">
      <div>
        <h4 class="page-title">My Profile</h4>
        <p class="page-subtitle">Manage your personal information</p>
      </div>
    </div>

    <div class="row g-4">
      <!-- Profile Card -->
      <div class="col-12 col-md-4">
        <div class="fl-card p-4 text-center">
          <div class="position-relative d-inline-block mb-3">
            <div
              class="mx-auto profile-avatar"
              :style="!avatarPreview && !user.avatar ? `background:${avatarBg}` : ''"
            >
              <img
                v-if="avatarPreview || user.avatar"
                :src="avatarPreview || `/storage/${user.avatar}`"
                alt="Avatar"
              />
              <span v-else>{{ userInitials }}</span>
            </div>
            <label
              class="btn btn-sm btn-primary rounded-circle avatar-edit-btn"
              for="avatarInput"
            >
              <i class="bi bi-camera-fill" />
              <input id="avatarInput" type="file" accept="image/*" class="d-none" @change="handleAvatarChange" />
            </label>
          </div>
          <h5 class="fw-bold mb-1">{{ user.name }}</h5>
          <div class="text-muted small mb-2">{{ user.email }}</div>
          <span class="badge bg-primary-soft text-primary">{{ formatRoleLabel(user.role) }}</span>
          <div v-if="pendingAvatar" class="mt-3">
            <button class="btn btn-sm btn-primary w-100" :disabled="uploadingAvatar" @click="uploadAvatar">
              <span v-if="uploadingAvatar" class="spinner-border spinner-border-sm me-2" />
              <i v-else class="bi bi-cloud-upload me-2" />Upload Avatar
            </button>
            <button class="btn btn-sm btn-light w-100 mt-2" @click="cancelAvatar">Cancel</button>
          </div>
          <div v-else-if="user.avatar" class="mt-3">
            <button class="btn btn-sm btn-outline-danger w-100" :disabled="removingAvatar" @click="removeAvatar">
              <span v-if="removingAvatar" class="spinner-border spinner-border-sm me-2" />
              <i v-else class="bi bi-trash3 me-2" />Remove Avatar
            </button>
          </div>
        </div>
      </div>

      <!-- Edit Profile Form -->
      <div class="col-12 col-md-8">
        <div class="fl-card p-4 mb-4">
          <h6 class="fw-bold mb-3">Personal Information</h6>
          <form @submit.prevent="saveProfile">
            <div class="row g-3">
              <div class="col-md-6">
                <label class="form-label">Full Name *</label>
                <input v-model="profileForm.name" type="text" class="form-control" required />
              </div>
              <div class="col-md-6">
                <label class="form-label">Email</label>
                <input :value="user.email" type="email" class="form-control" readonly disabled />
              </div>
              <div class="col-md-6">
                <label class="form-label">Phone</label>
                <input v-model="profileForm.phone" type="tel" class="form-control" placeholder="+91 XXXXX XXXXX" />
              </div>
              <div class="col-md-6">
                <label class="form-label">Date of Birth</label>
                <input v-model="profileForm.date_of_birth" type="date" class="form-control" />
              </div>
              <div class="col-md-6">
                <label class="form-label">Relation in Family</label>
                <select v-model="profileForm.relation" class="form-select">
                  <option value="">Select</option>
                  <option v-for="r in relations" :key="r" :value="r">{{ r }}</option>
                </select>
              </div>
              <div class="col-12">
                <button type="submit" class="btn btn-primary" :disabled="savingProfile">
                  <span v-if="savingProfile" class="spinner-border spinner-border-sm me-2" />
                  <i v-else class="bi bi-check-lg me-2" />Save Changes
                </button>
              </div>
            </div>
          </form>
        </div>

        <!-- Change Password -->
        <div class="fl-card p-4">
          <h6 class="fw-bold mb-3">Change Password</h6>
          <form @submit.prevent="changePassword">
            <div class="row g-3">
              <div class="col-md-6">
                <label class="form-label">Current Password *</label>
                <div class="input-group">
                  <input
                    v-model="pwdForm.current_password"
                    :type="showPwd.current ? 'text' : 'password'"
                    class="form-control"
                    required
                  />
                  <button type="button" class="btn btn-outline-secondary" @click="showPwd.current = !showPwd.current">
                    <i :class="showPwd.current ? 'bi bi-eye-slash' : 'bi bi-eye'" />
                  </button>
                </div>
              </div>
              <div class="col-md-6">
                <label class="form-label">New Password *</label>
                <div class="input-group">
                  <input
                    v-model="pwdForm.password"
                    :type="showPwd.new ? 'text' : 'password'"
                    class="form-control"
                    required
                    minlength="8"
                  />
                  <button type="button" class="btn btn-outline-secondary" @click="showPwd.new = !showPwd.new">
                    <i :class="showPwd.new ? 'bi bi-eye-slash' : 'bi bi-eye'" />
                  </button>
                </div>
              </div>
              <div class="col-md-6">
                <label class="form-label">Confirm Password *</label>
                <div class="input-group">
                  <input
                    v-model="pwdForm.password_confirmation"
                    :type="showPwd.confirm ? 'text' : 'password'"
                    class="form-control"
                    required
                  />
                  <button type="button" class="btn btn-outline-secondary" @click="showPwd.confirm = !showPwd.confirm">
                    <i :class="showPwd.confirm ? 'bi bi-eye-slash' : 'bi bi-eye'" />
                  </button>
                </div>
              </div>
              <div v-if="pwdError" class="col-12">
                <div class="alert alert-danger py-2 small mb-0">{{ pwdError }}</div>
              </div>
              <div class="col-12">
                <button type="submit" class="btn btn-warning" :disabled="changingPwd">
                  <span v-if="changingPwd" class="spinner-border spinner-border-sm me-2" />
                  <i v-else class="bi bi-shield-lock me-2" />Update Password
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, computed, watch } from 'vue'
import { router, usePage } from '@inertiajs/vue3'
import { useToast } from '@/composables/useToast'
import { formatRoleLabel } from '@/constants/roles'
import api from '@/services/api'

const page = usePage()
const { showToast } = useToast()

const user = computed(() => page.props.auth?.user ?? {})

const profileForm = reactive({ name: '', phone: '', date_of_birth: '', relation: '' })
const savingProfile = ref(false)

const pwdForm = reactive({ current_password: '', password: '', password_confirmation: '' })
const changingPwd = ref(false)
const pwdError = ref('')
const showPwd = reactive({ current: false, new: false, confirm: false })

const avatarPreview = ref(null)
const pendingAvatar = ref(null)
const uploadingAvatar = ref(false)
const removingAvatar = ref(false)

const relations = ['Spouse', 'Son', 'Daughter', 'Father', 'Mother', 'Brother', 'Sister', 'Grandparent', 'Uncle', 'Aunt', 'Other']

const avatarBg = computed(() => {
  const colors = ['#6C5CE7', '#00b894', '#fdcb6e', '#e17055', '#74b9ff']
  const idx = (user.value.name ?? '').charCodeAt(0) % colors.length
  return colors[idx]
})

const userInitials = computed(() => {
  return (user.value.name ?? '')
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
})

function loadProfileForm() {
  profileForm.name = user.value.name ?? ''
  profileForm.phone = user.value.phone ?? ''
  profileForm.date_of_birth = user.value.date_of_birth?.substring(0, 10) ?? ''
  profileForm.relation = user.value.relation ?? ''
}

async function saveProfile() {
  savingProfile.value = true
  try {
    await api.post('/auth/profile', profileForm)
    router.reload({ only: ['auth'], preserveState: true, preserveScroll: true })
    showToast('Profile updated!', 'success')
  } catch (err) {
    showToast(err.response?.data?.message ?? 'Failed to update', 'danger')
  } finally {
    savingProfile.value = false
  }
}

async function changePassword() {
  pwdError.value = ''
  if (pwdForm.password !== pwdForm.password_confirmation) {
    pwdError.value = 'Passwords do not match'
    return
  }
  changingPwd.value = true
  try {
    await api.post('/auth/change-password', pwdForm)
    showToast('Password changed successfully!', 'success')
    Object.assign(pwdForm, { current_password: '', password: '', password_confirmation: '' })
  } catch (err) {
    pwdError.value = err.response?.data?.message ?? 'Failed to change password'
  } finally {
    changingPwd.value = false
  }
}

function handleAvatarChange(e) {
  const file = e.target.files[0]
  if (!file) return
  pendingAvatar.value = file
  avatarPreview.value = URL.createObjectURL(file)
}

function cancelAvatar() {
  pendingAvatar.value = null
  avatarPreview.value = null
}

function getErrorMessage(err, fallback) {
  const errors = err.response?.data?.errors
  const firstError = errors && typeof errors === 'object'
    ? Object.values(errors).flat().find(Boolean)
    : null

  return firstError ?? err.response?.data?.message ?? fallback
}

async function uploadAvatar() {
  if (!pendingAvatar.value) return
  uploadingAvatar.value = true
  const fd = new FormData()
  fd.append('avatar', pendingAvatar.value)
  try {
    await api.post('/auth/profile', fd)
    router.reload({ only: ['auth'], preserveState: true, preserveScroll: true })
    pendingAvatar.value = null
    avatarPreview.value = null
    showToast('Avatar updated!', 'success')
  } catch (err) {
    showToast(getErrorMessage(err, 'Failed to upload avatar'), 'danger')
  } finally {
    uploadingAvatar.value = false
  }
}

async function removeAvatar() {
  if (!user.value.avatar || !window.confirm('Remove your current avatar?')) return

  removingAvatar.value = true
  try {
    await api.post('/auth/profile', { remove_avatar: true })
    router.reload({ only: ['auth'], preserveState: true, preserveScroll: true })
    pendingAvatar.value = null
    avatarPreview.value = null
    showToast('Avatar removed!', 'success')
  } catch (err) {
    showToast(getErrorMessage(err, 'Failed to remove avatar'), 'danger')
  } finally {
    removingAvatar.value = false
  }
}

watch(user, () => {
  loadProfileForm()
}, { immediate: true, deep: true })
</script>

<style scoped>
.profile-avatar {
  width: 96px;
  height: 96px;
  border-radius: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: 700;
  color: #fff;
  overflow: hidden;
}
.profile-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.avatar-edit-btn {
  position: absolute;
  bottom: -6px;
  right: -6px;
  width: 28px;
  height: 28px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
}
</style>
