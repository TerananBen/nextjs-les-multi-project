"use client"

import * as React from "react"
import { MaintenanceDetailListRecord } from "@/app/actions/maintenance"
import { useMaintenanceDetailColumns } from "./columns"
import { DataTable } from "./data-table"
import { DetailDialog } from "./detail-dialog"

interface MaintenanceDetailClientProps {
    initialData: MaintenanceDetailListRecord[]
}

export function MaintenanceDetailClient({ initialData }: MaintenanceDetailClientProps) {
    const [selectedDetailId, setSelectedDetailId] = React.useState<string | null>(null)
    const columns = useMaintenanceDetailColumns(setSelectedDetailId)

    const [data] = React.useState<MaintenanceDetailListRecord[]>(initialData)

    return (
        <div className="flex flex-col gap-6 w-full">
            {/* Title Section 
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
            </div> */}

            {/* Table Section */}
            <div className="flex-1">
                <DataTable columns={columns} data={data} />
            </div>

            {/* Dialog Component */}
            <DetailDialog
                detailId={selectedDetailId}
                onClose={() => setSelectedDetailId(null)}
            />
        </div>
    )
}
