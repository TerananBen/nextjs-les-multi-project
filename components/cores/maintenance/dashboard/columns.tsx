"use client"

import { ColumnDef } from "@tanstack/react-table"
import { MaintenanceRecord } from "@/app/actions/maintenance"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useTranslations } from "next-intl"
import { ArrowUpDown, Eye } from "lucide-react"
import { cn } from "@/lib/utils"

export const useMaintenanceColumns = (onOpenDetail: (detailId: string) => void) => {
    const t = useTranslations("MaintenanceDashboard")

    const columns: ColumnDef<MaintenanceRecord>[] = [
        {
            id: "index",
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="-ml-3 h-8 text-sm font-semibold hover:bg-muted/50 cursor-pointer"
                >
                    {t("table.no")}
                    <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 text-muted-foreground" />
                </Button>
            ),
            cell: ({ row }) => <span className="tabular-nums font-mono text-sm text-muted-foreground">{row.index + 1}</span>,
        },
        {
            accessorKey: "list_name",
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="-ml-3 h-8 text-sm font-semibold hover:bg-muted/50 cursor-pointer"
                >
                    {t("table.listName")}
                    <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 text-muted-foreground" />
                </Button>
            ),
            cell: ({ row }) => <span className="text-sm font-medium text-foreground">{row.original.list_name || "-"}</span>,
        },
        {
            id: "name_operator",
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="-ml-3 h-8 text-sm font-semibold hover:bg-muted/50 cursor-pointer"
                >
                    {t("table.technician")}
                    <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 text-muted-foreground" />
                </Button>
            ),
            cell: ({ row }) => <span className="text-sm font-medium text-foreground">{row.original.name_operator || "-"}</span>,
        },
        {
            id: "name_admin",
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="-ml-3 h-8 text-sm font-semibold hover:bg-muted/50 cursor-pointer"
                >
                    {t("table.supervisor")}
                    <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 text-muted-foreground" />
                </Button>
            ),
            cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.name_admin || "-"}</span>,
        },
        {
            accessorKey: "repair_all",
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="mx-auto flex h-8 text-sm font-semibold hover:bg-muted/50 cursor-pointer"
                >
                    {t("table.repaired")}
                    <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 text-muted-foreground" />
                </Button>
            ),
            cell: ({ row }) => (
                <div className="text-center font-semibold tabular-nums text-sm text-emerald-600 dark:text-emerald-400">
                    {row.original.repair_all}
                </div>
            ),
        },
        {
            accessorKey: "wait_repair",
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="mx-auto flex h-8 text-sm font-semibold hover:bg-muted/50 cursor-pointer"
                >
                    {t("table.pending")}
                    <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 text-muted-foreground" />
                </Button>
            ),
            cell: ({ row }) => {
                const count = parseInt(row.original.wait_repair || "0", 10)
                return (
                    <div className={cn(
                        "text-center font-semibold tabular-nums text-sm",
                        count > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
                    )}>
                        {row.original.wait_repair}
                    </div>
                )
            },
        },
        {
            accessorKey: "count_lamp_all",
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="mx-auto flex h-8 text-sm font-semibold hover:bg-muted/50 cursor-pointer"
                >
                    {t("table.all")}
                    <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 text-muted-foreground" />
                </Button>
            ),
            cell: ({ row }) => <div className="text-center font-medium tabular-nums text-sm text-foreground">{row.original.count_lamp_all}</div>,
        },
        {
            id: "detail",
            header: () => <div className="text-center text-sm font-semibold">{t("table.detail")}</div>,
            cell: ({ row }) => {
                return (
                    <div className="flex justify-center">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0 cursor-pointer shadow-2xs hover:bg-primary/10 hover:text-primary transition-colors"
                            onClick={() => onOpenDetail(row.original.detail)}
                            title={t("table.detail")}
                        >
                            <Eye className="h-4 w-4" />
                        </Button>
                    </div>
                )
            },
        },
        {
            accessorKey: "confrime",
            header: () => <div className="text-center text-sm font-semibold">{t("table.status")}</div>,
            cell: ({ row }) => {
                const isConfirmed = row.original.confrime === "T"
                return (
                    <div className="flex justify-center">
                        <Badge
                            variant="outline"
                            className={cn(
                                "font-medium border text-xs py-0.5 px-2.5",
                                isConfirmed
                                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                    : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            )}
                        >
                            {isConfirmed ? t("status.confirmed") : t("status.pending")}
                        </Badge>
                    </div>
                )
            },
        },
    ]

    return columns
}
