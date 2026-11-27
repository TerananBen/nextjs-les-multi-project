export interface RoleLike {
  name?: string | null
  code?: string | null
}

export const ROLE_RANK = {
  SUPER_ADMIN: 4,
  ADMIN_MANAGEMENT: 3,
  ADMIN: 2,
  OPERATOR: 1,
  UNKNOWN: 0,
} as const

const getSingleRoleRank = (rawRole?: string | null): number => {
  if (!rawRole) return ROLE_RANK.UNKNOWN
  const normalized = rawRole.toLowerCase().replace(/[\s_-]+/g, "")
  if (!normalized) return ROLE_RANK.UNKNOWN

  if (normalized.includes("superadmin")) return ROLE_RANK.SUPER_ADMIN
  if (normalized.includes("adminmanagement")) return ROLE_RANK.ADMIN_MANAGEMENT
  if (normalized.includes("admin")) return ROLE_RANK.ADMIN
  if (normalized.includes("operator")) return ROLE_RANK.OPERATOR

  return ROLE_RANK.UNKNOWN
}

export const getRoleRank = (role?: string | null): number => {
  if (!role) return ROLE_RANK.UNKNOWN
  return role
    .split(",")
    .map((part) => getSingleRoleRank(part.trim()))
    .reduce<number>((highest, rank) => (rank > highest ? rank : highest), ROLE_RANK.UNKNOWN)
}

export const getRoleItemRank = (role?: RoleLike | null): number => {
  if (!role) return ROLE_RANK.UNKNOWN
  return Math.max(getRoleRank(role.name), getRoleRank(role.code))
}

export const isSuperAdminRole = (role?: RoleLike | string | null): boolean => {
  if (!role) return false
  const rank = typeof role === "string" ? getRoleRank(role) : getRoleItemRank(role)
  return rank >= ROLE_RANK.SUPER_ADMIN
}

export const canEditTargetRole = (
  currentUserRole?: string | null,
  targetRole?: RoleLike | string | null,
  isSuperAdmin = false
): boolean => {
  if (isSuperAdmin) return true
  if (!targetRole) return true

  const actorRank = getRoleRank(currentUserRole)
  const targetRank =
    typeof targetRole === "string" ? getRoleRank(targetRole) : getRoleItemRank(targetRole)

  return actorRank >= targetRank
}
