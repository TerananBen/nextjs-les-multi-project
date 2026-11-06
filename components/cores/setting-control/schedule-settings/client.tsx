"use client"

import * as React from "react"
import { ScheduleItem } from "@/types/schedule-settings"
import { getDataScheduleAction } from "@/app/actions/schedule-settings"
import { useScheduleColumns } from "./columns"
import { DataTable } from "./data-table"
import { toast } from "sonner"
import { getListDataGroupAction } from "@/app/actions/street-light"
import { DeviceGroup } from "@/types/street-light"
import { EditScheduleDialog } from "./edit-dialog"
import { ResponseDialog } from "./response-dialog"
import { Loader2, Search, X, Plus, Calendar, Clock, SunMedium, Sliders } from "lucide-react"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import { deleteScheduleAction } from "@/app/actions/schedule-settings"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { usePermission } from "@/components/providers/permission-provider"

interface ScheduleSettingsClientProps {
    versionLightSensor: string
}

export function ScheduleSettingsClient({ versionLightSensor }: ScheduleSettingsClientProps) {
    const t = useTranslations("ScheduleSettings")
    const { getPermission } = usePermission()
    const { writable: canManage } = getPermission("V_SettingSchedule")

    const [data, setData] = React.useState<ScheduleItem[]>([])
    const [groups, setGroups] = React.useState<DeviceGroup[]>([])
    const [loading, setLoading] = React.useState(true)

    // Filter states
    const [searchQuery, setSearchQuery] = React.useState("")
    const [typeFilter, setTypeFilter] = React.useState<string>("ALL")

    // Dialog State
    const [openDialog, setOpenDialog] = React.useState(false)
    const [selectedSchedule, setSelectedSchedule] = React.useState<ScheduleItem | null>(null)

    // Response Dialog State
    const [openResponseDialog, setOpenResponseDialog] = React.useState(false)
    const [responseScheduleCode, setResponseScheduleCode] = React.useState<string | null>(null)
    const [responseScheduleName, setResponseScheduleName] = React.useState<string | null>(null)
    const [responseTypeSchedule, setResponseTypeSchedule] = React.useState<string | null>(null)

    // Delete State
    const [openDeleteDialog, setOpenDeleteDialog] = React.useState(false)
    const [scheduleToDelete, setScheduleToDelete] = React.useState<ScheduleItem | null>(null)
    const [isDeleting, setIsDeleting] = React.useState(false)

    const columns = useScheduleColumns({
        onEdit: (item) => {
            setSelectedSchedule(item)
            setOpenDialog(true)
        },
        onDelete: (item) => {
            setScheduleToDelete(item)
            setOpenDeleteDialog(true)
        },
        onFeedback: (item) => {
            const groupCode = item.GROUP_CODE || item.group_code || item.groupCode || item.code_name || ""
            setResponseScheduleCode(groupCode)
            setResponseScheduleName(item.scheduleName)
            setResponseTypeSchedule(item.typeSchedule)
            setOpenResponseDialog(true)
        }
    })

    const fetchData = React.useCallback(async () => {
        setLoading(true)
        try {
            const [scheduleResult, groupsResult] = await Promise.all([
                getDataScheduleAction(),
                getListDataGroupAction()
            ])
            setData(scheduleResult || [])
            setGroups(groupsResult || [])
        } catch (error) {
            console.error("Failed to fetch data", error)
            toast.error(t("failedToLoadData"))
        } finally {
            setLoading(false)
        }
    }, [t])

    React.useEffect(() => {
        fetchData()
    }, [fetchData])

    const handleAdd = () => {
        if (!canManage) {
            toast.error(t("permissionDenied"))
            return
        }
        setSelectedSchedule(null) // Ensure we are in "Add" mode
        setOpenDialog(true)
    }

    const handleDeleteConfirm = async () => {
        if (!canManage) {
            toast.error(t("permissionDenied"))
            return
        }
        if (!scheduleToDelete) return

        setIsDeleting(true)
        try {
            const code = scheduleToDelete.GROUP_CODE || scheduleToDelete.group_code || scheduleToDelete.groupCode || scheduleToDelete.code_name || ""
            const result = await deleteScheduleAction(code)
            if (result.success) {
                toast.success(t("deleteDialog.success"))
                setOpenDeleteDialog(false)
                await fetchData()
            } else {
                toast.error(t("deleteDialog.error") + (result.message ? `: ${result.message}` : ""))
            }
        } catch (error) {
            console.error(error)
            toast.error(t("deleteDialog.error"))
        } finally {
            setIsDeleting(false)
            setScheduleToDelete(null)
        }
    }

    // KPI Summary Calculation
    const kpiSummary = React.useMemo(() => {
        const total = data.length
        const timeCount = data.filter(s => s.typeSchedule === "time").length
        const lightCount = data.filter(s => s.typeSchedule === "light").length
        const manualCount = data.filter(s => s.typeSchedule === "manual").length
        return { total, timeCount, lightCount, manualCount }
    }, [data])

    // Filtering
    const filteredData = React.useMemo(() => {
        let result = data

        if (typeFilter !== "ALL") {
            result = result.filter((item) => item.typeSchedule === typeFilter)
        }

        if (searchQuery.trim()) {
            const lowerQuery = searchQuery.toLowerCase().trim()
            result = result.filter((item) =>
                (item.scheduleName && item.scheduleName.toLowerCase().includes(lowerQuery)) ||
                (item.groupCode && item.groupCode.toLowerCase().includes(lowerQuery))
            )
        }

        return result
    }, [data, typeFilter, searchQuery])

    return (
        <div className="flex flex-1 flex-col gap-4 w-full h-full">
            {/* Filter Controls Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 p-2 rounded-lg border bg-card text-card-foreground shadow-2xs">
                {/* Type Filter Select */}
                <div className="w-full sm:w-[180px]">
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger className="h-9 text-sm w-full bg-background cursor-pointer">
                            <SelectValue placeholder={t("filter.allTypes", { defaultValue: "All Types" })} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL" className="cursor-pointer text-sm">
                                {t("filter.allTypes", { defaultValue: "All Types" })}
                            </SelectItem>
                            <SelectItem value="time" className="cursor-pointer text-sm">
                                {t("types.time")}
                            </SelectItem>
                            <SelectItem value="light" className="cursor-pointer text-sm">
                                {t("types.light")}
                            </SelectItem>
                            <SelectItem value="manual" className="cursor-pointer text-sm">
                                {t("types.manual")}
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Search & Actions Row */}
                <div className="flex items-center gap-2 flex-1 min-w-0 w-full sm:w-auto">
                    {/* Search Input */}
                    <div className="relative flex-1 min-w-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                            placeholder={t("filter.searchPlaceholder", { defaultValue: "Search schedule..." })}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 pr-9 h-9 text-sm bg-background w-full shadow-2xs"
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

                    {/* Add Schedule Button */}
                    <Button
                        onClick={handleAdd}
                        disabled={!canManage}
                        className={cn(
                            "cursor-pointer shrink-0 h-9 px-4 text-sm font-medium shadow-2xs",
                            !canManage && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        <Plus className="mr-1.5 h-4 w-4" />
                        {t("buttons.add")}
                    </Button>
                </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full">
                {/* Card 1: Total Schedules */}
                <button
                    type="button"
                    onClick={() => setTypeFilter("ALL")}
                    className={cn(
                        "flex items-center gap-3.5 p-3.5 rounded-xl border transition-all text-left cursor-pointer shadow-2xs",
                        typeFilter === "ALL" && (searchQuery !== "" || typeFilter !== "ALL")
                            ? "border-primary/50 bg-primary/10 ring-1 ring-primary/30"
                            : "border-border/80 bg-muted/40 hover:bg-muted/70"
                    )}
                >
                    <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">
                        <Calendar className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs text-muted-foreground font-medium truncate">{t("kpi.totalSchedules")}</p>
                        <div className="flex items-baseline gap-1.5">
                            <p className="text-xl font-bold tracking-tight text-foreground">{kpiSummary.total}</p>
                            <span className="text-xs text-muted-foreground">{t("kpi.schedulesUnit")}</span>
                        </div>
                    </div>
                </button>

                {/* Card 2: Time-based Schedules */}
                <button
                    type="button"
                    onClick={() => setTypeFilter(prev => prev === "time" ? "ALL" : "time")}
                    className={cn(
                        "flex items-center gap-3.5 p-3.5 rounded-xl border transition-all text-left cursor-pointer shadow-2xs",
                        typeFilter === "time"
                            ? "border-sky-500/50 bg-sky-500/10 ring-1 ring-sky-500/30"
                            : "border-border/80 bg-muted/40 hover:bg-muted/70"
                    )}
                >
                    <div className="p-2.5 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 shrink-0">
                        <Clock className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs text-muted-foreground font-medium truncate">{t("kpi.timeSchedules")}</p>
                        <div className="flex items-baseline gap-1.5">
                            <p className="text-xl font-bold tracking-tight text-foreground">{kpiSummary.timeCount}</p>
                            <span className="text-xs text-muted-foreground">{t("kpi.schedulesUnit")}</span>
                        </div>
                    </div>
                </button>

                {/* Card 3: Light Sensor Schedules */}
                <button
                    type="button"
                    onClick={() => setTypeFilter(prev => prev === "light" ? "ALL" : "light")}
                    className={cn(
                        "flex items-center gap-3.5 p-3.5 rounded-xl border transition-all text-left cursor-pointer shadow-2xs",
                        typeFilter === "light"
                            ? "border-amber-500/50 bg-amber-500/10 ring-1 ring-amber-500/30"
                            : "border-border/80 bg-muted/40 hover:bg-muted/70"
                    )}
                >
                    <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                        <SunMedium className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs text-muted-foreground font-medium truncate">{t("kpi.lightSchedules")}</p>
                        <div className="flex items-baseline gap-1.5">
                            <p className="text-xl font-bold tracking-tight text-foreground">{kpiSummary.lightCount}</p>
                            <span className="text-xs text-muted-foreground">{t("kpi.schedulesUnit")}</span>
                        </div>
                    </div>
                </button>

                {/* Card 4: Manual Schedules */}
                <button
                    type="button"
                    onClick={() => setTypeFilter(prev => prev === "manual" ? "ALL" : "manual")}
                    className={cn(
                        "flex items-center gap-3.5 p-3.5 rounded-xl border transition-all text-left cursor-pointer shadow-2xs",
                        typeFilter === "manual"
                            ? "border-emerald-500/50 bg-emerald-500/10 ring-1 ring-emerald-500/30"
                            : "border-border/80 bg-muted/40 hover:bg-muted/70"
                    )}
                >
                    <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                        <Sliders className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs text-muted-foreground font-medium truncate">{t("kpi.manualSchedules")}</p>
                        <div className="flex items-baseline gap-1.5">
                            <p className="text-xl font-bold tracking-tight text-foreground">{kpiSummary.manualCount}</p>
                            <span className="text-xs text-muted-foreground">{t("kpi.schedulesUnit")}</span>
                        </div>
                    </div>
                </button>
            </div>

            {/* Middle & Bottom Table Section */}
            <div className="flex-1 flex flex-col min-h-0">
                <DataTable columns={columns} data={filteredData} loading={loading} />
            </div>

            <EditScheduleDialog
                versionLightSensor={versionLightSensor}
                open={openDialog && canManage}
                onOpenChange={setOpenDialog}
                schedule={selectedSchedule}
                groups={groups}
                onSuccess={fetchData}
            />

            <ResponseDialog
                open={openResponseDialog}
                onOpenChange={setOpenResponseDialog}
                codeName={responseScheduleCode}
                scheduleName={responseScheduleName}
                typeSchedule={responseTypeSchedule}
            />

            <AlertDialog open={openDeleteDialog && canManage} onOpenChange={setOpenDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("deleteDialog.title")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("deleteDialog.description", { name: scheduleToDelete?.scheduleName || "" })}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="cursor-pointer" disabled={isDeleting}>
                            {t("deleteDialog.cancel")}
                        </AlertDialogCancel>
                        <Button
                            variant="destructive"
                            className="cursor-pointer"
                            onClick={(e) => {
                                e.preventDefault()
                                handleDeleteConfirm()
                            }}
                            disabled={isDeleting}
                        >
                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isDeleting ? t("deleteDialog.deleting") : t("deleteDialog.confirm")}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
