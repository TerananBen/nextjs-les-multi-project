"use client"

import * as React from "react"
import { Search, Plus, X } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
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

import type { ProjectConfig, ColorPreset } from "@/config/projects/types"
import { saveProject, deleteProject, SaveProjectPayload } from "@/app/actions/project-management"
import { DataTable } from "./data-table"
import { getColumns, COLOR_PRESET_BG_CLASSES } from "./columns"
import { ProjectForm } from "./project-form"
import { usePermission } from "@/components/providers/permission-provider"
import { cn } from "@/lib/utils"

const COLOR_OPTIONS: { value: ColorPreset; label: string }[] = [
    { value: "skyblue", label: "Sky Blue" },
    { value: "blue", label: "Blue" },
    { value: "green", label: "Green" },
    { value: "purple", label: "Purple" },
    { value: "amber", label: "Amber" },
    { value: "rose", label: "Rose" },
    { value: "indigo", label: "Indigo" },
    { value: "emerald", label: "Emerald" },
    { value: "slate", label: "Slate" },
]

interface ProjectClientProps {
    initialData: ProjectConfig[]
}

export function ProjectClient({ initialData }: ProjectClientProps) {
    const router = useRouter()
    const t = useTranslations("ProjectSettings")
    const { getPermission } = usePermission()
    const { writable: canWrite, control: canControl } = getPermission("system_project")

    const [data, setData] = React.useState<ProjectConfig[]>(initialData)
    const [searchQuery, setSearchQuery] = React.useState("")
    const [colorFilter, setColorFilter] = React.useState<string>("ALL")
    const [otpFilter, setOtpFilter] = React.useState<string>("ALL")

    const [isEditOpen, setIsEditOpen] = React.useState(false)
    const [editingProject, setEditingProject] = React.useState<ProjectConfig | null>(null)
    const [isDeleteOpen, setIsDeleteOpen] = React.useState(false)
    const [deletingProject, setDeletingProject] = React.useState<ProjectConfig | null>(null)
    const [isLoading, setIsLoading] = React.useState(false)

    React.useEffect(() => {
        setData(initialData)
    }, [initialData])

    const filteredData = React.useMemo(() => {
        return data.filter((item) => {
            if (searchQuery.trim()) {
                const lower = searchQuery.toLowerCase().trim()
                const matches =
                    item.id.toLowerCase().includes(lower) ||
                    (item.code && item.code.toLowerCase().includes(lower)) ||
                    item.name.toLowerCase().includes(lower) ||
                    item.domain.toLowerCase().includes(lower) ||
                    item.color.toLowerCase().includes(lower)
                if (!matches) return false
            }

            if (colorFilter !== "ALL") {
                const itemColor = item.color || "skyblue"
                if (itemColor !== colorFilter) return false
            }

            if (otpFilter !== "ALL") {
                const isEnabled = Boolean(item.enableLoginOtp)
                if (otpFilter === "ENABLED" && !isEnabled) return false
                if (otpFilter === "DISABLED" && isEnabled) return false
            }

            return true
        })
    }, [data, searchQuery, colorFilter, otpFilter])

    const handleEdit = React.useCallback((project: ProjectConfig) => {
        if (!canWrite) return
        setEditingProject(project)
        setIsEditOpen(true)
    }, [canWrite])

    const handleAdd = React.useCallback(() => {
        if (!canWrite) return
        setEditingProject(null)
        setIsEditOpen(true)
    }, [canWrite])

    const handleDeleteClick = React.useCallback((project: ProjectConfig) => {
        if (!canControl) return
        setDeletingProject(project)
        setIsDeleteOpen(true)
    }, [canControl])

    const handleSave = async (values: SaveProjectPayload) => {
        if (!canWrite) {
            toast.error(t("messages.permissionDenied"))
            return
        }
        setIsLoading(true)
        try {
            const res = await saveProject(values)
            if (res && res.result) {
                toast.success(editingProject ? t("messages.successUpdate") : t("messages.successAdd"))
                setIsEditOpen(false)
                setData((prev) => {
                    const targetId = values.id || editingProject?.id || ""
                    const existingIndex = prev.findIndex((p) => p.id === targetId)
                    const updatedItem: ProjectConfig = {
                        id: targetId,
                        code: values.code || editingProject?.code || (values.domain ? values.domain.split('.')[0] : targetId),
                        name: values.name,
                        domain: values.domain,
                        logo: values.logo,
                        appIcon: values.appIcon,
                        color: values.color,
                        enableLoginOtp: Boolean(values.enableLoginOtp),
                    }
                    if (existingIndex >= 0) {
                        const copy = [...prev]
                        copy[existingIndex] = { ...copy[existingIndex], ...updatedItem }
                        return copy
                    }
                    return [...prev, updatedItem]
                })
                router.refresh()
            } else {
                toast.error(res?.message || t("messages.errorSave"))
            }
        } catch {
            toast.error(t("messages.errorGeneric"))
        } finally {
            setIsLoading(false)
        }
    }

    const handleDeleteConfirm = async () => {
        if (!deletingProject || !canControl) return

        const deletedId = deletingProject.id
        setIsLoading(true)
        try {
            const res = await deleteProject(deletedId)
            if (res && res.result) {
                toast.success(t("messages.successDelete"))
                setIsDeleteOpen(false)
                setData((prev) => prev.filter((p) => p.id !== deletedId))
                router.refresh()
            } else {
                toast.error(res?.message || t("messages.errorDelete"))
            }
        } catch {
            toast.error(t("messages.errorGeneric"))
        } finally {
            setIsLoading(false)
        }
    }

    const columns = React.useMemo(
        () =>
            getColumns(
                {
                    onEdit: handleEdit,
                    onDelete: handleDeleteClick,
                    canWrite,
                    canControl,
                },
                t
            ),
        [t, handleEdit, handleDeleteClick, canWrite, canControl]
    )

    return (
        <div className="flex flex-1 flex-col gap-3 w-full h-full">
            {/* Header Toolbar: Compact Container */}
            <div className="rounded-lg border bg-card p-3 shadow-2xs">
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 w-full">
                    {/* Left: Filters & Search */}
                    <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        {/* 2FA Email OTP Status Filter */}
                        <Select value={otpFilter} onValueChange={setOtpFilter}>
                            <SelectTrigger className="h-9 w-full sm:w-[170px] bg-background cursor-pointer text-xs shrink-0">
                                <SelectValue placeholder={t("filter.allStatus")} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL" className="cursor-pointer text-xs">{t("filter.allStatus")}</SelectItem>
                                <SelectItem value="ENABLED" className="cursor-pointer text-xs">{t("filter.enabled")}</SelectItem>
                                <SelectItem value="DISABLED" className="cursor-pointer text-xs">{t("filter.disabled")}</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Theme Color Filter */}
                        <Select value={colorFilter} onValueChange={setColorFilter}>
                            <SelectTrigger className="h-9 w-full sm:w-[150px] bg-background cursor-pointer text-xs shrink-0">
                                <SelectValue placeholder={t("filter.allColors")} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL" className="cursor-pointer text-xs">{t("filter.allColors")}</SelectItem>
                                {COLOR_OPTIONS.map((col) => (
                                    <SelectItem key={col.value} value={col.value} className="cursor-pointer text-xs">
                                        <div className="flex items-center gap-2">
                                            <div className={cn("h-3 w-3 rounded-full border border-border shrink-0", COLOR_PRESET_BG_CLASSES[col.value])} />
                                            <span>{col.label}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Search Input (Expands to fill available space) */}
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                            <Input
                                placeholder={t("searchPlaceholder")}
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
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
                    </div>

                    {/* Right: Actions */}
                    {canWrite && (
                        <div className="flex items-center justify-end shrink-0 w-full md:w-auto">
                            <Button onClick={handleAdd} className="cursor-pointer h-9 px-3.5 text-xs font-medium shadow-2xs w-full md:w-auto">
                                <Plus className="mr-1.5 h-4 w-4" /> {t("addProject")}
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Middle & Bottom Table Section */}
            <div className="flex-1 flex flex-col min-h-0">
                <DataTable columns={columns} data={filteredData} loading={isLoading} />
            </div>

            {/* Create/Edit Dialog */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="sm:max-w-[550px] max-h-[85vh] p-0 gap-0 overflow-hidden flex flex-col">
                    <DialogHeader className="px-6 pt-5 pb-3 border-b border-border/40 shrink-0">
                        <DialogTitle>{editingProject ? t("form.editTitle") : t("form.addTitle")}</DialogTitle>
                        <DialogDescription>
                            {editingProject ? t("form.editDescription") : t("form.addDescription")}
                        </DialogDescription>
                    </DialogHeader>
                    <ProjectForm
                        initialData={editingProject}
                        onSubmit={handleSave}
                        onCancel={() => setIsEditOpen(false)}
                        isLoading={isLoading}
                    />
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Alert */}
            <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("form.deleteTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("form.deleteDescription")} <strong>{deletingProject?.name} ({deletingProject?.code || deletingProject?.id})</strong>?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isLoading} className="cursor-pointer">
                            {t("form.cancel")}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteConfirm}
                            disabled={isLoading}
                            className="bg-destructive text-white hover:bg-destructive/90 cursor-pointer"
                        >
                            {t("form.deleteConfirm")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
