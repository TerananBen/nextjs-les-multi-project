"use client"

import { ColumnDef } from "@tanstack/react-table"
import { ScheduleItem } from "@/types/schedule-settings"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ArrowUpDown, Edit, Trash2, Info, Clock, SunMedium, Sliders, MoreHorizontal } from "lucide-react"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { usePermission } from "@/components/providers/permission-provider"

interface UseScheduleColumnsProps {
    onEdit: (item: ScheduleItem) => void
    onDelete: (item: ScheduleItem) => void
    onFeedback: (item: ScheduleItem) => void
}

export const useScheduleColumns = ({ onEdit, onDelete, onFeedback }: UseScheduleColumnsProps) => {
    const t = useTranslations("ScheduleSettings")
    const { getPermission } = usePermission()
    const { writable: canManage } = getPermission("V_SettingSchedule")

    const columns: ColumnDef<ScheduleItem>[] = [
        {
            accessorKey: "scheduleName",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="hover:bg-transparent cursor-pointer p-0 h-auto font-semibold text-sm"
                    >
                        <span>{t("table.scheduleName")}</span>
                        <ArrowUpDown className="ml-2 h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                )
            },
            cell: ({ row }) => (
                <div className="font-medium text-foreground">
                    {row.getValue("scheduleName")}
                </div>
            ),
        },
        {
            accessorKey: "typeSchedule",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="hover:bg-transparent cursor-pointer p-0 h-auto font-semibold text-sm"
                    >
                        <span>{t("table.typeSchedule")}</span>
                        <ArrowUpDown className="ml-2 h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const rawType = String(row.getValue("typeSchedule") || "").toLowerCase().trim()

                let type = "time"
                let badgeColor = "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20"
                let IconComponent = Clock

                if (rawType.includes("light") || rawType.includes("sensor") || rawType.includes("แสง")) {
                    type = "light"
                    badgeColor = "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                    IconComponent = SunMedium
                } else if (rawType.includes("manual") || rawType.includes("มือ") || rawType.includes("ปิดใช้งาน")) {
                    type = "manual"
                    badgeColor = "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                    IconComponent = Sliders
                } else if (rawType.includes("time") || rawType.includes("timer") || rawType.includes("เวลา")) {
                    type = "time"
                    badgeColor = "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20"
                    IconComponent = Clock
                } else if (rawType) {
                    type = rawType
                    badgeColor = "bg-muted text-muted-foreground border-border"
                }

                const label = t(`types.${type}`) || (type === "light" ? t("types.light") : type)

                return (
                    <div className="flex justify-center">
                        <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border shadow-2xs", badgeColor)}>
                            <IconComponent className="h-3 w-3 shrink-0" />
                            {label}
                        </span>
                    </div>
                )
            },
        },
        {
            accessorKey: "dataGroupName",
            header: () => (
                <div className="text-center text-sm font-semibold">{t("table.groups", { defaultValue: "กลุ่มอุปกรณ์" })}</div>
            ),
            cell: ({ row }) => {
                const groups = (row.original.dataGroupName || []) as string[]
                if (!groups || groups.length === 0) {
                    return <div className="text-center text-sm text-muted-foreground">-</div>
                }
                if (groups.length === 1) {
                    return (
                        <div className="flex justify-center">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Badge
                                        variant="outline"
                                        className="text-xs font-normal max-w-[200px] truncate bg-muted/40 text-foreground cursor-default hover:bg-muted/70 transition-colors"
                                    >
                                        {groups[0]}
                                    </Badge>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs text-xs">
                                    <p>{groups[0]}</p>
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    )
                }
                return (
                    <div className="flex items-center justify-center gap-1.5">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Badge
                                    variant="outline"
                                    className="text-xs font-normal max-w-[150px] truncate bg-muted/40 text-foreground cursor-default hover:bg-muted/70 transition-colors"
                                >
                                    {groups[0]}
                                </Badge>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs text-xs">
                                <p>{groups[0]}</p>
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
                                            +{groups.length - 1}
                                        </Button>
                                    </TooltipTrigger>
                                </PopoverTrigger>
                                <TooltipContent side="top" className="max-w-xs text-xs">
                                    <p className="font-semibold mb-1">{t("table.groups", { defaultValue: "กลุ่มอุปกรณ์" })} ({groups.length}):</p>
                                    <div className="space-y-0.5">
                                        {groups.slice(1).map((g, idx) => (
                                            <div key={idx} className="truncate">• {g}</div>
                                        ))}
                                    </div>
                                </TooltipContent>
                            </Tooltip>
                            <PopoverContent className="w-56 p-3 text-sm">
                                <div className="font-semibold mb-2 border-b pb-1">
                                    {t("table.groups", { defaultValue: "กลุ่มอุปกรณ์" })} ({groups.length})
                                </div>
                                <div className="flex flex-col gap-1.5 max-h-[180px] overflow-y-auto">
                                    {groups.map((group, index) => (
                                        <div key={index} className="p-1.5 rounded-md bg-muted/50 text-foreground text-xs">
                                            {group}
                                        </div>
                                    ))}
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                )
            },
            enableSorting: false,
        },
        {
            id: "actions",
            header: () => (
                <div className="text-center text-sm font-semibold">{t("table.actions", { defaultValue: "ตัวเลือกเพิ่มเติม" })}</div>
            ),
            cell: ({ row }) => {
                return (
                    <div className="flex justify-center">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 cursor-pointer text-muted-foreground hover:text-foreground hover:bg-muted"
                                >
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">{t("table.actions", { defaultValue: "ตัวเลือกเพิ่มเติม" })}</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem
                                    onClick={() => {
                                        if (canManage) onEdit(row.original)
                                        else toast.error(t("table.permissionDenied"))
                                    }}
                                    disabled={!canManage}
                                    className={cn(
                                        "cursor-pointer gap-2.5 py-2 px-2.5 text-sm",
                                        !canManage && "opacity-50 cursor-not-allowed"
                                    )}
                                >
                                    <Edit className="h-4 w-4 text-current" />
                                    <span>{t("table.edit")}</span>
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                    onClick={() => onFeedback(row.original)}
                                    className="cursor-pointer gap-2.5 py-2 px-2.5 text-sm"
                                >
                                    <Info className="h-4 w-4 text-current" />
                                    <span>{t("table.feedback")}</span>
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                    variant="destructive"
                                    onClick={() => {
                                        if (canManage) onDelete(row.original)
                                        else toast.error(t("table.permissionDenied"))
                                    }}
                                    disabled={!canManage}
                                    className={cn(
                                        "cursor-pointer gap-2.5 py-2 px-2.5 text-sm text-destructive focus:text-destructive focus:bg-destructive/10",
                                        !canManage && "opacity-50 cursor-not-allowed"
                                    )}
                                >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                    <span>{t("table.delete")}</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )
            },
            enableSorting: false,
        },
    ]

    return columns
}
