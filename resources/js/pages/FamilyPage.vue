<template>
  <div>
    <div class="page-header">
      <div>
        <h4 class="page-title">Family</h4>
        <p class="page-subtitle">Manage your family members</p>
      </div>
      <button v-if="canManageFamily" class="btn btn-primary" @click="openInviteModal">
        <i class="bi bi-person-plus me-2" />Invite Member
      </button>
    </div>

    <!-- Family Info Card -->
    <div class="fl-card p-4 mb-4">
      <div class="d-flex align-items-center gap-4 flex-wrap">
        <div class="family-avatar">
          <i class="bi bi-house-heart" />
        </div>
        <div class="flex-grow-1">
          <div v-if="editingFamily">
            <input v-model="familyForm.name" type="text" class="form-control form-control-lg fw-bold mb-1" style="max-width:300px" />
            <div class="d-flex gap-2 mt-2">
              <button class="btn btn-primary btn-sm" :disabled="savingFamily" @click="saveFamily">
                <span v-if="savingFamily" class="spinner-border spinner-border-sm me-2" />Save
              </button>
              <button class="btn btn-light btn-sm" @click="editingFamily = false">Cancel</button>
            </div>
          </div>
          <div v-else>
            <h4 class="fw-bold mb-1">{{ family.name }}</h4>
            <p class="text-muted mb-0">{{ members.length }} member{{ members.length !== 1 ? 's' : '' }}</p>
          </div>
        </div>
        <button v-if="canManageFamily && !editingFamily" class="btn btn-outline-primary" @click="startEditFamily">
          <i class="bi bi-pencil me-2" />Edit Family
        </button>
      </div>
    </div>

    <!-- Members Grid -->
    <div v-if="membersLoading" class="page-loader"><div class="spinner-border" /></div>
    <div v-else class="row g-3">
      <div v-for="member in members" :key="member.id" class="col-12 col-sm-6 col-lg-4">
        <div class="fl-card p-3">
          <div class="d-flex align-items-center gap-3">
            <div class="member-avatar" :style="`background:${memberColor(member.name)}`">
              <img v-if="member.avatar" :src="`/storage/${member.avatar}`" :alt="member.name" />
              <span v-else>{{ initials(member.name) }}</span>
            </div>
            <div class="flex-grow-1 min-w-0">
              <div class="fw-bold text-truncate">{{ member.name }}</div>
              <div class="text-muted small text-truncate">{{ member.email || 'No email added' }}</div>
              <div class="d-flex flex-wrap gap-1 mt-1">
                <span class="badge bg-primary-soft text-primary px-2">{{ formatRoleLabel(member.role) }}</span>
                <span v-if="member.relation" class="badge bg-secondary-soft text-secondary text-capitalize px-2">{{ member.relation }}</span>
              </div>
            </div>
            <div v-if="canManageFamily && member.id !== currentUser?.id" class="dropdown">
              <button class="btn btn-icon btn-light btn-sm" data-bs-toggle="dropdown">
                <i class="bi bi-three-dots-vertical" />
              </button>
              <ul class="dropdown-menu dropdown-menu-end">
                <li><a class="dropdown-item text-danger" href="#" @click.prevent="removeMember(member)"><i class="bi bi-person-x me-2" />Remove</a></li>
              </ul>
            </div>
          </div>
          <div v-if="member.phone || member.date_of_birth" class="mt-2 pt-2 border-top d-flex gap-3 flex-wrap">
            <span v-if="member.phone" class="small text-muted"><i class="bi bi-phone me-1" />{{ member.phone }}</span>
            <span v-if="member.date_of_birth" class="small text-muted"><i class="bi bi-cake me-1" />{{ formatDate(member.date_of_birth) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Invite Member Modal -->
    <div class="modal fade" id="inviteModal" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Invite Family Member</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" />
          </div>
          <div class="modal-body">
            <p class="text-muted small mb-3">Either email or mobile number is required. Add an email to send the invitation automatically.</p>
            <form id="inviteForm" @submit.prevent="handleInvite">
              <div class="mb-3">
                <label class="form-label">Full Name *</label>
                <input v-model="inviteForm.name" type="text" class="form-control" required />
              </div>
              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label">Email</label>
                  <input v-model="inviteForm.email" type="email" class="form-control" placeholder="name@example.com" />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Mobile Number</label>
                  <input v-model="inviteForm.phone" type="tel" class="form-control" placeholder="+91 XXXXX XXXXX" />
                </div>
              </div>
              <div class="row g-3 mt-1">
                <div class="col-md-6">
                  <label class="form-label">Role</label>
                  <select v-model="inviteForm.role" class="form-select">
                    <option v-for="role in inviteRoleOptions" :key="role.value" :value="role.value">
                      {{ role.label }}
                    </option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Relation</label>
                  <select v-model="inviteForm.relation" class="form-select">
                    <option value="">Select</option>
                    <option v-for="r in relations" :key="r" :value="r">{{ r }}</option>
                  </select>
                </div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-light" data-bs-dismiss="modal">Cancel</button>
            <button type="submit" form="inviteForm" class="btn btn-primary" :disabled="inviteLoading">
              <template v-if="inviteLoading">
                <span class="spinner-border spinner-border-sm me-2" />
                Processing
              </template>
              <span v-else>{{ inviteActionLabel }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, computed, onMounted } from 'vue'
import { usePage } from '@inertiajs/vue3'
import { Modal } from 'bootstrap'
import { useToast } from '@/composables/useToast'
import { FAMILY_MANAGER_ROLES, INVITABLE_ROLE_OPTIONS, formatRoleLabel } from '@/constants/roles'
import api from '@/services/api'

const page = usePage()
const { showToast } = useToast()
let inviteModalInstance = null
const defaultInviteRole = INVITABLE_ROLE_OPTIONS[0].value

const family = ref({})
const members = ref([])
const membersLoading = ref(false)
const editingFamily = ref(false)
const savingFamily = ref(false)
const familyForm = reactive({ name: '' })
const inviteLoading = ref(false)
const inviteForm = reactive({ name: '', email: '', phone: '', role: defaultInviteRole, relation: '' })

const currentUser = computed(() => page.props.auth?.user ?? null)
const canManageFamily = computed(() => FAMILY_MANAGER_ROLES.includes(currentUser.value?.role ?? ''))
const inviteRoleOptions = INVITABLE_ROLE_OPTIONS
const inviteActionLabel = computed(() => inviteForm.email?.trim() ? 'Send Invite' : 'Add Member')

const relations = ['Spouse', 'Son', 'Daughter', 'Father', 'Mother', 'Brother', 'Sister', 'Grandparent', 'Uncle', 'Aunt', 'Other']

const avatarColors = ['#6C5CE7', '#00b894', '#fdcb6e', '#e17055', '#74b9ff', '#a29bfe', '#fd79a8', '#00cec9']

function memberColor(name) {
  const idx = name?.charCodeAt(0) % avatarColors.length
  return avatarColors[idx ?? 0]
}

function initials(name) {
  return (name ?? '')
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

function formatDate(d) {
  return d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''
}

function startEditFamily() {
  familyForm.name = family.value.name ?? ''
  editingFamily.value = true
}

async function saveFamily() {
  savingFamily.value = true
  try {
    const { data } = await api.put('/family', familyForm)
    family.value = data.data
    editingFamily.value = false
    showToast('Family name updated!', 'success')
  } catch {
    showToast('Failed to update', 'danger')
  } finally {
    savingFamily.value = false
  }
}

function openInviteModal() {
  Object.assign(inviteForm, { name: '', email: '', phone: '', role: defaultInviteRole, relation: '' })
  inviteModalInstance?.show()
}

function getErrorMessage(err, fallback) {
  const errors = err.response?.data?.errors
  const firstError = errors && typeof errors === 'object'
    ? Object.values(errors).flat().find(Boolean)
    : null

  return firstError ?? err.response?.data?.message ?? fallback
}

async function handleInvite() {
  if (!inviteForm.email?.trim() && !inviteForm.phone?.trim()) {
    showToast('Either email or mobile number is required', 'danger')
    return
  }

  inviteLoading.value = true
  try {
    const { data } = await api.post('/family/members', inviteForm)
    showToast(data.message ?? 'Member saved successfully', 'success')
    inviteModalInstance?.hide()
    loadMembers()
  } catch (err) {
    showToast(getErrorMessage(err, 'Failed to invite member'), 'danger')
  } finally {
    inviteLoading.value = false
  }
}

async function removeMember(member) {
  if (!confirm(`Remove ${member.name} from your family?`)) return
  try {
    await api.delete(`/family/members/${member.id}`)
    showToast(`${member.name} removed`, 'success')
    loadMembers()
  } catch {
    showToast('Failed to remove', 'danger')
  }
}

async function loadMembers() {
  membersLoading.value = true
  try {
    const [fam, mems] = await Promise.all([api.get('/family'), api.get('/family/members')])
    family.value = fam.data.data
    members.value = mems.data.data
  } finally {
    membersLoading.value = false
  }
}

onMounted(() => {
  loadMembers()
  inviteModalInstance = new Modal(document.getElementById('inviteModal'))
})
</script>

<style scoped>
.family-avatar {
  width: 72px;
  height: 72px;
  border-radius: 20px;
  background: linear-gradient(135deg, var(--fl-primary), var(--fl-secondary));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  color: #fff;
}
.member-avatar {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  font-size: 1rem;
  flex-shrink: 0;
  overflow: hidden;
}
.member-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
