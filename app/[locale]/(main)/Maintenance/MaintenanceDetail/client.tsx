"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { MaintenanceDetailListRecord } from "@/app/actions/maintenance"
import { useMaintenanceDetailColumns } from "./columns"
import { DataTable } from "./data-table"

interface MaintenanceDetailClientProps {
    initialData: MaintenanceDetailListRecord[]
}

export function MaintenanceDetailClient({ initialData }: MaintenanceDetailClientProps) {
    const t = useTranslations("MaintenanceDetail")
    const columns = useMaintenanceDetailColumns()

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
        </div>
    )
}
