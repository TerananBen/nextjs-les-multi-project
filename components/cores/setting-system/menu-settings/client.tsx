"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { KeycloakRoleItem, MenuData } from "@/types/menu-settings"
import { getDataMenuAction, getKeycloakRolesAction, settingMenuAction } from "@/app/actions/menu-settings"
import { useMenuSettingsColumns } from "./columns"
import { DataTable } from "./data-table"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Search, X } from "lucide-react"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface MenuSettingsClientProps {
    initialRoles?: KeycloakRoleItem[]
    isSuperAdmin?: boolean
}

export function MenuSettingsClient({ initialRoles = [], isSuperAdmin = false }: MenuSettingsClientProps) {
    const t = useTranslations("MenuSettings")

    const isSuperAdminRole = React.useCallback((role: KeycloakRoleItem) => {
        const name = (role.name || "").toLowerCase()
        const code = (role.code || "").toLowerCase()
        return (
            name.includes("superadmin") ||
            name.includes("super_admin") ||
            name.includes("super-admin") ||
            code.includes("superadmin") ||
            code.includes("super_admin") ||
            code.includes("super-admin") ||
            role.id === "855125b5-a3ea-48aa-a9e7-7e5abbecfaca"
        )
    }, [])

    const displayedRoles = React.useMemo(() => {
        if (isSuperAdmin) return initialRoles
        return initialRoles.filter((r) => !isSuperAdminRole(r))
    }, [initialRoles, isSuperAdmin, isSuperAdminRole])

    // Roles Definition from Keycloak
    const [roles, setRoles] = React.useState<KeycloakRoleItem[]>(displayedRoles)
    const [selectedRole, setSelectedRole] = React.useState<string>(displayedRoles[0]?.id || "")
    const [data, setData] = React.useState<MenuData[]>([])
    const [loading, setLoading] = React.useState(false)
    const [searchQuery, setSearchQuery] = React.useState("")

    // Fetch Keycloak Roles if not provided or sync with initialRoles
    React.useEffect(() => {
        if (initialRoles.length > 0) {
            const filtered = isSuperAdmin ? initialRoles : initialRoles.filter((r) => !isSuperAdminRole(r))
            setRoles(filtered)
            if (filtered.length > 0) {
                setSelectedRole((current) => (filtered.some((r) => r.id === current) ? current : filtered[0].id))
            }
            return
        }
        const fetchRoles = async () => {
            try {
                const roleList = await getKeycloakRolesAction()
                const filtered = isSuperAdmin ? roleList : roleList.filter((r) => !isSuperAdminRole(r))
                setRoles(filtered)
                if (filtered.length > 0) {
                    setSelectedRole((current) => (filtered.some((r) => r.id === current) ? current : filtered[0].id))
                }
            } catch (error) {
                console.error("Failed to fetch Keycloak roles", error)
            }
        }

        fetchRoles()
    }, [initialRoles, isSuperAdmin, isSuperAdminRole])

    const handleToggle = React.useCallback(async (item: MenuData, field: string, value: string) => {
        try {
            const updatedItem = { ...item, [field]: value }

            const payload = [{
                menu_id: updatedItem.menu_id,
                readable: updatedItem.readable,
                writable: updatedItem.writable,
                control: updatedItem.control
            }]

            const jsonValue = JSON.stringify(payload)

            const result = await settingMenuAction(selectedRole, jsonValue)

            if (result && result.result) {
                setData(prevData => prevData.map(d =>
                    d.menu_id === item.menu_id ? updatedItem : d
                ))
                toast.success(t("saveSuccess"), { id: "menu-setting-toast" })
            } else {
                toast.error(t("saveError"), { id: "menu-setting-toast" })
            }
        } catch (error) {
            console.error("Toggle error", error)
            toast.error(t("saveError"), { id: "menu-setting-toast" })
        }
    }, [selectedRole, t])

    // Columns
    const columns = useMenuSettingsColumns(handleToggle)

    // Fetch Data
    React.useEffect(() => {
        const fetchData = async () => {
            if (!selectedRole) return
            setLoading(true)
            try {
                const result = await getDataMenuAction(selectedRole)
                setData(result)
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
        if (!searchQuery.trim()) return data
        const lowerQuery = searchQuery.trim().toLowerCase()
        return data.filter((item) => {
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

    return (
        <div className="flex flex-1 flex-col gap-3 w-full h-full">
            {/* Header Toolbar: Standard Compact Container */}
            <div className="rounded-lg border bg-card p-3 shadow-2xs">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full">
                    {/* Role Filter */}
                    <div className="w-full sm:w-[240px] shrink-0">
                        <Select value={selectedRole} onValueChange={setSelectedRole}>
                            <SelectTrigger className="h-9 w-full bg-background border-input text-sm cursor-pointer shadow-xs">
                                <SelectValue placeholder={t("selectRole")} />
                            </SelectTrigger>
                            <SelectContent>
                                {roles.map((role) => (
                                    <SelectItem className="cursor-pointer" key={role.id} value={role.id}>
                                        {role.name}
                                    </SelectItem>
                                ))}
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

            {/* Table Section */}
            <div className="flex-1 flex flex-col min-h-0">
                <DataTable key={selectedRole} columns={columns} data={filteredData} loading={loading} />
            </div>
        </div>
    )
}
