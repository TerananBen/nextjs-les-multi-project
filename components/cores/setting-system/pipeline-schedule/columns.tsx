"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ArrowUpDown, MoreHorizontal, Edit, Trash2, Wrench, RotateCcw, Clock, Play } from "lucide-react"
import { cn } from "@/lib/utils"
import type { DashboardPipelineItem } from "@/types/pipeline-schedule"

export interface PipelineColumnActions {
    onEdit: (item: DashboardPipelineItem) => void
    onDelete: (item: DashboardPipelineItem) => void
    onToggleStatus: (item: DashboardPipelineItem) => void
    onRepair: (item: DashboardPipelineItem) => void
    onRestore: (item: DashboardPipelineItem) => void
    onTrigger: (item: DashboardPipelineItem) => void
}

export const getColumns = (
    {
        onEdit,
        onDelete,
        onToggleStatus,
        onRepair,
        onRestore,
        onTrigger,
    }: PipelineColumnActions,
    t: (key: string) => string,
    isWritable: boolean = true
): ColumnDef<DashboardPipelineItem>[] => {
    return [
        // 1. ชื่อการตั้งค่า
        {
            accessorKey: "name",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="-ml-3 h-8 hover:bg-transparent cursor-pointer font-semibold text-muted-foreground text-xs"
                    >
                        {t("table.name")}
                        <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                return (
                    <div className="flex flex-col">
                        <span className="font-medium text-foreground text-xs sm:text-sm">
                            {row.original.name}
                        </span>
                        {row.original.description && (
                            <span className="text-xs text-muted-foreground line-clamp-1 max-w-[280px]">
                                {row.original.description}
                            </span>
                        )}
                    </div>
                )
            },
        },

        // Item 5: ประเภทงาน (jobType)
        {
            accessorKey: "jobType",
            header: () => (
                <div className="text-center text-xs font-semibold text-muted-foreground">
                    {t("table.jobType")}
                </div>
            ),
            cell: ({ row }) => {
                const jobType = row.original.jobType || "DashboardPipeline"
                return (
                    <div className="flex justify-center">
                        <Badge variant="secondary" className="text-xs font-normal bg-muted/60 text-foreground">
                            {jobType}
                        </Badge>
                    </div>
                )
            },
        },

        // 2. โปรเจกต์ภายใต้การตั้งค่า (รูปแบบคล้ายกับกลุ่มของอุปกรณ์)
        {
            id: "projects",
            header: () => <div className="text-center text-xs font-semibold text-muted-foreground">{t("table.projects")}</div>,
            cell: ({ row }) => {
                const projects = row.original.projects || []
                if (projects.length === 0) {
                    return <div className="text-center text-xs text-muted-foreground">-</div>
                }

                const firstProj = projects[0]
                const firstName = firstProj.displayName || firstProj.projectName || firstProj.projectId

                if (projects.length === 1) {
                    return (
                        <div className="flex justify-center">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span className="text-xs text-foreground font-medium max-w-[200px] truncate cursor-default">
                                        {firstName}
                                    </span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs text-xs">
                                    <p>{firstName}</p>
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    )
                }

                const remainingProjects = projects.slice(1)

                return (
                    <div className="flex items-center justify-center gap-1.5">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span className="text-xs text-foreground font-medium max-w-[150px] truncate cursor-default">
                                    {firstName}
                                </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs text-xs">
                                <p>{firstName}</p>
                            </TooltipContent>
                        </Tooltip>

                        <Popover>
                            <Tooltip>
                                <PopoverTrigger asChild>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            className="h-5 px-1.5 text-xs font-medium rounded-full cursor-pointer hover:bg-secondary/80"
                                        >
                                            +{remainingProjects.length}
                                        </Button>
                                    </TooltipTrigger>
                                </PopoverTrigger>
                                <TooltipContent side="top" className="max-w-xs text-xs">
                                    <p className="font-semibold mb-1">{t("table.projects")} ({projects.length}):</p>
                                    <div className="space-y-0.5">
                                        {remainingProjects.map((p, idx) => (
                                            <div key={idx} className="truncate">• {p.displayName || p.projectName || p.projectId}</div>
                                        ))}
                                    </div>
                                </TooltipContent>
                            </Tooltip>
                            <PopoverContent className="w-56 p-3 text-xs" align="center">
                                <div className="font-semibold mb-2 border-b pb-1 flex justify-between items-center">
                                    <span>{t("table.projects")}</span>
                                    <span className="text-[11px] font-normal text-muted-foreground">
                                        {projects.length} {t("table.projectsCount")}
                                    </span>
                                </div>
                                <div className="flex flex-col gap-1 max-h-[180px] overflow-y-auto pr-1">
                                    {projects.map((proj, index) => {
                                        const pName = proj.displayName || proj.projectName || proj.projectId
                                        return (
                                            <div
                                                key={index}
                                                className="p-1.5 rounded-md bg-muted/50 text-foreground text-xs flex items-center"
                                            >
                                                <span className="truncate">{pName}</span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                )
            },
        },

        // 3. เวลาเริ่มทำงาน
        {
            accessorKey: "dailyTimes",
            header: () => <div className="text-center text-xs font-semibold text-muted-foreground">{t("table.startTime")}</div>,
            cell: ({ row }) => {
                const times = row.original.dailyTimes
                const timeStr = typeof times === "string" ? times : (Array.isArray(times) ? times.join(", ") : "-")
                return (
                    <div className="flex items-center justify-center gap-1 font-mono text-xs text-foreground">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{timeStr || "-"}</span>
                    </div>
                )
            },
        },

        // Item 1: trigger
        {
            id: "trigger",
            size: 90,
            header: () => <div className="text-center text-xs font-semibold text-muted-foreground">{t("table.trigger")}</div>,
            cell: ({ row }) => {
                return (
                    <div className="flex justify-center">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onTrigger(row.original)}
                            disabled={!isWritable}
                            className="cursor-pointer h-7 px-2.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:bg-emerald-500/10 border-emerald-500/30 shadow-2xs"
                        >
                            <Play className="mr-1 h-3 w-3 fill-current" />
                            {t("table.trigger")}
                        </Button>
                    </div>
                )
            },
        },

        // 4. repair
        {
            id: "repair",
            size: 90,
            header: () => <div className="text-center text-xs font-semibold text-muted-foreground">{t("table.repair")}</div>,
            cell: ({ row }) => {
                return (
                    <div className="flex justify-center">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onRepair(row.original)}
                            disabled={!isWritable}
                            className="cursor-pointer h-7 px-2.5 text-xs font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 hover:bg-amber-500/10 border-amber-500/30 shadow-2xs"
                        >
                            <Wrench className="mr-1 h-3 w-3" />
                            {t("table.repair")}
                        </Button>
                    </div>
                )
            },
        },

        // 5. restore
        {
            id: "restore",
            size: 90,
            header: () => <div className="text-center text-xs font-semibold text-muted-foreground">{t("table.restore")}</div>,
            cell: ({ row }) => {
                return (
                    <div className="flex justify-center">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onRestore(row.original)}
                            disabled={!isWritable}
                            className="cursor-pointer h-7 px-2.5 text-xs font-medium text-sky-600 dark:text-sky-400 hover:text-sky-700 hover:bg-sky-500/10 border-sky-500/30 shadow-2xs"
                        >
                            <RotateCcw className="mr-1 h-3 w-3" />
                            {t("table.restore")}
                        </Button>
                    </div>
                )
            },
        },

        // 6. สถานะ
        {
            accessorKey: "usable",
            size: 90,
            header: () => <div className="text-center text-xs font-semibold text-muted-foreground">{t("table.status")}</div>,
            cell: ({ row }) => {
                const isUsable = row.original.usable === "Y" || row.original.isActive === true
                return (
                    <div className="flex justify-center">
                        <Badge
                            variant={isUsable ? "default" : "secondary"}
                            className={cn(
                                "text-xs font-normal",
                                isWritable ? "cursor-pointer" : "cursor-not-allowed opacity-60",
                                isUsable && "bg-emerald-600 hover:bg-emerald-700 text-white border-transparent"
                            )}
                            onClick={() => {
                                if (isWritable) onToggleStatus(row.original)
                            }}
                        >
                            {isUsable ? t("table.active") : t("table.disabled")}
                        </Badge>
                    </div>
                )
            },
        },

        // 7. ตัวเลือกเพิ่มเติม
        {
            id: "actions",
            size: 70,
            header: () => <div className="text-center text-xs font-semibold text-muted-foreground">{t("table.actions")}</div>,
            cell: ({ row }) => {
                return (
                    <div className="flex justify-center">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0 cursor-pointer">
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                    onClick={() => {
                                        if (isWritable) onEdit(row.original)
                                    }}
                                    disabled={!isWritable}
                                    className={cn(
                                        "cursor-pointer text-xs",
                                        !isWritable && "opacity-50 cursor-not-allowed"
                                    )}
                                >
                                    <Edit className="mr-2 h-3.5 w-3.5" />
                                    {t("table.edit")}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    variant="destructive"
                                    onClick={() => {
                                        if (isWritable) onDelete(row.original)
                                    }}
                                    disabled={!isWritable}
                                    className={cn(
                                        "cursor-pointer text-destructive focus:text-destructive text-xs",
                                        !isWritable && "opacity-50 cursor-not-allowed"
                                    )}
                                >
                                    <Trash2 className="mr-2 h-3.5 w-3.5 text-destructive" />
                                    {t("table.delete")}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )
            },
        },
    ]
}
