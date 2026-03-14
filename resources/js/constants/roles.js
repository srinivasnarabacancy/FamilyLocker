export const FAMILY_MANAGER_ROLES = ['owner', 'admin']

export const INVITABLE_ROLE_OPTIONS = [
  { value: 'member', label: 'Member' },
  { value: 'admin', label: 'Admin' },
  { value: 'caregiver', label: 'Caregiver' },
  { value: 'finance_manager', label: 'Finance Manager' },
  { value: 'viewer', label: 'Viewer' },
]

const ROLE_LABELS = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
  caregiver: 'Caregiver',
  finance_manager: 'Finance Manager',
  viewer: 'Viewer',
}

export function formatRoleLabel(role) {
  if (!role) return 'Member'

  return ROLE_LABELS[role] ?? role
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}
