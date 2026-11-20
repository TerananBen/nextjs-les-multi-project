"use client"

import { ColumnDef } from "@tanstack/react-table"
import type { ProjectConfig, ColorPreset } from "@/config/projects/types"
import { DEFAULT_PROJECT } from "@/config/projects"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ArrowUpDown, MoreHorizontal, Edit, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

export const COLOR_PRESET_BG_CLASSES: Record<ColorPreset, string> = {
    blue: "bg-[#3072f1]",
    skyblue: "bg-[#0895d8]",
    green: "bg-[#45a976]",
    purple: "bg-[#9e44f1]",
    amber: "bg-[#e78b08]",
    rose: "bg-[#b95387]",
    indigo: "bg-[#5956eb]",
    emerald: "bg-[#10a697]",
    slate: "bg-[#56647a]",
    red: "bg-[#a32828]",
    orange: "bg-[#bf5800]",
    teal: "bg-[#45a976]",
    cyan: "bg-[#429ec1]",
    pink: "bg-[#b95387]",
    navy: "bg-[#001941]",
    charcoal: "bg-[#4b4b4b]",
    gray: "bg-[#4b4b4b]",
}

export type ProjectColumnActions = {
    onEdit: (project: ProjectConfig) => void
    onDelete: (project: ProjectConfig) => void
    canWrite?: boolean
    canControl?: boolean
}

export const getColumns = (
    {
        onEdit,
        onDelete,
        canWrite = true,
        canControl = true,
    }: ProjectColumnActions,
    t: (key: string) => string
): ColumnDef<ProjectConfig>[] => [
    {
        id: "code",
        accessorFn: (row) => row.code || row.id,
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="-ml-3 h-8 hover:bg-transparent cursor-pointer font-semibold text-muted-foreground"
                >
                    {t("table.code")}
                    <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
                </Button>
            )
        },
        cell: ({ row }) => {
            return (
                <div className="font-mono text-xs font-semibold text-foreground">
                    {row.original.code || row.original.id}
                </div>
            )
        },
    },
    {
        accessorKey: "name",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="-ml-3 h-8 hover:bg-transparent cursor-pointer font-semibold text-muted-foreground"
                >
                    {t("table.name")}
                    <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
                </Button>
            )
        },
        cell: ({ row }) => {
            const name = row.original.name?.trim()
            return (
                <div className="font-medium text-foreground">
                    {name || "-"}
                </div>
            )
        },
    },
    {
        accessorKey: "domain",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="-ml-3 h-8 hover:bg-transparent cursor-pointer font-semibold text-muted-foreground"
                >
                    {t("table.domain")}
                    <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
                </Button>
            )
        },
        cell: ({ row }) => {
            const domain = row.original.domain?.trim()
            return (
                <div className="text-muted-foreground font-mono text-xs">
                    {domain || "-"}
                </div>
            )
        },
    },
    {
        accessorKey: "color",
        size: 80,
        header: () => <div className="text-center">{t("table.color")}</div>,
        cell: ({ row }) => {
            const color = row.original.color || "skyblue"
            const bgClass = COLOR_PRESET_BG_CLASSES[color] || "bg-[#0895d8]"
            return (
                <div className="flex items-center justify-center">
                    <div
                        className={cn("h-4 w-4 rounded-full border border-border shadow-xs", bgClass)}
                    />
                </div>
            )
        },
    },
    {
        accessorKey: "enableLoginOtp",
        size: 130,
        header: () => <div className="text-center">{t("table.loginOtp")}</div>,
        cell: ({ row }) => {
            const isEnabled = Boolean(row.original.enableLoginOtp)
            return (
                <div className="flex justify-center">
                    <Badge
                        variant={isEnabled ? "default" : "secondary"}
                        className={cn(
                            "text-xs font-normal",
                            isEnabled && "bg-emerald-600 hover:bg-emerald-700 text-white border-transparent"
                        )}
                    >
                        {isEnabled ? t("table.enabled") : t("table.disabled")}
                    </Badge>
                </div>
            )
        },
    },
    {
        id: "actions",
        size: 70,
        header: () => <div className="text-center">{t("table.actions")}</div>,
        cell: ({ row }) => {
            const isDefault = row.original.id === DEFAULT_PROJECT || row.original.id === "project_a"

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
                                    if (canWrite) {
                                        onEdit(row.original)
                                    } else {
                                        toast.error(t("table.permissionDenied") || t("messages.permissionDenied"))
                                    }
                                }}
                                disabled={!canWrite}
                                className={cn(
                                    "cursor-pointer",
                                    !canWrite && "opacity-50 cursor-not-allowed"
                                )}
                            >
                                <Edit className="mr-2 h-4 w-4" />
                                {t("table.edit")}
                            </DropdownMenuItem>
                            {!isDefault && (
                                <DropdownMenuItem
                                    variant="destructive"
                                    onClick={() => {
                                        if (canControl) {
                                            onDelete(row.original)
                                        } else {
                                            toast.error(t("table.permissionDenied") || t("messages.permissionDenied"))
                                        }
                                    }}
                                    disabled={!canControl}
                                    className={cn(
                                        "cursor-pointer text-destructive focus:text-destructive",
                                        !canControl && "opacity-50 cursor-not-allowed"
                                    )}
                                >
                                    <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                                    {t("table.delete")}
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            )
        },
    },
]
