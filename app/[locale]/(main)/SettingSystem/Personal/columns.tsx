"use client"

import { ColumnDef } from "@tanstack/react-table"
import { PersonalItem } from "@/app/actions/personal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { IconEdit, IconTrash } from "@tabler/icons-react"
import { ArrowUpDown } from "lucide-react"

export type PersonalColumnActions = {
    onEdit: (personal: PersonalItem) => void
    onDelete: (personal: PersonalItem) => void
    onToggleStatus: (personal: PersonalItem) => void
}

export const getColumns = (
    {
        onEdit,
        onDelete,
        onToggleStatus,
    }: PersonalColumnActions,
    t: (key: string) => string
): ColumnDef<PersonalItem>[] => [
        {
            accessorFn: (row) => `${row.first_name} ${row.last_name}`,
            id: "fullName",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="hover:bg-transparent cursor-pointer"
                    >
                        {t("table.name")}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const firstName = row.original.first_name
                const lastName = row.original.last_name
                return (
                    <div className="ml-4">
                        {firstName} - {lastName}
                    </div>
                )
            },
        },
        {
            id: "personal_username",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="hover:bg-transparent cursor-pointer"
                    >
                        {t("table.username")}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                return (
                    <div className="ml-4">
                        {row.original.personal_username}
                    </div>
                )
            }
        },
        {
            accessorKey: "roleName",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="hover:bg-transparent cursor-pointer"
                    >
                        {t("table.role")}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => <Badge variant="outline">{row.original.roleName}</Badge>,
        },
        {
            accessorKey: "last_login",
            header: t('table.lastLogin'),
        },
        {
            accessorKey: "usable",
            header: t('table.status'),
            cell: ({ row }) => {
                const isUsable = row.original.usable === "Y"
                return (
                    <Badge
                        variant={isUsable ? "default" : "destructive"}
                        className="cursor-pointer"
                        onClick={() => onToggleStatus(row.original)}
                    >
                        {isUsable ? t('table.active') : t('table.disabled')}
                    </Badge>
                )
            },
        },
        {
            id: "edit",
            header: t('table.edit'),
            cell: ({ row }) => {
                return (
                    <Button
                        variant="ghost"
                        className="cursor-pointer"
                        size="icon"
                        onClick={() => onEdit(row.original)}
                        title={t('table.edit')}
                    >
                        <IconEdit className="h-4 w-4" />
                    </Button>
                )
            },
        },
        {
            id: "delete",
            header: t('table.delete'),
            cell: ({ row }) => {
                return (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(row.original)}
                        className="cursor-pointer text-red-500 hover:text-red-600 hover:bg-red-50"
                        title={t('table.delete')}
                    >
                        <IconTrash className="h-4 w-4" />
                    </Button>
                )
            },
        },
    ]
