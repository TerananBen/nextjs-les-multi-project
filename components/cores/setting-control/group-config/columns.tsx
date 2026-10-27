"use client"

import * as React from "react"
import { ColumnDef } from "@tanstack/react-table"
import { GroupConfigData } from "@/types/group-config"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useTranslations } from "next-intl"
import {
    ArrowUpDown,
    Settings2,
    Edit,
    Plus,
    Trash2,
    MoreHorizontal,
    Loader2
} from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { deleteGroupConfigAction } from "@/app/actions/group-config"
import { toast } from "sonner"
import { usePermission } from "@/components/providers/permission-provider"
import { cn } from "@/lib/utils"

import { ControlGroupDialog } from "./control-group-dialog"
import { AddDeviceDialog } from "./add-device-dialog"
import { AddDeviceCsvDialog } from "./add-device-csv-dialog"
import { EditDeviceCsvDialog } from "./edit-device-csv-dialog"

export const useGroupConfigColumns = (onDataChange?: () => void) => {
    const t = useTranslations("GroupConfig.table")

    const columns: ColumnDef<GroupConfigData>[] = [
        {
            accessorKey: "group_name",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="-ml-3 h-8 text-sm font-semibold hover:bg-muted/50 cursor-pointer"
                    >
                        {t("groupName")}
                        <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const subDistrict = row.original.sub_district
                return (
                    <div className="flex flex-col min-w-0 text-left py-0.5">
                        <span className="font-medium text-foreground truncate">
                            {row.getValue("group_name")}
                        </span>
                        {subDistrict && subDistrict !== "-" && (
                            <span className="text-xs text-muted-foreground truncate">
                                {subDistrict}
                            </span>
                        )}
                    </div>
                )
            },
        },
        {
            accessorKey: "total_rtu",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="mx-auto flex h-8 text-sm font-semibold hover:bg-muted/50 cursor-pointer"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        {t("deviceCount")}
                        <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const count = parseInt(row.original.total_rtu, 10) || 0
                return (
                    <div className="flex justify-center">
                        <Badge
                            variant={count > 0 ? "secondary" : "outline"}
                            className={cn(
                                "font-mono text-xs px-2.5 py-0.5 rounded-full font-medium transition-colors",
                                count > 0
                                    ? "bg-primary/10 text-primary border-primary/20"
                                    : "text-muted-foreground/60 border-dashed"
                            )}
                        >
                            {count} {t("devicesUnit")}
                        </Badge>
                    </div>
                )
            },
        },
        {
            id: "control",
            header: () => <div className="text-center text-sm font-semibold">{t("control")}</div>,
            cell: ({ row }) => <ControlGroupCell row={row.original} />,
        },
        {
            id: "manageDevices",
            header: () => <div className="text-center text-sm font-semibold">{t("manageDevices")}</div>,
            cell: ({ row }) => <ManageDevicesCell row={row.original} onSuccess={onDataChange} />,
        },
        {
            id: "actions",
            header: () => <div className="text-center text-sm font-semibold">{t("moreActions")}</div>,
            cell: ({ row }) => <RowActionsCell row={row.original} onSuccess={onDataChange} />,
        },
    ]

    return columns
}

function ControlGroupCell({ row }: { row: GroupConfigData }) {
    const t = useTranslations("GroupConfig.table")
    const { getPermission } = usePermission()
    const { control: canControl } = getPermission("V_GroupConfig")
    const [open, setOpen] = React.useState(false)

    return (
        <div className="flex justify-center">
            <Button
                variant="outline"
                size="sm"
                className={cn(
                    "cursor-pointer h-8 px-3 gap-1.5 shadow-2xs hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors",
                    !canControl && "opacity-50 cursor-not-allowed"
                )}
                onClick={() => {
                    if (canControl) setOpen(true)
                    else toast.error(t("permissionDenied"))
                }}
                disabled={!canControl}
            >
                <Settings2 className="h-3.5 w-3.5 text-current" />
                <span className="text-xs font-medium">{t("control")}</span>
            </Button>
            <ControlGroupDialog open={open} onOpenChange={setOpen} group={row} />
        </div>
    )
}

