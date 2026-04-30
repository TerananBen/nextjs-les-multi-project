"use client"

import { ColumnDef } from "@tanstack/react-table"
import { MaintenanceRecord } from "@/app/actions/maintenance"
import { Button } from "@/components/ui/button"
import { useTranslations } from "next-intl"
import { ArrowUpDown, Info } from "lucide-react"

export const useMaintenanceColumns = (onOpenDetail: (detailId: string) => void) => {
    const t = useTranslations("MaintenanceDashboard")

    const columns: ColumnDef<MaintenanceRecord>[] = [
        {
            id: "index",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="hover:bg-transparent cursor-pointer"
                    >
                        {t("table.no")}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => <div className="ml-4">{row.index + 1}</div>,
        },
        {
            id: "name_operator",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="hover:bg-transparent cursor-pointer"
                    >
                        {t("table.technician")}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => <div className="ml-3">{row.original.name_operator}</div>,
        },
        {
            id: "name_admin",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="hover:bg-transparent cursor-pointer"
                    >
                        {t("table.supervisor")}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => <div className="ml-3">{row.original.name_admin}</div>,
        },
        {
            accessorKey: "repair_all",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="hover:bg-transparent cursor-pointer"
                    >
                        {t("table.repaired")}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => <div>{row.original.repair_all}</div>,
        },
        {
            accessorKey: "wait_repair",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="hover:bg-transparent cursor-pointer"
                    >
                        {t("table.pending")}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => <div>{row.original.wait_repair}</div>,
        },
        {
            accessorKey: "count_lamp_all",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="hover:bg-transparent cursor-pointer"
                    >
                        {t("table.all")}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => <div>{row.original.count_lamp_all}</div>,
        },
        {
            id: "detail",
            header: t("table.detail"),
            cell: ({ row }) => {
                return (
                    <Button
                        size="sm"
                        className="cursor-pointer h-8 w-8 p-0 bg-blue-500 hover:bg-blue-600 text-white"
                        onClick={() => onOpenDetail(row.original.detail)}
                    >
                        <Info className="h-4 w-4" />
                    </Button>
                )
            },
        },
        {
            accessorKey: "confrime",
            header: t("table.status"),
            cell: ({ row }) => {
                const isConfirmed = row.original.confrime === "T"
                return (
                    <span className={`text-sm ${isConfirmed ? "text-green-500" : "text-red-500"}`}>
                        {isConfirmed ? t("status.confirmed") : t("status.pending")}
                    </span>
                )
            },
        },
    ]

    return columns
}
