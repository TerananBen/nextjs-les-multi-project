"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { GroupConfigData } from "@/types/group-config"
import { getListDataGroupAllAction, addNewGroupNameAction } from "@/app/actions/group-config"
import { useGroupConfigColumns } from "./columns"
import { DataTable } from "./data-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Search, Loader2, Plus, X, Layers, Radio, CheckCircle2, FolderX } from "lucide-react"
import { cn } from "@/lib/utils"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogTrigger,
    DialogClose,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { usePermission } from "@/components/providers/permission-provider"

export function GroupConfigClient() {
    const t = useTranslations("GroupConfig")
    const { getPermission } = usePermission()
    // User requested: Add/Edit/Delete -> Writable
    const { writable: canAdd } = getPermission("V_GroupConfig")

    // State
    const [data, setData] = React.useState<GroupConfigData[]>([])
    const [loading, setLoading] = React.useState(false)
    const [searchQuery, setSearchQuery] = React.useState("")
    const [groupFilter, setGroupFilter] = React.useState<"ALL" | "ACTIVE" | "EMPTY">("ALL")

    // Add Group State
    const [isAddGroupOpen, setIsAddGroupOpen] = React.useState(false)
    const [newGroupName, setNewGroupName] = React.useState("")
    const [isAdding, setIsAdding] = React.useState(false)

    const fetchData = React.useCallback(async () => {
        setLoading(true)
        try {
            const result = await getListDataGroupAllAction()
            if (result) {
                setData(result)
            }
        } catch (error) {
            console.error("Failed to fetch groups", error)
            toast.error(t("loadFailed"))
        } finally {
            setLoading(false)
        }
    }, [t])

    // Columns
    const columns = useGroupConfigColumns(fetchData)

    // Fetch Data on Mount
    React.useEffect(() => {
        fetchData()
    }, [fetchData])

    const handleAddGroup = async () => {
        if (!newGroupName.trim()) {
            toast.error(t("dialog.required"))
            return
        }

        setIsAdding(true)
        try {
            const result = await addNewGroupNameAction(newGroupName)
            if (result.result) {
                toast.success(t("dialog.success"))
                setIsAddGroupOpen(false)
                setNewGroupName("")
                fetchData() // Refresh list
            } else {
                toast.error(t("dialog.error"))
            }
        } catch (error) {
            console.error("Error adding group:", error)
            toast.error(t("dialog.error"))
        } finally {
            setIsAdding(false)
        }
    }

    // Local Filtering
    const filteredData = React.useMemo(() => {
        let result = data
        if (groupFilter === "ACTIVE") {
            result = result.filter(curr => (parseInt(curr.total_rtu, 10) || 0) > 0)
        } else if (groupFilter === "EMPTY") {
            result = result.filter(curr => (parseInt(curr.total_rtu, 10) || 0) === 0)
        }

        if (searchQuery.trim()) {
            const lowerQuery = searchQuery.toLowerCase().trim()
            result = result.filter(group =>
                group.group_name.toLowerCase().includes(lowerQuery)
            )
        }
        return result
    }, [data, groupFilter, searchQuery])

    const totalDevicesCount = React.useMemo(() => {
        return data.reduce((acc, curr) => acc + (parseInt(curr.total_rtu, 10) || 0), 0)
    }, [data])

    const activeGroupsCount = React.useMemo(() => {
        return data.filter(curr => (parseInt(curr.total_rtu, 10) || 0) > 0).length
    }, [data])

    const emptyGroupsCount = React.useMemo(() => {
        return data.length - activeGroupsCount
    }, [data, activeGroupsCount])

    return (
        <div className="flex flex-1 flex-col gap-4 w-full h-full">
            {/* Filter & Action Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 p-2 rounded-lg border bg-card text-card-foreground shadow-2xs">
                {/* Search Input */}
                <div className="relative flex-1 min-w-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                        placeholder={t("searchPlaceholder")}
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

                {/* Add Group Button */}
                <Dialog
                    open={isAddGroupOpen}
                    onOpenChange={(val) => {
                        if (canAdd) setIsAddGroupOpen(val)
                    }}
                >
                    <DialogTrigger asChild>
                        <Button
                            className="cursor-pointer shrink-0 h-9 px-4 text-sm font-medium shadow-2xs"
                            disabled={!canAdd}
                            onClick={(e) => {
                                if (!canAdd) {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    toast.error(t("permissionDenied"))
                                }
                            }}
                        >
                            <Plus className="mr-1.5 h-4 w-4" />
                            {t("addGroup")}
                        </Button>
                    </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px] flex flex-col p-0 gap-0 overflow-hidden">
                            <DialogHeader className="px-6 py-4 border-b shrink-0 text-left">
                                <DialogTitle className="text-lg font-semibold flex items-center justify-start gap-2 text-left">
                                    <Plus className="h-5 w-5 text-primary shrink-0" />
                                    {t("dialog.title")}
                                </DialogTitle>
                                <DialogDescription className="sr-only">
                                    {t("dialog.title")}
                                </DialogDescription>
                                <div className="text-sm text-muted-foreground text-left">
                                    {t("dialog.description", { defaultValue: "สร้างกลุ่มอุปกรณ์ใหม่เพื่อจัดหมวดหมู่และควบคุม" })}
                                </div>
                            </DialogHeader>
                            <div className="p-6">
                                <div className="flex flex-col gap-2">
                                    <Label htmlFor="group-name" className="text-sm font-medium">
                                        {t("dialog.groupNameLabel")}
                                    </Label>
                                    <Input
                                        id="group-name"
                                        placeholder={t("dialog.placeholder", { defaultValue: "ระบุชื่อกลุ่ม..." })}
                                        value={newGroupName}
                                        onChange={(e) => setNewGroupName(e.target.value)}
                                        className="h-10 text-sm"
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" && !isAdding && newGroupName.trim()) {
                                                e.preventDefault()
                                                handleAddGroup()
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                            <DialogFooter className="px-6 py-4 border-t shrink-0 bg-muted/20">
                                <DialogClose asChild>
                                    <Button className="cursor-pointer" type="button" variant="outline">
                                        {t("dialog.cancel")}
                                    </Button>
                                </DialogClose>
                                <Button className="cursor-pointer" onClick={handleAddGroup} disabled={isAdding || !newGroupName.trim()}>
                                    {isAdding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {isAdding ? t("dialog.saving") : t("dialog.save")}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full">
                {/* Card 1: Total Groups */}
                <button
                    type="button"
                    onClick={() => setGroupFilter("ALL")}
                    className={cn(
                        "flex items-center gap-3.5 p-3.5 rounded-xl border transition-all text-left cursor-pointer shadow-2xs",
                        groupFilter === "ALL" && (searchQuery !== "" || groupFilter !== "ALL")
                            ? "border-primary/50 bg-primary/10 ring-1 ring-primary/30"
                            : "border-border/80 bg-muted/40 hover:bg-muted/70"
                    )}
                >
                    <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">
                        <Layers className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs text-muted-foreground font-medium truncate">{t("kpi.totalGroups")}</p>
                        <div className="flex items-baseline gap-1.5">
                            <p className="text-xl font-bold tracking-tight text-foreground">{data.length}</p>
                            <span className="text-xs text-muted-foreground">{t("kpi.groupsUnit")}</span>
                        </div>
                    </div>
                </button>

                {/* Card 2: Total Grouped Devices */}
                <div className="flex items-center gap-3.5 p-3.5 rounded-xl border border-border/80 bg-muted/40 shadow-2xs">
                    <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                        <Radio className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs text-muted-foreground font-medium truncate">{t("kpi.totalDevices")}</p>
                        <div className="flex items-baseline gap-1.5">
                            <p className="text-xl font-bold tracking-tight text-foreground">{totalDevicesCount}</p>
                            <span className="text-xs text-muted-foreground">{t("kpi.devicesUnit")}</span>
                        </div>
                    </div>
                </div>

                {/* Card 3: Active Groups */}
                <button
                    type="button"
                    onClick={() => setGroupFilter(prev => prev === "ACTIVE" ? "ALL" : "ACTIVE")}
                    className={cn(
                        "flex items-center gap-3.5 p-3.5 rounded-xl border transition-all text-left cursor-pointer shadow-2xs",
                        groupFilter === "ACTIVE"
                            ? "border-sky-500/50 bg-sky-500/10 ring-1 ring-sky-500/30"
                            : "border-border/80 bg-muted/40 hover:bg-muted/70"
                    )}
                >
                    <div className="p-2.5 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 shrink-0">
                        <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs text-muted-foreground font-medium truncate">{t("kpi.activeGroups")}</p>
                        <div className="flex items-baseline gap-1.5">
                            <p className="text-xl font-bold tracking-tight text-foreground">{activeGroupsCount}</p>
                            <span className="text-xs text-muted-foreground">{t("kpi.groupsUnit")}</span>
                        </div>
                    </div>
                </button>

                {/* Card 4: Empty Groups */}
                <button
                    type="button"
                    onClick={() => setGroupFilter(prev => prev === "EMPTY" ? "ALL" : "EMPTY")}
                    className={cn(
                        "flex items-center gap-3.5 p-3.5 rounded-xl border transition-all text-left cursor-pointer shadow-2xs",
                        groupFilter === "EMPTY"
                            ? "border-amber-500/50 bg-amber-500/10 ring-1 ring-amber-500/30"
                            : "border-border/80 bg-muted/40 hover:bg-muted/70"
                    )}
                >
                    <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                        <FolderX className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs text-muted-foreground font-medium truncate">{t("kpi.emptyGroups")}</p>
                        <div className="flex items-baseline gap-1.5">
                            <p className="text-xl font-bold tracking-tight text-foreground">{emptyGroupsCount}</p>
                            <span className="text-xs text-muted-foreground">{t("kpi.groupsUnit")}</span>
                        </div>
                    </div>
                </button>
            </div>

            {/* Table Section */}
            <div className="flex-1 flex flex-col min-h-0">
                <DataTable columns={columns} data={filteredData} loading={loading} />
            </div>
        </div>
    )
}
