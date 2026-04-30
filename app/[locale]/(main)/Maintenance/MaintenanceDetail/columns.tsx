"use client"

import { ColumnDef } from "@tanstack/react-table"
import { MaintenanceDetailListRecord } from "@/app/actions/maintenance"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { ArrowUpDown, Info } from "lucide-react"
import { cn } from "@/lib/utils"

export const useMaintenanceDetailColumns = (onOpenDialog: (id: string) => void) => {
    const t = useTranslations("MaintenanceDetail.table")

    const columns: ColumnDef<MaintenanceDetailListRecord>[] = [
        {
            id: "index",
            header: () => {
                return (
                    <div className="ml-4">
                        {t("index")}
                    </div>
                )
            },
            cell: ({ row }) => <div className="ml-4">{row.index + 1}</div>,
        },
        {
            accessorKey: "list_name",
            header: () => {
                return (
                    <div>
                        {t("listName")}
                    </div>
                )
            },
            cell: ({ row }) => <div>{row.original.list_name}</div>,
        },
        {
            accessorKey: "name_operator",
            header: () => {
                return (
                    <div>
                        {t("operatorName")}
                    </div>
                )
            },
            cell: ({ row }) => <div>{row.original.name_operator}</div>,
        },
        {
            accessorKey: "repair_all",
            header: () => {
                return (
                    <div>
                        {t("repaired")}
                    </div>
                )
            },
            cell: ({ row }) => <div>{row.original.repair_all}</div>,
        },
        {
            accessorKey: "wait_repair",
            header: () => {
                return (
                    <div>
                        {t("waitingRepair")}
                    </div>
                )
            },
            cell: ({ row }) => <div>{row.original.wait_repair}</div>,
        },
        {
            accessorKey: "count_lamp_all",
            header: () => {
                return (
                    <div className="text-center">
                        {t("total")}
                    </div>
                )
            },
            cell: ({ row }) => <div>{row.original.count_lamp_all}</div>,
        },
        {
            id: "details",
            header: () => <div className="text-center">{t("details")}</div>,
            cell: ({ row }) => {
                return (
                    <div className="flex justify-center">
                        <Button
                            variant="default"
                            size="icon"
                            className="cursor-pointer h-8 w-8 bg-blue-500 hover:bg-blue-600 rounded-lg"
                            onClick={() => onOpenDialog(row.original.detail)}
                        >
                            <Info className="h-4 w-4 text-white" />
                        </Button>
                    </div>
                )
            },
        },
        {
            accessorKey: "confrime",
            header: () => <div className="text-center">{t("confirmStatus")}</div>,
            cell: ({ row }) => {
                const isConfirmed = row.original.confrime === "T" || row.original.confrime === "true"
                return (
                    <div className="flex justify-center">
                        <span className={cn(
                            "px-3 py-1 text-xs font-semibold rounded-full",
                            isConfirmed ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                        )}>
                            {isConfirmed ? t("confirmed") : t("pending")}
                        </span>
                    </div>
                )
            },
        },
    ]

    return columns
}
