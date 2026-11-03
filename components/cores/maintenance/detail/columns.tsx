"use client"

import { ColumnDef } from "@tanstack/react-table"
import { MaintenanceDetailListRecord } from "@/app/actions/maintenance"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Eye, ArrowUpDown, CheckCircle2, Clock } from "lucide-react"

export const useMaintenanceDetailColumns = (onOpenDialog: (id: string) => void) => {
    const t = useTranslations("MaintenanceDetail.table")

    const columns: ColumnDef<MaintenanceDetailListRecord>[] = [
        {
            id: "index",
            header: () => <div className="text-center w-12 font-semibold text-muted-foreground">{t("index")}</div>,
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
                    {t("listName")}
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
                    {t("operatorName")}
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
                        {t("repaired")}
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
                        {t("waitingRepair")}
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
                        {t("total")}
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
            id: "details",
            header: () => <div className="text-center font-semibold text-muted-foreground">{t("details")}</div>,
            cell: ({ row }) => {
                return (
                    <div className="flex justify-center">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0 cursor-pointer hover:bg-muted/80 shadow-2xs"
                            onClick={() => onOpenDialog(row.original.detail)}
                            title={t("details")}
                            aria-label={t("details")}
                        >
                            <Eye className="h-4 w-4" />
                        </Button>
                    </div>
                )
            },
            enableSorting: false,
        },
        {
            accessorKey: "confrime",
            header: () => <div className="text-center font-semibold text-muted-foreground">{t("confirmStatus")}</div>,
            cell: ({ row }) => {
                const isConfirmed = row.original.confrime === "T" || row.original.confrime === "1" || row.original.confrime?.toLowerCase() === "true"
                return (
                    <div className="flex justify-center">
                        <Badge
                            variant="outline"
                            className={`gap-1.5 py-1 px-3 font-medium transition-colors ${
                                isConfirmed
                                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                    : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            }`}
                        >
                            {isConfirmed ? (
                                <>
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    {t("confirmed")}
                                </>
                            ) : (
                                <>
                                    <Clock className="h-3.5 w-3.5" />
                                    {t("pending")}
                                </>
                            )}
                        </Badge>
                    </div>
                )
            },
            enableSorting: false,
        },
    ]

    return columns
}
