"use client"

import * as React from "react"
import { ScheduleItem } from "@/types/schedule-settings"
import { getDataScheduleAction } from "@/app/actions/schedule-settings"
import { useScheduleColumns } from "./columns"
import { DataTable } from "./data-table"
import { toast } from "sonner"

export function ScheduleSettingsClient() {
    const [data, setData] = React.useState<ScheduleItem[]>([])
    const [loading, setLoading] = React.useState(true)

    const columns = useScheduleColumns()

    React.useEffect(() => {
        const fetchData = async () => {
            try {
                const result = await getDataScheduleAction()
                setData(result)
            } catch (error) {
                console.error("Failed to fetch schedule data", error)
                toast.error("Failed to load schedule data")
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [])

    return (
        <div className="flex flex-col gap-6 w-full">
            <div className="flex-1">
                <DataTable columns={columns} data={data} loading={loading} />
            </div>
        </div>
    )
}