function ManageDevicesCell({ row, onSuccess }: { row: GroupConfigData; onSuccess?: () => void }) {
    const t = useTranslations("GroupConfig.table")
    const { getPermission } = usePermission()
    const { writable: canManage } = getPermission("V_GroupConfig")
    const [open, setOpen] = React.useState(false)

    return (
        <div className="flex justify-center">
            <Button
                variant="outline"
                size="sm"
                className={cn(
                    "cursor-pointer h-8 px-3 gap-1.5 shadow-2xs hover:bg-muted transition-colors",
                    canManage ? "text-foreground" : "opacity-50 cursor-not-allowed"
                )}
                onClick={() => {
                    if (canManage) setOpen(true)
                    else toast.error(t("permissionDenied"))
                }}
                disabled={!canManage}
            >
                <Edit className="h-3.5 w-3.5 text-current" />
                <span className="text-xs font-medium">{t("manageDevices")}</span>
            </Button>
            <AddDeviceDialog
                open={open}
                onOpenChange={(nextOpen) => {
                    setOpen(nextOpen)
                    if (!nextOpen && onSuccess) {
                        onSuccess()
                    }
                }}
                group={row}
            />
        </div>
    )
}

function RowActionsCell({ row, onSuccess }: { row: GroupConfigData; onSuccess?: () => void }) {
    const t = useTranslations("GroupConfig.table")
    const tDelete = useTranslations("GroupConfig.deleteDialog")
    const { getPermission } = usePermission()
    const { writable: canManage } = getPermission("V_GroupConfig")

    const [isAddCsvOpen, setIsAddCsvOpen] = React.useState(false)
    const [isEditCsvOpen, setIsEditCsvOpen] = React.useState(false)
    const [isDeleteOpen, setIsDeleteOpen] = React.useState(false)
    const [isDeleting, setIsDeleting] = React.useState(false)

    const handleDelete = async () => {
        setIsDeleting(true)
        try {
            const result = await deleteGroupConfigAction(row.group_code, row.group_name)
            if (result.result) {
                toast.success(tDelete("success"))
                setIsDeleteOpen(false)
                onSuccess?.()
            } else {
                toast.error(tDelete("error"))
            }
        } catch (error) {
            console.error("Delete error:", error)
            toast.error(tDelete("error"))
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <div className="flex justify-center">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 cursor-pointer text-muted-foreground hover:text-foreground hover:bg-muted"
                    >
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">{t("moreActions")}</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem
                        onClick={() => {
                            if (canManage) setIsAddCsvOpen(true)
                            else toast.error(t("permissionDenied"))
                        }}
                        disabled={!canManage}
                        className="cursor-pointer gap-2.5 py-2 px-2.5 text-sm"
                    >
                        <Plus className="h-4 w-4 text-current" />
                        <span>{t("addDeviceCsv")}</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                        onClick={() => {
                            if (canManage) setIsEditCsvOpen(true)
                            else toast.error(t("permissionDenied"))
                        }}
                        disabled={!canManage}
                        className="cursor-pointer gap-2.5 py-2 px-2.5 text-sm"
                    >
                        <Edit className="h-4 w-4 text-current" />
                        <span>{t("editDeviceCsv")}</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                        onClick={() => {
                            if (canManage) setIsDeleteOpen(true)
                            else toast.error(t("permissionDenied"))
                        }}
                        disabled={!canManage}
                        className="cursor-pointer gap-2.5 py-2 px-2.5 text-sm text-destructive focus:text-destructive focus:bg-destructive/10"
                    >
                        <Trash2 className="h-4 w-4 text-destructive" />
                        <span>{t("delete")}</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Sub-Dialogs rendered within action cell */}
            <AddDeviceCsvDialog open={isAddCsvOpen} onOpenChange={setIsAddCsvOpen} group={row} />
            <EditDeviceCsvDialog open={isEditCsvOpen} onOpenChange={setIsEditCsvOpen} group={row} />

            <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{tDelete("title")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {tDelete("description", { name: row.group_name })}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="cursor-pointer" disabled={isDeleting}>
                            {tDelete("cancel")}
                        </AlertDialogCancel>
                        <Button
                            variant="destructive"
                            className="cursor-pointer"
                            onClick={(e) => {
                                e.preventDefault()
                                handleDelete()
                            }}
                            disabled={isDeleting}
                        >
                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isDeleting ? tDelete("deleting") : tDelete("confirm")}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
