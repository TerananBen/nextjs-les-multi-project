"use client"

import { ColumnDef } from "@tanstack/react-table"
import { PersonalItem } from "@/app/actions/personal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { IconDotsVertical, IconEdit, IconTrash } from "@tabler/icons-react"

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
            header: t('table.name'),
            cell: ({ row }) => {
                const firstName = row.original.first_name
                const lastName = row.original.last_name
                return (
                    <div className="font-medium">
                        {firstName} - {lastName}
                    </div>
                )
            },
        },
        {
            accessorKey: "personal_username",
            header: t('table.username'),
        },
        {
            accessorKey: "roleName",
            header: t('table.role'),
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
            id: "actions",
            header: t('table.actions'),
            cell: ({ row }) => {
                const personal = row.original

                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <IconDotsVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>{t('table.actions')}</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => onEdit(personal)}>
                                <IconEdit className="mr-2 h-4 w-4" />
                                {t('table.edit')}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => onDelete(personal)}
                                className="text-red-600 focus:text-red-600"
                            >
                                <IconTrash className="mr-2 h-4 w-4" />
                                {t('table.delete')}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )
            },
        },
    ]
