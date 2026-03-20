"use client"

import * as React from "react"
import { ScheduleItem } from "@/types/schedule-settings"
import { getDataScheduleAction } from "@/app/actions/schedule-settings"
import { useScheduleColumns } from "./columns"
import { DataTable } from "./data-table"
import { toast } from "sonner"
import { getListDataGroupAction } from "@/app/actions/street-light"
import { DeviceGroup } from "@/types/street-light"
import { EditScheduleDialog } from "./edit-dialog"
import { ResponseDialog } from "./response-dialog"
import { Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { deleteScheduleAction } from "@/app/actions/schedule-settings"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface ScheduleSettingsClientProps {
    versionLightSensor: string
}

export function ScheduleSettingsClient({ versionLightSensor }: ScheduleSettingsClientProps) {
    const t = useTranslations("ScheduleSettings")
    const [data, setData] = React.useState<ScheduleItem[]>([])
    const [groups, setGroups] = React.useState<DeviceGroup[]>([])
    const [loading, setLoading] = React.useState(true)

    // Dialog State
    const [openDialog, setOpenDialog] = React.useState(false)
    const [selectedSchedule, setSelectedSchedule] = React.useState<ScheduleItem | null>(null)

    // Response Dialog State
    const [openResponseDialog, setOpenResponseDialog] = React.useState(false)
    const [responseScheduleCode, setResponseScheduleCode] = React.useState<string | null>(null)
    const [responseScheduleName, setResponseScheduleName] = React.useState<string | null>(null)
    const [responseTypeSchedule, setResponseTypeSchedule] = React.useState<string | null>(null)

    // Delete State
    const [openDeleteDialog, setOpenDeleteDialog] = React.useState(false)
    const [scheduleToDelete, setScheduleToDelete] = React.useState<ScheduleItem | null>(null)
    const [isDeleting, setIsDeleting] = React.useState(false)

    const columns = useScheduleColumns({
        onEdit: (item) => {
            setSelectedSchedule(item)
            setOpenDialog(true)
        },
        onDelete: (item) => {
            setScheduleToDelete(item)
            setOpenDeleteDialog(true)
        },
        onFeedback: (item) => {
            setResponseScheduleCode(item.groupCode) // Using groupCode as code_name as per API requirement usually
            setResponseScheduleName(item.scheduleName)
            setResponseTypeSchedule(item.typeSchedule)
            setOpenResponseDialog(true)
        }
    })

    const handleAdd = () => {
        setSelectedSchedule(null) // Ensure we are in "Add" mode
        setOpenDialog(true)
    }

    const handleDeleteConfirm = async () => {
        if (!scheduleToDelete) return

        setIsDeleting(true)
        try {
            const result = await deleteScheduleAction(scheduleToDelete.groupCode)
            if (result.success) {
                toast.success(t("deleteDialog.success"))
                setOpenDeleteDialog(false)
                // Refresh data
                window.location.reload()
            } else {
                toast.error(t("deleteDialog.error") + (result.message ? `: ${result.message}` : ""))
            }
        } catch (error) {
            console.error(error)
            toast.error(t("deleteDialog.error"))
        } finally {
            setIsDeleting(false)
            setScheduleToDelete(null)
        }
    }

    React.useEffect(() => {
        const fetchData = async () => {
            try {
                const [scheduleResult, groupsResult] = await Promise.all([
                    getDataScheduleAction(),
                    getListDataGroupAction()
                ])
                setData(scheduleResult)
                setGroups(groupsResult)
            } catch (error) {
                console.error("Failed to fetch data", error)
                toast.error(t("failedToLoadData"))
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [])

    return (
        <div className="flex flex-col gap-6 w-full">
            <div className="flex-1">

                <DataTable columns={columns} data={data} loading={loading} onAdd={handleAdd} />
            </div>

            <EditScheduleDialog
                versionLightSensor={versionLightSensor}
                open={openDialog}
                onOpenChange={setOpenDialog}
                schedule={selectedSchedule}
                groups={groups}
            />

            <ResponseDialog
                open={openResponseDialog}
                onOpenChange={setOpenResponseDialog}
                codeName={responseScheduleCode}
                scheduleName={responseScheduleName}
                typeSchedule={responseTypeSchedule}
            />

            <AlertDialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("deleteDialog.title")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("deleteDialog.description", { name: scheduleToDelete?.scheduleName || "" })}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>{t("deleteDialog.cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault()
                                handleDeleteConfirm()
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white"
                            disabled={isDeleting}
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {t("deleteDialog.deleting")}
                                </>
                            ) : (
                                t("deleteDialog.confirm")
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
