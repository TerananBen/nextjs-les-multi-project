"use client"

import { ColumnDef } from "@tanstack/react-table"
import { MaintenanceConfigRecord } from "@/app/actions/maintenance"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Eye, Trash2, CheckCircle2, Clock, ArrowUpDown } from "lucide-react"
import { useTranslations } from "next-intl"

interface UseMaintenanceColumnsProps {
    onDetail: (item: MaintenanceConfigRecord) => void
    onStatusChange: (item: MaintenanceConfigRecord) => void
    onDelete: (item: MaintenanceConfigRecord) => void
}

export const useMaintenanceColumns = ({ onDetail, onStatusChange, onDelete }: UseMaintenanceColumnsProps) => {
    const t = useTranslations("MaintenanceConfig")

    const columns: ColumnDef<MaintenanceConfigRecord>[] = [
        {
            id: "index",
            header: () => <div className="text-center w-12 font-semibold text-muted-foreground">{t("table.no")}</div>,
            cell: ({ row }) => <div className="text-center font-medium text-muted-foreground">{row.index + 1}</div>,
        },
        {
            accessorKey: "list_name",
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="-ml-3 h-8 text-sm font-semibold hover:bg-muted/50"
                >
                    {t("table.listName")}
                    <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                </Button>
            ),
            cell: ({ row }) => <div className="font-medium text-foreground">{row.original.list_name}</div>,
        },
        {
            accessorKey: "name_operator",
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="-ml-3 h-8 text-sm font-semibold hover:bg-muted/50"
                >
                    {t("table.operatorName")}
                    <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                </Button>
            ),
            cell: ({ row }) => <div className="text-muted-foreground">{row.original.name_operator || "-"}</div>,
        },
        {
            accessorKey: "repair_all",
            header: ({ column }) => (
                <div className="flex justify-center">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="h-8 text-sm font-semibold hover:bg-muted/50"
                    >
                        {t("table.repaired")}
                        <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                    </Button>
                </div>
            ),
            cell: ({ row }) => (
                <div className="text-center font-semibold text-emerald-600 dark:text-emerald-400">
                    {row.getValue("repair_all")}
                </div>
            ),
        },
        {
            accessorKey: "wait_repair",
            header: ({ column }) => (
                <div className="flex justify-center">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="h-8 text-sm font-semibold hover:bg-muted/50"
                    >
                        {t("table.pending")}
                        <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                    </Button>
                </div>
            ),
            cell: ({ row }) => (
                <div className="text-center font-semibold text-amber-600 dark:text-amber-400">
                    {row.getValue("wait_repair")}
                </div>
            ),
        },
        {
            accessorKey: "count_lamp_all",
            header: ({ column }) => (
                <div className="flex justify-center">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="h-8 text-sm font-semibold hover:bg-muted/50"
                    >
                        {t("table.all")}
                        <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                    </Button>
                </div>
            ),
            cell: ({ row }) => (
                <div className="text-center font-semibold text-foreground">
                    {row.getValue("count_lamp_all")}
                </div>
            ),
        },
        {
            id: "detail",
            header: () => <div className="text-center font-semibold text-muted-foreground">{t("table.detail")}</div>,
            cell: ({ row }) => {
                return (
                    <div className="flex justify-center">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0 cursor-pointer hover:bg-muted/80 shadow-2xs"
                            onClick={() => onDetail(row.original)}
                            title={t("table.detail")}
                        >
                            <Eye className="h-4 w-4" />
                        </Button>
                    </div>
                )
            },
            enableSorting: false,
        },
        {
            id: "status",
            header: () => <div className="text-center font-semibold text-muted-foreground">{t("table.status")}</div>,
            cell: ({ row }) => {
                const isConfirmed = row.original.confrime === "T" || row.original.confrime === "1" || row.original.confrime?.toLowerCase() === "true"
                return (
                    <div className="flex justify-center">
                        <Badge
                            variant="outline"
                            className={`cursor-pointer gap-1.5 py-1 px-3 font-medium transition-colors ${
                                isConfirmed
                                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                                    : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"
                            }`}
                            onClick={() => onStatusChange(row.original)}
                            title={t("table.status")}
                        >
                            {isConfirmed ? (
                                <>
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    {t("status.confirmed")}
                                </>
                            ) : (
                                <>
                                    <Clock className="h-3.5 w-3.5" />
                                    {t("status.pending")}
                                </>
                            )}
                        </Badge>
                    </div>
                )
            },
            enableSorting: false,
        },
        {
            id: "delete",
            header: () => <div className="text-center font-semibold text-muted-foreground">{t("table.delete")}</div>,
            cell: ({ row }) => {
                return (
                    <div className="flex justify-center">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0 cursor-pointer text-muted-foreground hover:text-destructive hover:border-destructive/40 hover:bg-destructive/10 shadow-2xs transition-colors"
                            onClick={() => onDelete(row.original)}
                            title={t("table.delete")}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                )
            },
            enableSorting: false,
        },
    ]

    return columns
}
