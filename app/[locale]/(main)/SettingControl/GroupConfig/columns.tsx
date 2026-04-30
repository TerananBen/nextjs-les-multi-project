"use client"

import { ColumnDef } from "@tanstack/react-table"
import { GroupConfigData } from "@/types/group-config"
import { Button } from "@/components/ui/button"
import { useTranslations } from "next-intl"
import {
    ArrowUpDown,
    Settings2,
    Trash2,
    SquarePen,
    FileSpreadsheet,
    PenSquare
} from "lucide-react"

export const useGroupConfigColumns = (onDeleteSuccess?: () => void) => {
    const t = useTranslations("GroupConfig.table")

    const columns: ColumnDef<GroupConfigData>[] = [
        {
            accessorKey: "group_name",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="hover:bg-transparent cursor-pointer"
                    >
                        {t("groupName")}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => <div className="ml-4">{row.getValue("group_name")}</div>,
        },
        {
            id: "control",
            header: t("control"),
            cell: ({ row }) => <ControlGroupCell row={row.original} />,
        },
        {
            id: "addDevice",
            header: t("addDevice"),
            cell: ({ row }) => <AddDeviceCell row={row.original} />,
        },
        {
            id: "addDeviceCsv",
            header: t("addDeviceCsv"),
            cell: ({ row }) => <AddDeviceCsvCell row={row.original} />,
        },
        {
            id: "editDeviceCsv",
            header: t("editDeviceCsv"),
            cell: ({ row }) => <EditDeviceCsvCell row={row.original} />,
        },
        {
            id: "delete",
            header: t("delete"),
            cell: ({ row }) => <DeleteCell row={row.original} onSuccess={onDeleteSuccess} />,
        },
    ]

    return columns
}

import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { deleteGroupConfigAction } from "@/app/actions/group-config"
import { toast } from "sonner"
import { useState } from "react"
import { Loader2 } from "lucide-react"

import { usePermission } from "@/components/providers/permission-provider"
import { cn } from "@/lib/utils"

interface DeleteCellProps {
    row: GroupConfigData
    onSuccess?: () => void
}

function DeleteCell({ row, onSuccess }: DeleteCellProps) {
    const t = useTranslations("GroupConfig.deleteDialog")
    const { getPermission } = usePermission()
    const { writable: canDelete } = getPermission("V_GroupConfig")

    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    const handleDelete = async () => {
        setLoading(true)
        try {
            const result = await deleteGroupConfigAction(row.group_code, row.group_name)
            if (result.result) {
                toast.success(t("success"))
                setOpen(false)
                onSuccess?.()
            } else {
                toast.error(t("error"))
            }
        } catch (error) {
            console.error("Delete error:", error)
            toast.error(t("error"))
        } finally {
            setLoading(false)
        }
    }

    return (
        <AlertDialog open={open} onOpenChange={(val) => {
            if (canDelete) setOpen(val)
        }}>
            <AlertDialogTrigger asChild>
                <div
                    className={cn(
                        "inline-flex",
                        !canDelete && "cursor-not-allowed"
                    )}
                    onClick={(e) => {
                        if (!canDelete) {
                            e.preventDefault()
                            e.stopPropagation()
                            toast.error(t("permissionDenied"))
                        }
                    }}
                >
                    <Button
                        variant="outline"
                        size="icon"
                        className={cn(
                            "cursor-pointer h-8 w-8",
                            canDelete
                                ? "text-red-500 hover:text-red-600 hover:bg-red-50"
                                : "text-gray-400 cursor-not-allowed hover:bg-transparent"
                        )}
                        disabled={!canDelete}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t("title")}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {t("description", { name: row.group_name })}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel className="cursor-pointer" disabled={loading}>{t("cancel")}</AlertDialogCancel>
                    <Button
                        variant="destructive"
                        className="cursor-pointer"
                        onClick={(e) => {
                            e.preventDefault()
                            handleDelete()
                        }}
                        disabled={loading}
                    >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {loading ? t("deleting") : t("confirm")}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )

}

