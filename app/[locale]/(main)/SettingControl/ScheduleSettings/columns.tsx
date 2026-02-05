"use client"

import { ColumnDef } from "@tanstack/react-table"
import { ScheduleItem } from "@/types/schedule-settings"
import { Button } from "@/components/ui/button"
import { ArrowUpDown, Pencil, Trash2, Info } from "lucide-react"
import { useTranslations } from "next-intl"

interface UseScheduleColumnsProps {
    onEdit: (item: ScheduleItem) => void
    onDelete: (item: ScheduleItem) => void
}

export const useScheduleColumns = ({ onEdit, onDelete }: UseScheduleColumnsProps) => {
    const t = useTranslations("ScheduleSettings")

    const columns: ColumnDef<ScheduleItem>[] = [
        {
            accessorKey: "scheduleName",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="-ml-4 hover:bg-transparent"
                    >
                        <span className="font-semibold text-foreground">{t("table.scheduleName")}</span>
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => <div className="font-medium text-foreground">{row.getValue("scheduleName")}</div>,
        },
        {
            accessorKey: "typeSchedule",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="-ml-4 hover:bg-transparent"
                    >
                        <span className="font-semibold text-foreground">{t("table.typeSchedule")}</span>
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const type = row.getValue("typeSchedule") as string
                const label = t(`types.${type}`) || type
                return <div className="text-muted-foreground">{label}</div>
            },
        },
        {
            id: "edit",
            header: ({ column }) => (
                <div className="font-semibold text-foreground">{t("table.edit")}</div>
            ),
            cell: ({ row }) => {
                return (
                    <Button
                        size="sm"
                        className="bg-blue-500 hover:bg-blue-600 text-white gap-2 px-4 shadow-sm"
                        onClick={() => onEdit(row.original)}
                    >
                        <Pencil className="h-4 w-4" />
                        {t("table.edit")}
                    </Button>
                )
            },
            enableSorting: false,
        },
        {
            id: "feedback",
            header: ({ column }) => (
                <div className="font-semibold text-foreground">{t("table.feedback")}</div>
            ),
            cell: ({ row }) => {
                return (
                    <Button
                        size="sm"
                        className="bg-blue-500 hover:bg-blue-600 text-white gap-2 px-4 shadow-sm"
                    >
                        <Info className="h-4 w-4" />
                        {t("table.feedback")}
                    </Button>
                )
            },
            enableSorting: false,
        },
        {
            id: "delete",
            header: ({ column }) => (
                <div className="font-semibold text-foreground">{t("table.delete")}</div>
            ),
            cell: ({ row }) => {
                return (
                    <Button
                        size="icon"
                        variant="destructive"
                        className="h-9 w-9 shadow-sm"
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
