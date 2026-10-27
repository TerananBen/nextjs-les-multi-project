"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import type { ApiMenuSetting } from "@/types/api-settings"
import { saveAllApiMenuSettingsAction } from "@/app/actions/api-settings"
import { usePermission } from "@/components/providers/permission-provider"
import { useApiSettingsColumns } from "./columns"
import { DataTable } from "./data-table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Search, X, Save, Loader2, ShieldAlert } from "lucide-react"
import { cn } from "@/lib/utils"

interface ApiSettingsClientProps {
    initialData: ApiMenuSetting[]
}

export function ApiSettingsClient({ initialData = [] }: ApiSettingsClientProps) {
    const t = useTranslations("ApiSettings")
    const tMenu = useTranslations("MenuSettings")
    const { getPermission, permissions } = usePermission()

    // Determine permissions (default to true while permissions list is loading / if superadmin)
    const perm = React.useMemo(() => {
        if (!permissions.length) return { readable: true, writable: true, control: true }
        return getPermission("system_api_setting")
    }, [getPermission, permissions])

    const isReadable = perm.readable
    const isWritable = perm.writable

    const [data, setData] = React.useState<ApiMenuSetting[]>(initialData)
    const [savedMap, setSavedMap] = React.useState<Map<string, number>>(() =>
        new Map(initialData.map((d) => [d.menu_id, d.api_version]))
    )
    const [searchQuery, setSearchQuery] = React.useState("")
    const [saving, setSaving] = React.useState(false)

    // Sync savedMap when initialData changes from server
    React.useEffect(() => {
        setData(initialData)
        setSavedMap(new Map(initialData.map((d) => [d.menu_id, d.api_version])))
    }, [initialData])

    const handleUpdateVersion = React.useCallback((menuId: string, version: number) => {
        if (!isWritable) return
        setData((prev) =>
            prev.map((item) => (item.menu_id === menuId ? { ...item, api_version: version } : item))
        )
    }, [isWritable])

    const isModified = React.useCallback((item: ApiMenuSetting) => {
        const original = savedMap.get(item.menu_id)
        return original !== undefined && original !== item.api_version
    }, [savedMap])

    const modifiedCount = React.useMemo(() => {
        return data.filter((d) => isModified(d)).length
    }, [data, isModified])

    const hasChanges = modifiedCount > 0

    const handleSaveAll = React.useCallback(async () => {
        if (!isWritable) {
            toast.error(t("noPermission"))
            return
        }
        if (!hasChanges) return
        setSaving(true)
        try {
            const payload = data.map((item) => ({
                menu_id: item.menu_id,
                api_version: item.api_version,
            }))
            const result = await saveAllApiMenuSettingsAction(payload)
            if (result && result.result) {
                toast.success(t("saveSuccess"))
                setSavedMap(new Map(data.map((d) => [d.menu_id, d.api_version])))
            } else {
                toast.error(t("saveError"))
            }
        } catch (error) {
            console.error("[API Settings] Save error:", error)
            toast.error(t("saveError"))
        } finally {
            setSaving(false)
        }
    }, [data, isWritable, hasChanges, t])

    const columns = useApiSettingsColumns(handleUpdateVersion, isModified, isWritable)

    // Filter Data by raw menu name and translated menu name
    const filteredData = React.useMemo(() => {
        if (!searchQuery.trim()) return data
        const lowerQuery = searchQuery.trim().toLowerCase()
        return data.filter((item) => {
            const rawName = item.menu_name?.toLowerCase() || ""
            const translationKey = `menuNames.txt_list_name_${item.menu_name}`
            let translatedName = ""
            try {
                translatedName = tMenu(translationKey as never)?.toLowerCase() || ""
            } catch {
                translatedName = ""
            }
            return rawName.includes(lowerQuery) || translatedName.includes(lowerQuery)
        })
    }, [data, searchQuery, tMenu])

    if (!isReadable) {
        return (
            <div className="flex flex-1 flex-col items-center justify-center min-h-[400px] gap-3 text-muted-foreground">
                <ShieldAlert className="h-12 w-12 text-muted-foreground/60" />
                <p className="text-base font-medium">{t("noAccess")}</p>
            </div>
        )
    }

    return (
        <div className="flex flex-1 flex-col gap-3 w-full h-full">
            {/* Header Toolbar: Standard Compact Container */}
            <div className="rounded-lg border bg-card p-3 shadow-2xs">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 w-full">
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

                    {/* Actions & Unsaved indicator */}
                    <div className="flex items-center justify-end gap-2.5 shrink-0 w-full sm:w-auto">
                        {hasChanges && (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-semibold shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                <span>{t("unsavedChanges", { count: modifiedCount })}</span>
                            </div>
                        )}

                        {isWritable && (
                            <Button
                                size="sm"
                                onClick={handleSaveAll}
                                disabled={saving || !hasChanges}
                                className={cn(
                                    "h-9 px-4 font-medium transition-all shadow-xs cursor-pointer w-full sm:w-auto flex-1 sm:flex-initial",
                                    hasChanges ? "opacity-100" : "opacity-60"
                                )}
                            >
                                {saving ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Save className="mr-2 h-4 w-4" />
                                )}
                                {saving ? t("saving") : t("save")}
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Table Section */}
            <div className="flex-1 flex flex-col min-h-0">
                <DataTable columns={columns} data={filteredData} loading={false} />
            </div>
        </div>
    )
}
