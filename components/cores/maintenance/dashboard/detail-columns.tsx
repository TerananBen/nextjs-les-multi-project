"use client"

import { useTranslations } from "next-intl"
import { ColumnDef } from "@tanstack/react-table"
import { MaintenanceDetailRecord } from "@/app/actions/maintenance"
import { Badge } from "@/components/ui/badge"
import { getLeafletIconUrl, MarkerBadge } from "@/lib/map-icons"
import { cn } from "@/lib/utils"

export const useMaintenanceDetailColumns = (): ColumnDef<MaintenanceDetailRecord>[] => {
    const t = useTranslations("MaintenanceDashboard")

    const getReportCauseIcon = (lampCase: string) => {
        let color: "blue" | "green" | "red" | "gray" = "gray"
        let badge: string | null = null

        switch (lampCase) {
            case "4":
                color = "red"
                badge = null
                break
            case "5":
                color = "green"
                badge = "⚡"
                break
            case "2":
                color = "blue"
                badge = "A"
                break
            default:
                color = "gray"
                badge = null
                break
        }

        return (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={getLeafletIconUrl(color, badge as MarkerBadge)} className="w-5 h-5 object-contain shrink-0" alt="Report Cause" />
        )
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
            cell: ({ row }) => <span className="font-medium text-foreground">{row.getValue("street_light_name") || "-"}</span>,
        },
        {
            accessorKey: "imsi_befor",
            header: t("detail.table.oldDeviceId"),
            cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.getValue("imsi_befor") || "-"}</span>,
        },
        {
            accessorKey: "imsi_after",
            header: t("detail.table.newDeviceId"),
            cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.getValue("imsi_after") || "-"}</span>,
        },
        {
            id: "gps",
            header: t("detail.table.gps"),
            cell: ({ row }) => {
                const lat = row.original.lat || "-"
                const lng = row.original.lng || "-"
                const display = `${lat}, ${lng}`
                return <span className="text-xs font-mono text-muted-foreground">{display}</span>
            },
        },
        {
            accessorKey: "lamp_case",
            header: t("detail.table.reportCause"),
            cell: ({ row }) => {
                const lampCase = row.getValue("lamp_case") as string
                return (
                    <div className="flex items-center gap-1.5">
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
                return <span className="text-sm text-foreground">{getMaintenanceActionText(mCase)}</span>
            },
        },
        {
            accessorKey: "lamp_status",
            header: t("detail.table.status"),
            cell: ({ row }) => {
                const status = row.getValue("lamp_status") as string
                const isRepaired = status === "T"
                return (
                    <Badge
                        variant="outline"
                        className={cn(
                            "font-medium border text-xs py-0.5 px-2",
                            isRepaired
                                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "border-destructive/30 bg-destructive/10 text-destructive"
                        )}
                    >
                        {isRepaired ? t("detail.status.repaired") : t("detail.status.pending")}
                    </Badge>
                )
            },
        },
    ]
}