import { ControlGroupDialog } from "./control-group-dialog"

function ControlGroupCell({ row }: { row: GroupConfigData }) {
    const t = useTranslations("GroupConfig.table")
    const { getPermission } = usePermission()
    const { control: canControl } = getPermission("V_GroupConfig")
    const [open, setOpen] = useState(false)

    return (
        <>
            <Button
                variant="outline"
                size="sm"
                className={cn(
                    "cursor-pointer h-8",
                    canControl ? "" : "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200"
                )}
                onClick={() => {
                    if (canControl) setOpen(true)
                    else toast.error(t("permissionDenied"))
                }}
                disabled={!canControl}
            >
                <Settings2 className="mr-2 h-4 w-4" />
                {t("control")}
            </Button>
            <ControlGroupDialog open={open} onOpenChange={setOpen} group={row} />
        </>
    )
}


import { AddDeviceDialog } from "./add-device-dialog"
import { AddDeviceCsvDialog } from "./add-device-csv-dialog"

function AddDeviceCell({ row }: { row: GroupConfigData }) {
    const t = useTranslations("GroupConfig.table")
    const { getPermission } = usePermission()
    // Managing devices is configuration -> Writable
    const { writable: canManage } = getPermission("V_GroupConfig")
    const [open, setOpen] = useState(false)

    return (
        <>
            <Button
                variant="outline"
                size="sm"
                className={cn(
                    "cursor-pointer h-8",
                    canManage
                        ? "text-blue-600 border-blue-200 hover:bg-blue-50"
                        : "text-gray-400 border-gray-200 bg-gray-100 cursor-not-allowed"
                )}
                onClick={() => {
                    if (canManage) setOpen(true)
                    else toast.error(t("permissionDenied"))
                }}
                disabled={!canManage}
            >
                <SquarePen className="mr-2 h-4 w-4" />
                {t("addDevice")}
            </Button>
            <AddDeviceDialog open={open} onOpenChange={setOpen} group={row} />
        </>
    )
}

function AddDeviceCsvCell({ row }: { row: GroupConfigData }) {
    const t = useTranslations("GroupConfig.table")
    const { getPermission } = usePermission()
    const { writable: canManage } = getPermission("V_GroupConfig")
    const [open, setOpen] = useState(false)

    return (
        <>
            <Button
                variant="outline"
                size="sm"
                className={cn(
                    "cursor-pointer h-8",
                    canManage
                        ? "text-green-600 border-green-200 hover:bg-green-50"
                        : "text-gray-400 border-gray-200 bg-gray-100 cursor-not-allowed"
                )}
                onClick={() => {
                    if (canManage) setOpen(true)
                    else toast.error(t("permissionDenied"))
                }}
                disabled={!canManage}
            >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                {t("addDeviceCsv")}
            </Button>
            <AddDeviceCsvDialog open={open} onOpenChange={setOpen} group={row} />
        </>
    )
}

import { EditDeviceCsvDialog } from "./edit-device-csv-dialog"

function EditDeviceCsvCell({ row }: { row: GroupConfigData }) {
    const t = useTranslations("GroupConfig.table")
    const { getPermission } = usePermission()
    const { writable: canManage } = getPermission("V_GroupConfig")
    const [open, setOpen] = useState(false)

    return (
        <div className="flex justify-center">
            <Button
                variant="outline"
                size="sm"
                onClick={() => {
                    if (canManage) setOpen(true)
                    else toast.error(t("permissionDenied"))
                }}
                className={cn(
                    "cursor-pointer h-8",
                    canManage
                        ? "text-orange-500 hover:text-orange-600 hover:bg-orange-100"
                        : "text-gray-400 bg-transparent cursor-not-allowed hover:bg-transparent"
                )}
                disabled={!canManage}
                title={t("editDeviceCsv")}
            >
                <PenSquare className="mr-2 h-4 w-4" />
                {t("editDeviceCsv")}
            </Button>
            <EditDeviceCsvDialog open={open} onOpenChange={setOpen} group={row} />
        </div>
    )
}
