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
            header: "#",
            cell: ({ row }) => <div className="text-center text-sm">{row.index + 1}</div>,
        },
        {
            accessorKey: "list_name",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        {t("listName")}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => <div className="text-sm font-medium px-4">{row.original.list_name}</div>,
        },
        {
            accessorKey: "name_operator",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        {t("operatorName")}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => <div className="text-sm px-4">{row.original.name_operator}</div>,
        },
        {
            accessorKey: "repair_all",
            header: ({ column }) => {
                return (
                    <div className="text-center">
                        <Button
                            variant="ghost"
                            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        >
                            {t("repaired")}
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                )
            },
            cell: ({ row }) => <div className="text-center text-sm">{row.original.repair_all}</div>,
        },
        {
            accessorKey: "wait_repair",
            header: ({ column }) => {
                return (
                    <div className="text-center">
                        <Button
                            variant="ghost"
                            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        >
                            {t("waitingRepair")}
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                )
            },
            cell: ({ row }) => <div className="text-center text-sm text-red-500 font-medium">{row.original.wait_repair}</div>,
        },
        {
            accessorKey: "count_lamp_all",
            header: ({ column }) => {
                return (
                    <div className="text-center">
                        <Button
                            variant="ghost"
                            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        >
                            {t("total")}
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                )
            },
            cell: ({ row }) => <div className="text-center text-sm">{row.original.count_lamp_all}</div>,
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
