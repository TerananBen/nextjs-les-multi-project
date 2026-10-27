"use client"

import { ColumnDef } from "@tanstack/react-table"
import { PersonalItem } from "@/app/actions/personal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ArrowUpDown, MoreHorizontal, Edit, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

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
    t: (key: string) => string,
    projectMap?: Map<string, string>
): ColumnDef<PersonalItem>[] => {
    const cols: ColumnDef<PersonalItem>[] = [
        {
            accessorFn: (row) => `${row.first_name} ${row.last_name}`,
            id: "fullName",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="-ml-3 h-8 hover:bg-transparent cursor-pointer font-semibold text-muted-foreground"
                    >
                        {t("table.fullname")}
                        <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const firstName = row.original.first_name?.trim() || ""
                const lastName = row.original.last_name?.trim() || ""
                return (
                    <div className="font-medium text-foreground">
                        {firstName} {lastName}
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
                        className="-ml-3 h-8 hover:bg-transparent cursor-pointer font-semibold text-muted-foreground"
                    >
                        {t("table.username")}
                        <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                return (
                    <div className="font-mono text-xs text-foreground">
                        {row.original.personal_username}
                    </div>
                )
            }
        },
    ]

    cols.push(
        {
            accessorKey: "roleName",
            header: ({ column }) => {
                return (
                    <div className="text-center">
                        <Button
                            variant="ghost"
                            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                            className="h-8 hover:bg-transparent cursor-pointer font-semibold text-muted-foreground"
                        >
                            {t("table.role")}
                            <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
                        </Button>
                    </div>
                )
            },
            cell: ({ row }) => {
                const roleName = row.original.roleName?.trim() || ""
                const isSuperAdminUser =
                    roleName.toLowerCase().includes("superadmin") ||
                    roleName.toLowerCase().includes("super_admin") ||
                    roleName.toLowerCase().includes("super-admin") ||
                    row.original.roles_id === "855125b5-a3ea-48aa-a9e7-7e5abbecfaca"

                if (isSuperAdminUser) {
                    return (
                        <div className="flex items-center justify-center">
                            <Badge className="bg-primary/90 text-primary-foreground font-semibold text-xs border-0">
                                SuperAdmin
                            </Badge>
                        </div>
                    )
                }

                const projectRoles = row.original.project_roles
                if (projectRoles && projectRoles.length > 0) {
                    if (projectRoles.length === 1) {
                        return (
                            <div className="flex items-center justify-center">
                                <Badge variant="outline">
                                    {projectRoles[0].role_name || row.original.roleName}
                                </Badge>
                            </div>
                        )
                    }

                    const MAX_VISIBLE = 2
                    const visibleRoles = projectRoles.slice(0, MAX_VISIBLE)
                    const remainingRoles = projectRoles.slice(MAX_VISIBLE)

                    return (
                        <div className="flex flex-wrap items-center justify-center gap-1.5">
                            {visibleRoles.map((pr) => (
                                <Badge key={pr.project_id} variant="outline" className="text-xs font-normal">
                                    <span className="font-medium text-muted-foreground mr-1">
                                        {pr.project_name || projectMap?.get(pr.project_id) || pr.project_id}:
                                    </span>
                                    <span className="font-semibold text-foreground">{pr.role_name}</span>
                                </Badge>
                            ))}

                            {remainingRoles.length > 0 && (
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Badge
                                            variant="secondary"
                                            className="text-xs font-medium cursor-pointer hover:bg-secondary/80 transition-colors"
                                        >
                                            +{remainingRoles.length} {t("table.more")}
                                        </Badge>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-72 p-3 text-xs" align="start">
                                        <div className="font-medium text-sm text-foreground mb-2 pb-1.5 border-b flex justify-between items-center">
                                            <span>{t("table.allRoles")}</span>
                                            <span className="text-xs font-normal text-muted-foreground">
                                                {projectRoles.length} {t("table.projectsCount")}
                                            </span>
                                        </div>
                                        <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                                            {projectRoles.map((pr) => (
                                                <div
                                                    key={pr.project_id}
                                                    className="flex items-center justify-between gap-2 p-1.5 rounded-md hover:bg-muted/50 transition-colors"
                                                >
                                                    <span className="truncate font-medium text-muted-foreground">
                                                        {pr.project_name || projectMap?.get(pr.project_id) || pr.project_id}
                                                    </span>
                                                    <Badge variant="outline" className="text-[11px] shrink-0 font-normal">
                                                        {pr.role_name}
                                                    </Badge>
                                                </div>
                                            ))}
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            )}
                        </div>
                    )
                }

                if (!roleName) {
                    return <span className="text-muted-foreground text-center">-</span>
                }
                return (
                    <div className="flex items-center justify-center">
                        <Badge variant="outline">{roleName}</Badge>
                    </div>
                )
            },
        },
        {
            accessorKey: "last_login",
            header: () => <div className="text-center">{t('table.lastLogin')}</div>,
            cell: ({ row }) => {
                const lastLogin = row.original.last_login?.trim()
                return (
                    <div className="font-mono text-xs text-muted-foreground text-center">
                        {lastLogin || "-"}
                    </div>
                )
            },
        },
        {
            accessorKey: "usable",
            size: 100,
            header: () => <div className="text-center">{t('table.status')}</div>,
            cell: ({ row }) => {
                const isUsable = row.original.usable === "Y"
                return (
                    <div className="flex justify-center">
                        <Badge
                            variant={isUsable ? "default" : "secondary"}
                            className={cn(
                                "text-xs font-normal cursor-pointer",
                                isUsable && "bg-emerald-600 hover:bg-emerald-700 text-white border-transparent"
                            )}
                            onClick={() => onToggleStatus(row.original)}
                        >
                            {isUsable ? t('table.active') : t('table.disabled')}
                        </Badge>
                    </div>
                )
            },
        },
        {
            id: "actions",
            size: 70,
            header: () => <div className="text-center">{t('table.actions')}</div>,
            cell: ({ row }) => {
                const roleName = (row.original.roleName || "").toLowerCase()
                const isSuperAdminUser =
                    roleName.includes("superadmin") ||
                    roleName.includes("super_admin") ||
                    roleName.includes("super-admin") ||
                    row.original.roles_id === "855125b5-a3ea-48aa-a9e7-7e5abbecfaca"

                return (
                    <div className="flex justify-center">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0 cursor-pointer">
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                    onClick={() => onEdit(row.original)}
                                    className="cursor-pointer"
                                >
                                    <Edit className="mr-2 h-4 w-4" />
                                    {t('table.edit')}
                                </DropdownMenuItem>
                                {!isSuperAdminUser && (
                                    <DropdownMenuItem
                                        variant="destructive"
                                        onClick={() => onDelete(row.original)}
                                        className="cursor-pointer text-destructive focus:text-destructive"
                                    >
                                        <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                                        {t('table.delete')}
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )
            },
        },
    )

    return cols
}
