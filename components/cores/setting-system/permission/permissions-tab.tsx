"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Search, X, ShieldAlert, Lock } from "lucide-react"
import { Input } from "@/components/ui/input"
import { usePermission } from "@/components/providers/permission-provider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { canEditTargetRole, isSuperAdminRole } from "@/lib/role-hierarchy"
import { KeycloakRoleItem, MenuData } from "@/types/menu-settings"
import {
  getDataMenuAction,
  getKeycloakRolesAction,
  settingMenuAction,
} from "@/app/actions/menu-settings"
import { usePermissionsColumns } from "./permissions-columns"
import { DataTable } from "./permissions-data-table"

const EXCLUDED_MENUS = new Set([
  "system_api_setting",
  "v_settingapi",
  "system_project",
  "v_projectsetting",
])

interface PermissionsClientProps {
  initialRoles?: KeycloakRoleItem[]
  isSuperAdmin?: boolean
  currentUserRole?: string
}

export function PermissionsClient({
  initialRoles = [],
  isSuperAdmin = false,
  currentUserRole = "",
}: PermissionsClientProps) {
  const t = useTranslations("MenuSettings")
  const { getPermission, permissions } = usePermission()

  const perm = React.useMemo(() => {
    if (!permissions.length) return { readable: true, writable: true, control: true }
    return getPermission("system_menu_permission")
  }, [getPermission, permissions])

  const isReadable = isSuperAdmin || perm.readable
  const canWrite = isSuperAdmin || perm.writable

  const displayedRoles = React.useMemo(() => {
    if (isSuperAdmin) return initialRoles
    return initialRoles.filter((r) => !isSuperAdminRole(r))
  }, [initialRoles, isSuperAdmin])

  const pickDefaultRoleId = React.useCallback(
    (roleList: KeycloakRoleItem[]) => {
      const editable = roleList.find((r) => canEditTargetRole(currentUserRole, r, isSuperAdmin))
      return editable?.id || roleList[0]?.id || ""
    },
    [currentUserRole, isSuperAdmin]
  )

  // Roles Definition from Keycloak
  const [roles, setRoles] = React.useState<KeycloakRoleItem[]>(displayedRoles)
  const [selectedRole, setSelectedRole] = React.useState<string>(() =>
    pickDefaultRoleId(displayedRoles)
  )
  const [data, setData] = React.useState<MenuData[]>([])
  const [loading, setLoading] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")

  // Fetch Keycloak Roles if not provided or sync with initialRoles
  React.useEffect(() => {
    if (initialRoles.length > 0) {
      const filtered = isSuperAdmin
        ? initialRoles
        : initialRoles.filter((r) => !isSuperAdminRole(r))
      setRoles(filtered)
      if (filtered.length > 0) {
        setSelectedRole((current) =>
          filtered.some((r) => r.id === current) ? current : pickDefaultRoleId(filtered)
        )
      }
      return
    }
    const fetchRoles = async () => {
      try {
        const roleList = await getKeycloakRolesAction()
        const filtered = isSuperAdmin ? roleList : roleList.filter((r) => !isSuperAdminRole(r))
        setRoles(filtered)
        if (filtered.length > 0) {
          setSelectedRole((current) =>
            filtered.some((r) => r.id === current) ? current : pickDefaultRoleId(filtered)
          )
        }
      } catch (error) {
        console.error("Failed to fetch Keycloak roles", error)
      }
    }

    fetchRoles()
  }, [initialRoles, isSuperAdmin, pickDefaultRoleId])

  const selectedRoleItem = React.useMemo(
    () => roles.find((r) => r.id === selectedRole),
    [roles, selectedRole]
  )

  const isHigherRole = React.useMemo(() => {
    if (isSuperAdmin || !selectedRoleItem) return false
    return !canEditTargetRole(currentUserRole, selectedRoleItem, isSuperAdmin)
  }, [isSuperAdmin, currentUserRole, selectedRoleItem])

  const canEditSelectedRole = canWrite && !isHigherRole

  const handleToggle = React.useCallback(
    async (item: MenuData, field: string, value: string) => {
      if (!canWrite) {
        toast.error(t("permissionDenied"), { id: "menu-setting-toast" })
        return
      }
      if (isHigherRole) {
        toast.error(t("higherRoleReadOnly"), { id: "menu-setting-toast" })
        return
      }
      try {
        const updatedItem = { ...item, [field]: value }

        const payload = [
          {
            menu_id: updatedItem.menu_id,
            readable: updatedItem.readable,
            writable: updatedItem.writable,
            control: updatedItem.control,
          },
        ]

        const jsonValue = JSON.stringify(payload)

        const result = await settingMenuAction(selectedRole, jsonValue)

        if (result && result.result) {
          setData((prevData) => prevData.map((d) => (d.menu_id === item.menu_id ? updatedItem : d)))
          toast.success(t("saveSuccess"), { id: "menu-setting-toast" })
        } else if (result?.apiName === "Role Hierarchy Guard") {
          toast.error(t("higherRoleReadOnly"), { id: "menu-setting-toast" })
        } else {
          toast.error(t("saveError"), { id: "menu-setting-toast" })
        }
      } catch (error) {
        console.error("Toggle error", error)
        toast.error(t("saveError"), { id: "menu-setting-toast" })
      }
    },
    [selectedRole, canWrite, isHigherRole, t]
  )

  // Columns
  const columns = usePermissionsColumns(handleToggle, canEditSelectedRole)

  // Fetch Data
  React.useEffect(() => {
    const fetchData = async () => {
      if (!selectedRole) return
      setLoading(true)
      try {
        const result = await getDataMenuAction(selectedRole)
        const filtered = result.filter((item) => {
          const raw = (item.menu_name || "").toLowerCase()
          return !EXCLUDED_MENUS.has(raw)
        })
        setData(filtered)
      } catch (error) {
        console.error("Failed to fetch menu data", error)
        toast.error(t("fetchError"))
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [selectedRole, t])

  // Filter Data (Searches both raw key name and translated display name)
  const filteredData = React.useMemo(() => {
    const base = data.filter((item) => {
      const raw = (item.menu_name || "").toLowerCase()
      return !EXCLUDED_MENUS.has(raw)
    })
    if (!searchQuery.trim()) return base
    const lowerQuery = searchQuery.trim().toLowerCase()
    return base.filter((item) => {
      const rawName = item.menu_name?.toLowerCase() || ""
      const translationKey = `menuNames.txt_list_name_${item.menu_name}`
      let translatedName = ""
      try {
        translatedName = t(translationKey as never)?.toLowerCase() || ""
      } catch {
        translatedName = ""
      }
      return rawName.includes(lowerQuery) || translatedName.includes(lowerQuery)
    })
  }, [data, searchQuery, t])

  if (!isReadable) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center min-h-[400px] gap-3 text-muted-foreground">
        <ShieldAlert className="h-12 w-12 text-muted-foreground/60" />
        <p className="text-base font-medium">
          {t("noAccess", { defaultValue: "You do not have permission to access this page" })}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-3 w-full h-full">
      {/* Header Toolbar: Standard Compact Container */}
      <div className="rounded-lg border bg-card text-card-foreground p-2 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full">
          {/* Role Filter */}
          <div className="w-full sm:w-[240px] shrink-0">
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="h-9 w-full bg-background border-input text-sm cursor-pointer shadow-xs">
                <SelectValue placeholder={t("selectRole")} />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => {
                  const isRoleLocked = !canEditTargetRole(currentUserRole, role, isSuperAdmin)
                  return (
                    <SelectItem className="cursor-pointer" key={role.id} value={role.id}>
                      {role.name}
                      {isRoleLocked && <Lock className="size-3.5 text-muted-foreground" />}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Search Input (Expands to fill available space) */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder={t("searchPlaceholder")}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="pl-9 pr-9 h-9 text-sm bg-background border-input w-full shadow-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {isHigherRole && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5 shrink-0" />
          <span>{t("higherRoleReadOnly")}</span>
        </div>
      )}

      {/* Table Section */}
      <div className="flex-1 flex flex-col min-h-0">
        <DataTable key={selectedRole} columns={columns} data={filteredData} loading={loading} />
      </div>
    </div>
  )
}

export const PermissionsTab = PermissionsClient
