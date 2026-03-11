"use client"

import * as React from "react"
import { MaintenanceConfigRecord } from "@/app/actions/maintenance"
import { getDataListMaintenanceTotal } from "@/app/actions/maintenance"
import { useMaintenanceColumns } from "./columns"
import { DataTable } from "./data-table"
import { toast } from "sonner"
import { useTranslations } from "next-intl"

export function MaintenanceConfigClient() {
    const t = useTranslations("MaintenanceConfig")
    const [data, setData] = React.useState<MaintenanceConfigRecord[]>([])
    const [loading, setLoading] = React.useState(true)

    const columns = useMaintenanceColumns({
        onDetail: (item) => {
            console.log("Detail clicked", item)
            // Implementation pending
        },
        onStatusChange: (item) => {
            console.log("Status clicked", item)
            // Implementation pending
        },
        onDelete: (item) => {
            console.log("Delete clicked", item)
            // Implementation pending
        }
    })

    const handleAdd = () => {
        console.log("Add clicked")
        // Implementation pending
    }

    React.useEffect(() => {
        const fetchData = async () => {
            try {
                const result = await getDataListMaintenanceTotal()
                setData(result || [])
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
        </div>
    )
}
