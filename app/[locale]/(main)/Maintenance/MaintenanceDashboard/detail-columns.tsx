"use client"

import { useTranslations } from "next-intl"
import { ColumnDef } from "@tanstack/react-table"
import { MaintenanceDetailRecord } from "@/app/actions/maintenance"
import { Lightbulb } from "lucide-react"

export const useMaintenanceDetailColumns = (): ColumnDef<MaintenanceDetailRecord>[] => {
    const t = useTranslations("MaintenanceDashboard")

    const getReportCauseIcon = (lampCase: string) => {
        // Mapped based on assumptions derived from Global Map and instructions. 
        // 4 = Red (Power/RTU fail)
        // Others map to default or assumed colors.
        switch (lampCase) {
            case "4":
                return <Lightbulb className="w-5 h-5 text-red-500 fill-current" />
            case "3":
                return <Lightbulb className="w-5 h-5 text-yellow-500 fill-current" />
            case "2":
                return <Lightbulb className="w-5 h-5 text-blue-500 fill-current" />
            default:
                return <Lightbulb className="w-5 h-5 text-gray-500 fill-current" />
        }
    }

    const getMaintenanceActionText = (maintenanceCase: string) => {
        switch (maintenanceCase) {
            case "1":
                return t("detail.maintenanceCase.1") // "Change RTU"
            case "2":
                return t("detail.maintenanceCase.2") // "Change Lamp"
            case "3":
                return t("detail.maintenanceCase.3") // "Repair Lamp"
            default:
                return t("detail.maintenanceCase.unknown")
        }
    }

    return [
        {
            accessorKey: "street_light_name",
            header: t("detail.table.poleNumber"),
            cell: ({ row }) => <div className="text-gray-500">{row.getValue("street_light_name") || "-"}</div>,
        },
        {
            accessorKey: "imsi_befor",
            header: t("detail.table.oldDeviceId"),
            cell: ({ row }) => <div className="text-gray-500">{row.getValue("imsi_befor") || "-"}</div>,
        },
        {
            accessorKey: "imsi_after",
            header: t("detail.table.newDeviceId"),
            cell: ({ row }) => <div className="text-gray-500">{row.getValue("imsi_after") || "-"}</div>,
        },
        {
            id: "gps",
            header: t("detail.table.gps"),
            cell: ({ row }) => {
                const lat = row.original.lat || "-"
                const lng = row.original.lng || "-"
                const display = `${lat} , ${lng}`
                return <div className="text-gray-500">{display}</div>
            },
        },
        {
            accessorKey: "lamp_case",
            header: t("detail.table.reportCause"),
            cell: ({ row }) => {
                const lampCase = row.getValue("lamp_case") as string
                return (
                    <div className="flex items-center">
                        {getReportCauseIcon(lampCase)}
                    </div>
                )
            },
        },
        {
            accessorKey: "maintenance_case",
            header: t("detail.table.maintenance"),
            cell: ({ row }) => {
                const mCase = row.getValue("maintenance_case") as string
                return <div className="text-gray-500">{getMaintenanceActionText(mCase)}</div>
            },
        },
        {
            accessorKey: "lamp_status",
            header: t("detail.table.status"),
            cell: ({ row }) => {
                const status = row.getValue("lamp_status") as string
                // Based on screenshot, "T" = Repaired (Green), "F" = Pending (Red)
                if (status === "T") {
                    return <span className="text-green-500 font-medium">{t("detail.status.repaired")}</span>
                }
                if (status === "F") {
                    return <span className="text-red-500 font-medium">{t("detail.status.pending")}</span>
                }
                return <span>{status}</span>
            },
        },
    ]
}
