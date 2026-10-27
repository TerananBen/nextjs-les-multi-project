"use client"

import { ColumnDef } from "@tanstack/react-table"
import { MaintenanceConfigRecord } from "@/app/actions/maintenance"
import { Button } from "@/components/ui/button"
import { Info, Trash2, Check, X } from "lucide-react"
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
            header: () => <div className="ml-4">{t("table.no")}</div>,
            cell: ({ row }) => <div className="ml-4">{row.index + 1}</div>,
        },
        {
            id: "list_name",
            header: () => <div>{t("table.listName")}</div>,
            cell: ({ row }) => <div>{row.original.list_name}</div>,
        },
        {
            accessorKey: "name_operator",
            header: () => <div>{t("table.operatorName")}</div>,
            cell: ({ row }) => <div>{row.original.name_operator}</div>,
        },
        {
            accessorKey: "repair_all",
            header: () => <div>{t("table.repaired")}</div>,
            cell: ({ row }) => <div>{row.getValue("repair_all")}</div>,
        },
        {
            accessorKey: "wait_repair",
            header: () => <div>{t("table.pending")}</div>,
            cell: ({ row }) => <div>{row.getValue("wait_repair")}</div>,
        },
        {
            accessorKey: "count_lamp_all",
            header: () => <div>{t("table.all")}</div>,
            cell: ({ row }) => <div>{row.getValue("count_lamp_all")}</div>,
        },
        {
            id: "detail",
            header: () => <div>{t("table.detail")}</div>,
            cell: ({ row }) => {
                return (
                    <Button
                        variant="default"
                        size="icon"
                        className="cursor-pointer h-8 w-8 bg-blue-500 hover:bg-blue-600 rounded-lg"
                        onClick={() => onDetail(row.original)}
                    >
                        <Info className="h-4 w-4 text-white" />
                    </Button>
                )
            },
            enableSorting: false,
        },
        {
            id: "status",
            header: () => <div>{t("table.status")}</div>,
            cell: ({ row }) => {
                const isConfirmed = row.original.confrime === "T" || row.original.confrime === "1" || row.original.confrime?.toLowerCase() === "true"
                return (
                    <Button
                        variant="default"
                        size="sm"
                        className={`cursor-pointer gap-2 px-4 shadow-sm text-white ${isConfirmed
                            ? "bg-green-500 hover:bg-green-600"
                            : "bg-pink-500 hover:bg-pink-600"
                            }`}
                        onClick={() => onStatusChange(row.original)}
                    >
                        {isConfirmed ? (
                            <>
                                <Check className="h-4 w-4" />
                                {t("status.confirmed")}
                            </>
                        ) : (
                            <>
                                <X className="h-4 w-4" />
                                {t("status.pending")}
                            </>
                        )}
                    </Button>
                )
            },
            enableSorting: false,
        },
        {
            id: "delete",
            header: () => <div>{t("table.delete")}</div>,
            cell: ({ row }) => {
                return (
                    <Button
                        variant="default"
                        size="icon"
                        className="cursor-pointer bg-pink-500 hover:bg-pink-600 text-white h-8 w-8 shadow-sm"
                        onClick={() => onDelete(row.original)}
                    >
                        <Trash2 className="h-4 w-4 text-white" />
                    </Button>
                )
            },
            enableSorting: false,
        },
    ]

    return columns
}
