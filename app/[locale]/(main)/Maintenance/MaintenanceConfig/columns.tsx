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
            header: () => <div className="font-semibold text-foreground">{t("table.no")}</div>,
            cell: ({ row }) => <div className="font-medium text-foreground">{row.index + 1}</div>,
        },
        {
            accessorKey: "list_name",
            header: () => <div className="font-semibold text-foreground">{t("table.listName")}</div>,
            cell: ({ row }) => <div className="font-medium text-foreground">{row.getValue("list_name")}</div>,
        },
        {
            accessorKey: "name_operator",
            header: () => <div className="font-semibold text-foreground">{t("table.operatorName")}</div>,
            cell: ({ row }) => <div className="font-medium text-foreground">{row.getValue("name_operator")}</div>,
        },
        {
            accessorKey: "repair_all",
            header: () => <div className="font-semibold text-foreground">{t("table.repaired")}</div>,
            cell: ({ row }) => <div className="text-foreground">{row.getValue("repair_all")}</div>,
        },
        {
            accessorKey: "wait_repair",
            header: () => <div className="font-semibold text-foreground">{t("table.pending")}</div>,
            cell: ({ row }) => <div className="text-foreground">{row.getValue("wait_repair")}</div>,
        },
        {
            accessorKey: "count_lamp_all",
            header: () => <div className="font-semibold text-foreground">{t("table.all")}</div>,
            cell: ({ row }) => <div className="text-foreground">{row.getValue("count_lamp_all")}</div>,
        },
        {
            id: "detail",
            header: () => <div className="font-semibold text-foreground">{t("table.detail")}</div>,
            cell: ({ row }) => {
                return (
                    <Button
                        size="icon"
                        className="bg-blue-500 hover:bg-blue-600 text-white h-9 w-9 shadow-sm"
                        onClick={() => onDetail(row.original)}
                    >
                        <Info className="h-4 w-4" />
                    </Button>
                )
            },
            enableSorting: false,
        },
        {
            id: "status",
            header: () => <div className="font-semibold text-foreground">{t("table.status")}</div>,
            cell: ({ row }) => {
                const isConfirmed = row.original.confrime === "T" || row.original.confrime === "1" || row.original.confrime?.toLowerCase() === "true"
                return (
                    <Button
                        size="sm"
                        className={`gap-2 px-4 shadow-sm text-white ${
                            isConfirmed 
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
            header: () => <div className="font-semibold text-foreground">{t("table.delete")}</div>,
            cell: ({ row }) => {
                return (
                    <Button
                        size="icon"
                        className="bg-pink-500 hover:bg-pink-600 text-white h-9 w-9 shadow-sm"
                        onClick={() => onDelete(row.original)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                )
            },
            enableSorting: false,
        },
    ]

    return columns
}
