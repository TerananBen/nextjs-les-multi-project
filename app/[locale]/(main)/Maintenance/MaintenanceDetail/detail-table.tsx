"use client"

import { useTranslations } from "next-intl"
import { useState } from "react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { MaintenanceDetailRecord, confirmDataMaintenanceDetailAction, maintenanceCaseSaveAction } from "@/app/actions/maintenance"
import { getLeafletIconUrl, MarkerBadge } from "@/lib/map-icons"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

interface DetailDataTableProps {
    data: MaintenanceDetailRecord[]
    detailId?: string | null
}

function DetailTableRow({ row, index, getReportCauseIcon, detailId }: { row: MaintenanceDetailRecord, index: number, getReportCauseIcon: (cause: string) => React.ReactNode, detailId: string | null | undefined }) {
    const t = useTranslations("MaintenanceDashboard")
    const [rtuNew, setRtuNew] = useState(row.imsi_after || "")
    const [status, setStatus] = useState<"T" | "F">(row.lamp_status === "T" ? "T" : "F")
    const [updating, setUpdating] = useState(false)

    const handleStatusToggle = async () => {
        if (!detailId) return
        setUpdating(true)
        const nextStatus = status === "T" ? "F" : "T"
        const res = await confirmDataMaintenanceDetailAction({
            type: nextStatus,
            id: detailId,
            street_light_name: row.street_light_name,
            rtu_new: rtuNew
        })
        setUpdating(false)
        if (res.success) {
            setStatus(nextStatus)
            toast.success(nextStatus === "T" ? t("detail.status.repaired") : t("detail.status.pending"))
        } else {
            toast.error(res.message || "Failed to update status.")
        }
    }

    const handleMaintenanceCaseChange = async (val: string) => {
        if (!detailId) return
        setUpdating(true)
        const res = await maintenanceCaseSaveAction({
            id: detailId,
            maintenance_case_id: val,
            street_light_name: row.street_light_name
        })
        setUpdating(false)
        if (res.success) {
            toast.success(t("detail.actionSuccess"))
        } else {
            toast.error(res.message || t("detail.actionError"))
        }
    }

    return (
        <TableRow>
            <TableCell className="text-center">{index + 1}</TableCell>
            <TableCell>{row.street_light_name}</TableCell>
            <TableCell>{row.imsi_befor}</TableCell>
            <TableCell>
                <Input
                    value={rtuNew}
                    onChange={(e) => setRtuNew(e.target.value)}
                    placeholder={t("detail.table.enterNewDevice")}
                    className="h-8 w-full min-w-[120px]"
                />
            </TableCell>
            <TableCell>
                <div className="text-xs text-gray-500">
                    {row.lat}, {row.lng}
                </div>
            </TableCell>
            <TableCell>
                <div className="flex items-center">
                    {getReportCauseIcon(String(row.lamp_case))}
                </div>
            </TableCell>
            <TableCell>
                <Select defaultValue={row.maintenance_case || ""} onValueChange={handleMaintenanceCaseChange}>
                    <SelectTrigger className="h-8 w-[140px]" disabled={updating || !detailId}>
                        <SelectValue placeholder={t("detail.table.selectAction")} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="1">{t("detail.table.changeRtu")}</SelectItem>
                        <SelectItem value="2">{t("detail.table.changeLamp")}</SelectItem>
                        <SelectItem value="3">{t("detail.table.repairWiring")}</SelectItem>
                        <SelectItem value="4">{t("detail.table.other")}</SelectItem>
                    </SelectContent>
                </Select>
            </TableCell>
            <TableCell className="text-center">
                <Button 
                    onClick={handleStatusToggle}
                    disabled={updating || !detailId}
                    size="sm" 
                    className={`h-8 text-xs ${status === "T" ? "bg-green-500 hover:bg-green-600 text-white" : "bg-red-500 hover:bg-red-600 text-white"}`}
                >
                    {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : (status === "T" ? t("detail.status.repaired") : t("detail.status.pending"))}
                </Button>
            </TableCell>
        </TableRow>
    )
}

export function DetailDataTable({ data, detailId }: DetailDataTableProps) {
    const t = useTranslations("MaintenanceDashboard")

    const getReportCauseIcon = (lampCase: string) => {
        let color: "blue" | "green" | "red" | "gray" = "gray"
        let badge: string | null = null

        switch (String(lampCase)) {
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
            <img src={getLeafletIconUrl(color, badge as MarkerBadge)} className="w-6 h-6 object-contain" alt="Report Cause" />
        )
    }

    if (!data.length) {
        return (
            <div className="flex justify-center items-center h-48 border rounded-md text-gray-500">
                {t("detail.table.noData")}
            </div>
        )
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader className="bg-slate-50">
                    <TableRow>
                        <TableHead className="w-[50px] text-center">#</TableHead>
                        <TableHead>{t("detail.table.poleName")}</TableHead>
                        <TableHead>{t("detail.table.oldDevice")}</TableHead>
                        <TableHead>{t("detail.table.newDevice")}</TableHead>
                        <TableHead>{t("detail.table.coordinates")}</TableHead>
                        <TableHead>{t("detail.table.issueReason")}</TableHead>
                        <TableHead>{t("detail.table.repairAction")}</TableHead>
                        <TableHead className="text-center">{t("detail.table.status")}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((row, index) => (
                        <DetailTableRow
                            key={row.imsi_befor || `${row.street_light_name}-${index}`}
                            row={row}
                            index={index}
                            getReportCauseIcon={getReportCauseIcon}
                            detailId={detailId}
                        />
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
