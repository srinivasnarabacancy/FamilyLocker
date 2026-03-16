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
    <ShimmerLoader v-if="membersLoading" variant="members" col-class="col-12 col-sm-6 col-lg-4" :count="6" />
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
            <div v-if="canManageFamily && member.id !== currentUser?.id" class="member-actions">
              <button
                class="btn btn-icon btn-light btn-sm member-actions__trigger"
                @click.stop="toggleMenu(member.id)"
              >
                <i class="bi bi-three-dots-vertical" />
              </button>
              <div v-if="openMenuId === member.id" class="member-actions__menu" @click.stop>
                <button class="member-actions__item" @click="openEditMember(member); openMenuId = null">
                  <i class="bi bi-pencil me-2" />Edit
                </button>
                <button class="member-actions__item text-danger" @click="removeMember(member); openMenuId = null">
                  <i class="bi bi-person-x me-2" />Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Invite Member Offcanvas -->
    <AppOffcanvas
      v-model="showInviteOffcanvas"
      title="Invite Family Member"
      subtitle="Either email or mobile is required."
      icon="bi bi-person-plus"
    >
      <form id="inviteForm" @submit.prevent="handleInvite">
        <div class="mb-3">
          <label class="form-label fw-semibold">Full Name <span class="text-danger">*</span></label>
          <input v-model="inviteForm.name" type="text" class="form-control" placeholder="John Doe" required />
        </div>
        <div class="row g-3">
          <div class="col-12 col-md-6">
            <label class="form-label fw-semibold">Email</label>
            <input v-model="inviteForm.email" type="email" class="form-control" placeholder="name@example.com" />
          </div>
          <div class="col-12 col-md-6">
            <label class="form-label fw-semibold">Mobile Number</label>
            <input v-model="inviteForm.phone" type="tel" class="form-control" placeholder="+91 XXXXX XXXXX" />
          </div>
        </div>
        <div class="row g-3 mt-1">
          <div class="col-12 col-md-6">
            <label class="form-label fw-semibold">Role</label>
            <select v-model="inviteForm.role" class="form-select">
              <option v-for="role in inviteRoleOptions" :key="role.value" :value="role.value">
                {{ role.label }}
              </option>
            </select>
          </div>
          <div class="col-12 col-md-6">
            <label class="form-label fw-semibold">Relation</label>
            <select v-model="inviteForm.relation" class="form-select">
              <option value="">Select relation</option>
              <option v-for="r in relations" :key="r" :value="r">{{ r }}</option>
            </select>
          </div>
        </div>
      </form>

      <template #footer>
        <button type="submit" form="inviteForm" class="btn btn-primary" :disabled="inviteLoading">
          <span v-if="inviteLoading" class="spinner-border spinner-border-sm me-2" />
          {{ inviteActionLabel }}
        </button>
      </template>
    </AppOffcanvas>

    <!-- Edit Member Offcanvas -->
    <AppOffcanvas
      v-model="showEditOffcanvas"
      title="Edit Member"
      subtitle="Update member details."
      icon="bi bi-person-gear"
    >
      <form id="editMemberForm" @submit.prevent="handleEditMember">
        <div class="mb-3">
          <label class="form-label fw-semibold">Full Name <span class="text-danger">*</span></label>
          <input v-model="editForm.name" type="text" class="form-control" placeholder="John Doe" required />
        </div>
        <div class="row g-3">
          <div class="col-12 col-md-6">
            <label class="form-label fw-semibold">
              Email
              <span v-if="editForm._hasEmail" class="badge bg-secondary-soft text-secondary ms-1" style="font-size:0.7rem">Locked</span>
            </label>
            <input
              v-model="editForm.email"
              type="email"
              class="form-control"
              placeholder="name@example.com"
              :readonly="editForm._hasEmail"
              :class="{ 'bg-light text-muted': editForm._hasEmail }"
            />
            <div v-if="editForm._hasEmail" class="form-text"><i class="bi bi-lock me-1" />Email cannot be changed once set.</div>
          </div>
          <div class="col-12 col-md-6">
            <label class="form-label fw-semibold">
              Mobile Number
              <span v-if="editForm._hasPhone" class="badge bg-secondary-soft text-secondary ms-1" style="font-size:0.7rem">Locked</span>
            </label>
            <input
              v-model="editForm.phone"
              type="tel"
              class="form-control"
              placeholder="+91 XXXXX XXXXX"
              :readonly="editForm._hasPhone"
              :class="{ 'bg-light text-muted': editForm._hasPhone }"
            />
          </div>
        </div>
        <div class="row g-3 mt-1">
          <div class="col-12 col-md-6">
            <label class="form-label fw-semibold">Role</label>
            <select v-model="editForm.role" class="form-select">
              <option v-for="role in inviteRoleOptions" :key="role.value" :value="role.value">
                {{ role.label }}
              </option>
            </select>
          </div>
          <div class="col-12 col-md-6">
            <label class="form-label fw-semibold">Relation</label>
            <select v-model="editForm.relation" class="form-select">
              <option value="">Select relation</option>
              <option v-for="r in relations" :key="r" :value="r">{{ r }}</option>
            </select>
          </div>
        </div>
      
      </form>

      <template #footer>
        <button type="submit" form="editMemberForm" class="btn btn-primary" :disabled="editLoading">
          <span v-if="editLoading" class="spinner-border spinner-border-sm me-2" />
          Save Changes
        </button>
      </template>
    </AppOffcanvas>

    <!-- Remove Member Confirm -->
    <ConfirmModal
      v-model="showRemoveModal"
      :title="`Remove ${memberToRemove?.name}?`"
      message="This member will be removed from your family."
      confirm-text="Remove"
      cancel-text="Cancel"
      icon="bi bi-person-x"
      variant="danger"
      :loading="removing"
      @confirm="confirmRemoveMember"
    />
  </div>
