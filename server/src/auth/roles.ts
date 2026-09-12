/** Port of the role constants on App\Models\User. */

export const ROLE_OWNER = 'owner';
export const ROLE_ADMIN = 'admin';
export const ROLE_MEMBER = 'member';
export const ROLE_CAREGIVER = 'caregiver';
export const ROLE_FINANCE_MANAGER = 'finance_manager';
export const ROLE_VIEWER = 'viewer';

export const ROLE_LABELS: Record<string, string> = {
  [ROLE_OWNER]: 'Owner',
  [ROLE_ADMIN]: 'Admin',
  [ROLE_MEMBER]: 'Member',
  [ROLE_CAREGIVER]: 'Caregiver',
  [ROLE_FINANCE_MANAGER]: 'Finance Manager',
  [ROLE_VIEWER]: 'Viewer',
};

/** Only these roles may add or remove family members. */
export const FAMILY_MANAGER_ROLES = [ROLE_OWNER, ROLE_ADMIN];

export const INVITABLE_ROLES = [
  ROLE_MEMBER,
  ROLE_ADMIN,
  ROLE_CAREGIVER,
  ROLE_FINANCE_MANAGER,
  ROLE_VIEWER,
];

export function canManageFamily(role: string | null | undefined): boolean {
  return FAMILY_MANAGER_ROLES.includes(role ?? '');
}

/** Port of User::roleLabel() — unknown roles fall back to Title Case. */
export function roleLabel(role: string | null | undefined): string {
  if (!role) return ROLE_LABELS[ROLE_MEMBER];

  return (
    ROLE_LABELS[role] ??
    role
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
  );
}
