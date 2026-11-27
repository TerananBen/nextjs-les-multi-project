"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import type { ApiMenuSetting } from "@/types/api-settings"
import type { ProjectConfig } from "@/config/projects/types"
import { getApiMenuSettingsAction, saveAllApiMenuSettingsAction } from "@/app/actions/api-settings"
import { usePermission } from "@/components/providers/permission-provider"
import { useApiSettingsColumns } from "./api-columns"
import { DataTable } from "./api-data-table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { Search, X, Save, Loader2, ShieldAlert, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface ApiTabProps {
    initialData: ApiMenuSetting[]
    projects?: ProjectConfig[]
    initialProjectId?: string
}

export function ApiTab({ initialData = [], projects = [], initialProjectId }: ApiTabProps) {
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

    const initialMatched = React.useMemo(() => {
        if (!initialProjectId) return projects[0]?.id || ""
        const clean = initialProjectId.trim().toLowerCase()
        const found = projects.find(
            (p) =>
                p.id.toLowerCase() === clean ||
                p.uuid?.toLowerCase() === clean ||
                p.code?.toLowerCase() === clean
        )
        return found?.id || projects[0]?.id || ""
    }, [initialProjectId, projects])

    const [selectedProjectId, setSelectedProjectId] = React.useState<string>(initialMatched)
    const [data, setData] = React.useState<ApiMenuSetting[]>(initialData)
    const [savedMap, setSavedMap] = React.useState<Map<string, number>>(() =>
        new Map(initialData.map((d) => [d.menu_id, d.api_version]))
    )
    const [isConfigured, setIsConfigured] = React.useState<boolean>(() => {
        return initialData.length > 0 ? (initialData[0]?.is_configured ?? true) : true
    })
    const [searchQuery, setSearchQuery] = React.useState("")
    const [saving, setSaving] = React.useState(false)
    const [loadingProject, setLoadingProject] = React.useState(false)

    // Sync savedMap when initialData changes from server, only if viewing initialMatched project
    React.useEffect(() => {
        if (selectedProjectId === initialMatched) {
            setData(initialData)
            setSavedMap(new Map(initialData.map((d) => [d.menu_id, d.api_version])))
            setIsConfigured(initialData[0]?.is_configured ?? true)
        }
    }, [initialData, initialMatched, selectedProjectId])

    const handleProjectChange = async (projectId: string) => {
        setSelectedProjectId(projectId)
        setLoadingProject(true)
        try {
            const projectObj = projects.find((p) => p.id === projectId || p.code === projectId)
            const lookupCode = projectObj?.code || projectObj?.id || projectId
            const res = await getApiMenuSettingsAction(lookupCode)
            if (res && res.length > 0) {
                setData(res)
                setSavedMap(new Map(res.map((d) => [d.menu_id, d.api_version])))
                setIsConfigured(res[0]?.is_configured ?? true)
            }
        } catch (error) {
            console.error("Failed to load project API settings:", error)
            toast.error(t("loadError", { defaultValue: "Failed to load project settings" }))
        } finally {
            setLoadingProject(false)
        }
    }

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
        setSaving(true)
        try {
            const payload = data.map((item) => ({
                menu_id: item.menu_id,
                api_version: item.api_version,
            }))
            const projectObj = projects.find((p) => p.id === selectedProjectId || p.code === selectedProjectId)
            const targetProject = projectObj?.code || projectObj?.id || selectedProjectId
            const result = await saveAllApiMenuSettingsAction(payload, targetProject)
            if (result && result.result) {
                toast.success(t("saveSuccess"))
                setSavedMap(new Map(data.map((d) => [d.menu_id, d.api_version])))
                setIsConfigured(true)
            } else {
                toast.error(t("saveError"))
            }
        } catch (error) {
            console.error("[API Settings] Save error:", error)
            toast.error(t("saveError"))
        } finally {
            setSaving(false)
        }
    }, [data, isWritable, selectedProjectId, projects, t])

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
            <div className="rounded-lg border bg-card text-card-foreground p-2 shadow-2xs">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 w-full">
                    {/* Project Selector & Status */}
                    {projects.length > 0 && (
                        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto shrink-0">
                            <div className="w-full sm:w-[240px]">
                                <Select
                                    value={selectedProjectId}
                                    onValueChange={handleProjectChange}
                                    disabled={loadingProject || saving}
                                >
                                    <SelectTrigger className="h-9 w-full bg-background border-input text-xs sm:text-sm cursor-pointer shadow-xs">
                                        <SelectValue placeholder={t("selectProject", { defaultValue: "เลือกโปรเจกต์" })} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {projects.map((p) => (
                                            <SelectItem key={p.id} value={p.id} className="cursor-pointer text-xs sm:text-sm">
                                                {p.name} ({p.code || p.id})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Status Badge */}
                            <div
                                className={cn(
                                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border shrink-0 transition-colors shadow-2xs h-9",
                                    isConfigured
                                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                                        : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                                )}
                            >
                                <span
                                    className={cn(
                                        "w-1.5 h-1.5 rounded-full shrink-0",
                                        isConfigured ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
                                    )}
                                />
                                <span>
                                    {isConfigured
                                        ? t("statusConfigured", { defaultValue: "ตั้งค่าแล้ว" })
                                        : t("statusNotConfigured", { defaultValue: "ยังไม่ได้ตั้งค่า" })}
                                </span>
                            </div>
                        </div>
                    )}

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
                                disabled={saving || loadingProject}
                                className={cn(
                                    "h-9 px-4 font-medium transition-all shadow-xs cursor-pointer w-full sm:w-auto flex-1 sm:flex-initial",
                                    hasChanges ? "opacity-100" : "opacity-90"
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

            {/* Unconfigured Alert Banner */}
            {!isConfigured && !loadingProject && (
                <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-amber-900 dark:text-amber-200 shadow-2xs animate-in fade-in-50 duration-200">
                    <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                    <div className="flex flex-col gap-0.5 text-xs sm:text-sm">
                        <span className="font-semibold text-xs sm:text-sm">
                            {t("notConfiguredAlertTitle", { defaultValue: "โปรเจกต์นี้ยังไม่ได้ตั้งค่า API" })}
                        </span>
                        <span className="text-muted-foreground dark:text-amber-300/80 text-xs">
                            {t("notConfiguredAlertDesc", { defaultValue: "ระบบกำลังแสดงค่าเริ่มต้น (เวอร์ชัน 1) กรุณากำหนดเวอร์ชันที่ต้องการและกด 'บันทึก' เพื่อเปิดใช้งานการตั้งค่าสำหรับโปรเจกต์นี้" })}
                        </span>
                    </div>
                </div>
            )}

            {/* Table Section */}
            <div className="flex-1 flex flex-col min-h-0">
                <DataTable columns={columns} data={filteredData} loading={loadingProject} />
            </div>
        </div>
    )
}