</template>

<script setup>
import { reactive, ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { usePage } from '@inertiajs/vue3'
import { useToast } from '@/composables/useToast'
import { FAMILY_MANAGER_ROLES, INVITABLE_ROLE_OPTIONS, formatRoleLabel } from '@/constants/roles'
import api from '@/services/api'
import AppOffcanvas from '@/components/AppOffcanvas.vue'
import ConfirmModal from '@/components/ConfirmModal.vue'
import ShimmerLoader from '@/components/ShimmerLoader.vue'

const page = usePage()
const { showToast } = useToast()
const defaultInviteRole = INVITABLE_ROLE_OPTIONS[0].value

const family = ref({})
const members = ref([])
const membersLoading = ref(false)
const editingFamily = ref(false)
const savingFamily = ref(false)
const familyForm = reactive({ name: '' })
const inviteLoading = ref(false)
const showInviteOffcanvas = ref(false)
const inviteForm = reactive({ name: '', email: '', phone: '', role: defaultInviteRole, relation: '' })
const showRemoveModal = ref(false)
const memberToRemove = ref(null)
const removing = ref(false)
const openMenuId = ref(null)
const showEditOffcanvas = ref(false)
const editLoading = ref(false)
const editingMember = ref(null)
const editForm = reactive({
  name: '', email: '', phone: '', role: '', relation: '', date_of_birth: '',
  _hasEmail: false, _hasPhone: false,
})

function toggleMenu(id) {
  openMenuId.value = openMenuId.value === id ? null : id
}

function closeMenus() {
  openMenuId.value = null
}

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
  showInviteOffcanvas.value = true
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
    showInviteOffcanvas.value = false
    loadMembers()
  } catch (err) {
    showToast(getErrorMessage(err, 'Failed to invite member'), 'danger')
  } finally {
    inviteLoading.value = false
  }
}

function openEditMember(member) {
  editingMember.value = member
  Object.assign(editForm, {
    name: member.name ?? '',
    email: member.email ?? '',
    phone: member.phone ?? '',
    role: member.role ?? defaultInviteRole,
    relation: member.relation ?? '',
    date_of_birth: member.date_of_birth ?? '',
    _hasEmail: !!member.email?.trim(),
    _hasPhone: !!member.phone?.trim(),
  })
  showEditOffcanvas.value = true
}

async function handleEditMember() {
  if (!editingMember.value) return
  editLoading.value = true
  try {
    const payload = {
      name: editForm.name,
      role: editForm.role,
      relation: editForm.relation,
      date_of_birth: editForm.date_of_birth,
    }
    if (!editForm._hasEmail) payload.email = editForm.email
    if (!editForm._hasPhone) payload.phone = editForm.phone
    await api.put(`/family/members/${editingMember.value.id}`, payload)
    showToast('Member updated successfully', 'success')
    showEditOffcanvas.value = false
    loadMembers()
  } catch (err) {
    showToast(getErrorMessage(err, 'Failed to update member'), 'danger')
  } finally {
    editLoading.value = false
  }
}

function removeMember(member) {
  memberToRemove.value = member
  showRemoveModal.value = true
}

async function confirmRemoveMember() {
  if (!memberToRemove.value) return
  removing.value = true
  try {
    await api.delete(`/family/members/${memberToRemove.value.id}`)
    showToast(`${memberToRemove.value.name} removed`, 'success')
    showRemoveModal.value = false
    memberToRemove.value = null
    loadMembers()
  } catch {
    showToast('Failed to remove', 'danger')
  } finally {
    removing.value = false
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
  document.addEventListener('click', closeMenus)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', closeMenus)
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

.member-actions {
  position: relative;
  flex-shrink: 0;
}
.member-actions__trigger {
  width: 32px;
  height: 32px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.member-actions__menu {
  position: absolute;
  right: 0;
  top: calc(100% + 6px);
  background: #fff;
  border: 1px solid #eef0f7;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  min-width: 150px;
  z-index: 100;
  overflow: hidden;
}
.member-actions__item {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 0.6rem 1rem;
  background: transparent;
  border: none;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s;
}
.member-actions__item:hover {
  background: #fff1f2;
}
</style>
