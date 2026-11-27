"use client"

import * as React from "react"
import { Search, Plus, X, ShieldAlert, ScrollText } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

import { DataTable } from "./data-table"
import { getColumns } from "./columns"
import { EditScheduleDialog } from "./edit-dialog"
import { DateActionDialog } from "./date-action-dialog"
import { PipelineLogsDialog } from "./logs-dialog"
import {
    togglePipelineSchedule,
    savePipelineSchedule,
    deletePipelineSchedule,
    deletePipelineProject,
    repairPipelineProject,
    restorePipelineProject,
    triggerPipelineSchedule,
} from "@/app/actions/pipeline-schedule"
import type {
    DashboardPipelineItem,
    PipelineProjectItem,
    SavePipelineScheduleParams,
    DateActionConfirmPayload,
} from "@/types/pipeline-schedule"
import type { ProjectConfig } from "@/config/projects/types"

interface PipelineScheduleClientProps {
    initialData: DashboardPipelineItem[]
    initialPipelineProjects?: PipelineProjectItem[]
    projects: ProjectConfig[]
    isSuperAdmin: boolean
}

export function PipelineScheduleClient({
    initialData,
    initialPipelineProjects = [],
    projects,
    isSuperAdmin,
}: PipelineScheduleClientProps) {
    const router = useRouter()
    const t = useTranslations("PipelineSchedule")
    const [data, setData] = React.useState<DashboardPipelineItem[]>(initialData)

    // Filter State
    const [searchQuery, setSearchQuery] = React.useState("")
    const [jobTypeFilter, setJobTypeFilter] = React.useState("ALL")

    // Modal States
    const [isEditOpen, setIsEditOpen] = React.useState(false)
    const [editingItem, setEditingItem] = React.useState<DashboardPipelineItem | null>(null)

    const [isDeleteOpen, setIsDeleteOpen] = React.useState(false)
    const [deletingItem, setDeletingItem] = React.useState<DashboardPipelineItem | null>(null)

    const [isStatusConfirmOpen, setIsStatusConfirmOpen] = React.useState(false)
    const [statusToggleItem, setStatusToggleItem] = React.useState<DashboardPipelineItem | null>(null)

    const [isRepairOpen, setIsRepairOpen] = React.useState(false)
    const [repairItem, setRepairItem] = React.useState<DashboardPipelineItem | null>(null)

    const [isRestoreOpen, setIsRestoreOpen] = React.useState(false)
    const [restoreItem, setRestoreItem] = React.useState<DashboardPipelineItem | null>(null)

    // Item 1: Trigger states
    const [isTriggerConfirmOpen, setIsTriggerConfirmOpen] = React.useState(false)
    const [triggerItem, setTriggerItem] = React.useState<DashboardPipelineItem | null>(null)

    // Item 4: Logs dialog state
    const [isLogsOpen, setIsLogsOpen] = React.useState(false)
    const [isLoading, setIsLoading] = React.useState(false)

    // Synchronize initial data on refresh
    React.useEffect(() => {
        setData(initialData)
    }, [initialData])

    // Filter logic: Item 1 - Search configuration name ONLY
    const filteredData = React.useMemo(() => {
        return data.filter((item) => {
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase()
                const matchName = item.name.toLowerCase().includes(q)
                if (!matchName) return false
            }

            // Job Type filter
            if (jobTypeFilter !== "ALL") {
                const itemJobType = item.jobType || "DashboardPipeline"
                if (itemJobType !== jobTypeFilter) return false
            }

            return true
        })
    }, [data, searchQuery, jobTypeFilter])

    // Handlers
    const handleAdd = () => {
        setEditingItem(null)
        setIsEditOpen(true)
    }

    const handleEdit = React.useCallback((item: DashboardPipelineItem) => {
        setEditingItem(item)
        setIsEditOpen(true)
    }, [])

    const handleDelete = React.useCallback((item: DashboardPipelineItem) => {
        setDeletingItem(item)
        setIsDeleteOpen(true)
    }, [])

    const handleToggleStatus = React.useCallback((item: DashboardPipelineItem) => {
        setStatusToggleItem(item)
        setIsStatusConfirmOpen(true)
    }, [])

    const handleRepair = React.useCallback((item: DashboardPipelineItem) => {
        setRepairItem(item)
        setIsRepairOpen(true)
    }, [])

    const handleRestore = React.useCallback((item: DashboardPipelineItem) => {
        setRestoreItem(item)
        setIsRestoreOpen(true)
    }, [])

    const handleTrigger = React.useCallback((item: DashboardPipelineItem) => {
        setTriggerItem(item)
        setIsTriggerConfirmOpen(true)
    }, [])

    // Confirm Trigger (Item 1: POST /api/schedule/dashboard-pipelines/{id}/trigger)
    const handleConfirmTrigger = async () => {
        if (!triggerItem) return
        setIsLoading(true)
        try {
            const res = await triggerPipelineSchedule(triggerItem.id)
            if (res.success) {
                toast.success(t("messages.successTrigger"))
                setIsTriggerConfirmOpen(false)
                router.refresh()
            } else {
                toast.error(res.message || t("messages.errorTrigger"))
            }
        } catch {
            toast.error(t("messages.errorTrigger"))
        } finally {
            setIsLoading(false)
        }
    }

    // Confirm Toggle Status (Item 14)
    const handleConfirmToggleStatus = async () => {
        if (!statusToggleItem) return
        setIsLoading(true)
        try {
            const res = await togglePipelineSchedule(statusToggleItem.id)
            if (res.success) {
                const isCurrentlyUsable = statusToggleItem.usable === "Y" || statusToggleItem.isActive === true
                toast.success(
                    isCurrentlyUsable
                        ? t("messages.successDisable")
                        : t("messages.successEnable")
                )
                setIsStatusConfirmOpen(false)
                router.refresh()
            } else {
                toast.error(res.message || t("messages.errorGeneric"))
            }
        } catch {
            toast.error(t("messages.errorGeneric"))
        } finally {
            setIsLoading(false)
        }
    }

    // Confirm Delete (Item 15)
    const handleConfirmDelete = async () => {
        if (!deletingItem) return
        setIsLoading(true)
        try {
            const res = await deletePipelineSchedule(deletingItem.id)
            if (res.success) {
                toast.success(t("messages.successDelete"))
                setIsDeleteOpen(false)
                router.refresh()
            } else {
                toast.error(res.message || t("messages.errorDelete"))
            }
        } catch {
            toast.error(t("messages.errorGeneric"))
        } finally {
            setIsLoading(false)
        }
    }

    // Save Pipeline Schedule
    const handleSaveSchedule = async (payload: SavePipelineScheduleParams): Promise<boolean> => {
        try {
            const res = await savePipelineSchedule(payload)
            if (res.success) {
                toast.success(payload.id ? t("messages.successUpdate") : t("messages.successAdd"))
                router.refresh()
                return true
            } else {
                toast.error(res.message || t("messages.errorSave"))
                return false
            }
        } catch {
            toast.error(t("messages.errorGeneric"))
            return false
        }
    }

    // Delete project association from pipeline
    const handleDeleteProject = async (projectId: string): Promise<boolean> => {
        try {
            const res = await deletePipelineProject(projectId)
            if (res.success) {
                toast.success(t("messages.successDeleteProject"))
                router.refresh()
                return true
            } else {
                toast.error(res.message || t("messages.errorGeneric"))
                return false
            }
        } catch {
            toast.error(t("messages.errorGeneric"))
            return false
        }
    }

    // Confirm Repair (Item 3: POST /api/schedule/dashboard-pipelines/projects/{ID}/trigger)
    const handleConfirmRepair = async (
        item: DashboardPipelineItem,
        payload: DateActionConfirmPayload
    ) => {
        try {
            const targetProjectId = payload.projectId || item.projects?.[0]?.id || item.id
            const res = await repairPipelineProject(targetProjectId, {
                startDate: payload.startDate,
                endDate: payload.endDate,
                targetDate: payload.targetDate,
            })
            if (res.success) {
                toast.success(t("repairDialog.success"))
                router.refresh()
            } else {
                toast.error(res.message || t("repairDialog.error"))
            }
        } catch {
            toast.error(t("repairDialog.error"))
        }
    }

    // Confirm Restore (Item 2: POST /api/schedule/dashboard-pipelines/projects/{ID}/restore)
    const handleConfirmRestore = async (
        item: DashboardPipelineItem,
        payload: DateActionConfirmPayload
    ) => {
        try {
            const targetProjectId = payload.projectId || item.projects?.[0]?.id || item.id
            const res = await restorePipelineProject(targetProjectId, {
                startDate: payload.startDate,
                endDate: payload.endDate,
                reprocessDashboard: payload.reprocessDashboard,
            })
            if (res.success) {
                toast.success(t("restoreDialog.success"))
                router.refresh()
            } else {
                toast.error(res.message || t("restoreDialog.error"))
            }
        } catch {
            toast.error(t("restoreDialog.error"))
        }
    }

    const columns = React.useMemo(
        () =>
            getColumns(
                {
                    onEdit: handleEdit,
                    onDelete: handleDelete,
                    onToggleStatus: handleToggleStatus,
                    onRepair: handleRepair,
                    onRestore: handleRestore,
                    onTrigger: handleTrigger,
                },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                t as any,
                isSuperAdmin
            ),
        [t, handleEdit, handleDelete, handleToggleStatus, handleRepair, handleRestore, handleTrigger, isSuperAdmin]
    )

    if (!isSuperAdmin) {
        return (
            <div className="flex flex-1 flex-col items-center justify-center min-h-[400px] gap-3 text-muted-foreground">
                <ShieldAlert className="h-12 w-12 text-muted-foreground/60" />
                <p className="text-base font-medium">{t("noAccess")}</p>
            </div>
        )
    }

    return (
        <div className="flex flex-1 flex-col gap-3 w-full h-full">
            {/* Header Toolbar: Layout matching setting-system/personal */}
            <div className="rounded-lg border bg-card text-card-foreground p-2.5 shadow-2xs space-y-2.5">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full">
                    {/* 3.1 Job Type Filter */}
                    <div className="w-full sm:w-[220px] shrink-0">
                        <Select value={jobTypeFilter} onValueChange={setJobTypeFilter}>
                            <SelectTrigger className="h-9 w-full bg-background cursor-pointer text-xs sm:text-sm">
                                <SelectValue placeholder={t("filter.allJobTypes")} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL" className="cursor-pointer text-xs sm:text-sm">
                                    {t("filter.allJobTypes")}
                                </SelectItem>
                                <SelectItem value="DashboardPipeline" className="cursor-pointer text-xs sm:text-sm">
                                    {t("dialog.jobTypeDashboardPipeline")}
                                </SelectItem>
                                <SelectItem value="DashboardNotification" className="cursor-pointer text-xs sm:text-sm">
                                    {t("dialog.jobTypeDashboardNotification")}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* 3.2 Search Input */}
                    <div className="relative flex-1 min-w-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                            placeholder={t("filter.searchPlaceholder")}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 pr-9 h-9 text-xs sm:text-sm bg-background border-input w-full shadow-2xs"
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

                    {/* 3.3 Add Configuration Button */}
                    <Button
                        onClick={handleAdd}
                        className="cursor-pointer shrink-0 h-9 px-4 text-xs font-medium shadow-2xs w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                        <Plus className="mr-1.5 h-4 w-4" />
                        {t("filter.addConfig")}
                    </Button>

                    {/* Item 4: View Logs Button (Icon only) */}
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setIsLogsOpen(true)}
                        title={t("filter.viewLogs")}
                        aria-label={t("filter.viewLogs")}
                        className="cursor-pointer shrink-0 h-9 w-9 bg-background hover:bg-muted/50 shadow-2xs"
                    >
                        <ScrollText className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                    </Button>
                </div>
            </div>

            {/* Table Section */}
            <div className="flex-1 flex flex-col min-h-0">
                <DataTable columns={columns} data={filteredData} />
            </div>

            {/* Add / Edit Dialog */}
            <EditScheduleDialog
                open={isEditOpen}
                onOpenChange={setIsEditOpen}
                item={editingItem}
                projects={projects}
                pipelineProjects={initialPipelineProjects}
                onSave={handleSaveSchedule}
                onDeleteProject={editingItem ? handleDeleteProject : undefined}
            />

            {/* Repair Dialog */}
            <DateActionDialog
                open={isRepairOpen}
                onOpenChange={setIsRepairOpen}
                item={repairItem}
                actionType="repair"
                onConfirm={handleConfirmRepair}
            />

            {/* Restore Dialog */}
            <DateActionDialog
                open={isRestoreOpen}
                onOpenChange={setIsRestoreOpen}
                item={restoreItem}
                actionType="restore"
                onConfirm={handleConfirmRestore}
            />

            {/* Toggle Status Confirmation Dialog (Item 14 - matching setting-system/personal) */}
            <AlertDialog open={isStatusConfirmOpen} onOpenChange={setIsStatusConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("form.statusTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("form.statusDescription")} <strong>{statusToggleItem?.name}</strong>?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="cursor-pointer" disabled={isLoading}>
                            {t("form.cancel")}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            className="cursor-pointer"
                            onClick={(e) => {
                                e.preventDefault()
                                handleConfirmToggleStatus()
                            }}
                            disabled={isLoading}
                        >
                            {isLoading ? t("form.changing") : t("form.confirm")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Delete Configuration Confirmation Dialog (Item 15 - matching setting-system/personal) */}
            <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("form.deleteTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("form.deleteDescription")} <strong>{deletingItem?.name}</strong>.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="cursor-pointer" disabled={isLoading}>
                            {t("form.cancel")}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault()
                                handleConfirmDelete()
                            }}
                            disabled={isLoading}
                            className="cursor-pointer bg-destructive text-white hover:bg-destructive/90"
                        >
                            {isLoading ? t("form.deleting") : t("form.confirm")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Trigger Confirmation Dialog (Item 1) */}
            <AlertDialog open={isTriggerConfirmOpen} onOpenChange={setIsTriggerConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("form.triggerTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("form.triggerDescription")} <strong>{triggerItem?.name}</strong>?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="cursor-pointer" disabled={isLoading}>
                            {t("form.cancel")}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            className="cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={(e) => {
                                e.preventDefault()
                                handleConfirmTrigger()
                            }}
                            disabled={isLoading}
                        >
                            {isLoading ? t("form.processing") : t("form.confirm")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Pipeline Execution Logs Dialog (Item 4) */}
            <PipelineLogsDialog
                open={isLogsOpen}
                onOpenChange={setIsLogsOpen}
                projects={projects}
            />
        </div>
    )
}
