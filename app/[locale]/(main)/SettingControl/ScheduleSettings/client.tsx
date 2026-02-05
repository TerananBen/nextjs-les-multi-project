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
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { useTranslations } from "next-intl"

export function ScheduleSettingsClient() {
    const t = useTranslations("ScheduleSettings")
    const [data, setData] = React.useState<ScheduleItem[]>([])
    const [groups, setGroups] = React.useState<DeviceGroup[]>([])
    const [loading, setLoading] = React.useState(true)

    // Dialog State
    const [openDialog, setOpenDialog] = React.useState(false)
    const [selectedSchedule, setSelectedSchedule] = React.useState<ScheduleItem | null>(null)

    const columns = useScheduleColumns({
        onEdit: (item) => {
            setSelectedSchedule(item)
            setOpenDialog(true)
        }
    })

    const handleAdd = () => {
        setSelectedSchedule(null) // Ensure we are in "Add" mode
        setOpenDialog(true)
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
                toast.error("Failed to load data")
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
                open={openDialog}
                onOpenChange={setOpenDialog}
                schedule={selectedSchedule}
                groups={groups}
            />
        </div>
    )
}
