"use client"

import { ColumnDef } from "@tanstack/react-table"
import { GroupConfigData } from "@/types/group-config"
import { Button } from "@/components/ui/button"
import { useTranslations } from "next-intl"
import {
    ArrowUpDown,
    Settings2,
    Plus,
    Trash2,
    SquarePen
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
                    >
                        {t("groupName")}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => <div className="ml-4 font-medium">{row.getValue("group_name")}</div>,
        },
        {
            id: "control",
            header: t("control"),
            cell: ({ row }) => (
                <Button variant="outline" size="sm" className="h-8">
                    <Settings2 className="mr-2 h-4 w-4" />
                    {t("control")}
                </Button>
            ),
        },
        {
            id: "addDevice",
            header: t("addDevice"),
            cell: ({ row }) => <AddDeviceCell row={row.original} />,
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
    AlertDialogAction,
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

interface DeleteCellProps {
    row: GroupConfigData
    onSuccess?: () => void
}

function DeleteCell({ row, onSuccess }: DeleteCellProps) {
    const t = useTranslations("GroupConfig.deleteDialog")
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
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50">
                    <Trash2 className="h-4 w-4" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t("title")}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {t("description", { name: row.group_name })}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={loading}>{t("cancel")}</AlertDialogCancel>
                    <Button
                        variant="destructive"
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

import { AddDeviceDialog } from "./add-device-dialog"

function AddDeviceCell({ row }: { row: GroupConfigData }) {
    const t = useTranslations("GroupConfig.table")
    const [open, setOpen] = useState(false)

    return (
        <>
            <Button
                variant="outline"
                size="sm"
                className="h-8 text-blue-600 border-blue-200 hover:bg-blue-50"
                onClick={() => setOpen(true)}
            >
                <SquarePen className="mr-2 h-4 w-4" />
                {t("addDevice")}
            </Button>
            <AddDeviceDialog open={open} onOpenChange={setOpen} group={row} />
        </>
    )
}
