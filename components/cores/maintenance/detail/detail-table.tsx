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
import { Loader2, CheckCircle2, Clock, Check, Inbox } from "lucide-react"
import { cn } from "@/lib/utils"

interface DetailDataTableProps {
    data: MaintenanceDetailRecord[]
    detailId?: string | null
    canWrite?: boolean
}

function DetailTableRow({
    row,
    index,
    getReportCauseIcon,
    detailId,
    canWrite = true
}: {
    row: MaintenanceDetailRecord
    index: number
    getReportCauseIcon: (cause: string) => React.ReactNode
    detailId: string | null | undefined
    canWrite?: boolean
}) {
    const t = useTranslations("MaintenanceDashboard")
    const [rtuNew, setRtuNew] = useState(row.imsi_after || "")
    const [status, setStatus] = useState<"T" | "F">(row.lamp_status === "T" ? "T" : "F")
    const [updating, setUpdating] = useState(false)
    const [savingRtu, setSavingRtu] = useState(false)

    const isRtuModified = rtuNew.trim() !== (row.imsi_after || "").trim()

    const handleSaveRtu = async () => {
        if (!canWrite) {
            toast.error(t("detail.permissionDenied") || t("messages.permissionDenied", { defaultMessage: "ไม่มีสิทธิ์ในการดำเนินการนี้" }))
            return
        }
        if (!detailId) return
        setSavingRtu(true)
        const res = await confirmDataMaintenanceDetailAction({
            type: status,
            id: detailId,
            street_light_name: row.street_light_name,
            rtu_new: rtuNew.trim()
        })
        setSavingRtu(false)
        if (res.success) {
            toast.success(t("detail.actionSuccess"))
        } else {
            toast.error(res.message || t("detail.actionError"))
        }
    }

    const handleStatusToggle = async () => {
        if (!canWrite) {
            toast.error(t("detail.permissionDenied") || t("messages.permissionDenied", { defaultMessage: "ไม่มีสิทธิ์ในการดำเนินการนี้" }))
            return
        }
        if (!detailId) return
        setUpdating(true)
        const nextStatus = status === "T" ? "F" : "T"
        const res = await confirmDataMaintenanceDetailAction({
            type: nextStatus,
            id: detailId,
            street_light_name: row.street_light_name,
            rtu_new: rtuNew.trim()
        })
        setUpdating(false)
        if (res.success) {
            setStatus(nextStatus)
            toast.success(nextStatus === "T" ? t("detail.status.repaired") : t("detail.status.pending"))
        } else {
            toast.error(res.message || t("detail.actionError"))
        }
    }

    const handleMaintenanceCaseChange = async (val: string) => {
        if (!canWrite) {
            toast.error(t("detail.permissionDenied") || t("messages.permissionDenied", { defaultMessage: "ไม่มีสิทธิ์ในการดำเนินการนี้" }))
            return
        }
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
        <TableRow className="hover:bg-muted/30 transition-colors">
            <TableCell className="text-center font-medium text-muted-foreground">{index + 1}</TableCell>
            <TableCell className="font-medium text-foreground">{row.street_light_name}</TableCell>
            <TableCell className="font-mono text-xs text-muted-foreground">{row.imsi_befor}</TableCell>
            <TableCell>
                <div className="flex items-center gap-1.5 min-w-[170px]">
                    <Input
                        value={rtuNew}
                        onChange={(e) => setRtuNew(e.target.value)}
                        placeholder={t("detail.table.enterNewDevice")}
                        disabled={!canWrite}
                        className={cn(
                            "h-8 text-xs font-mono bg-background flex-1",
                            !canWrite && "opacity-60 cursor-not-allowed"
                        )}
                    />
                    {isRtuModified && (
                        <Button
                            size="icon"
                            variant="default"
                            onClick={handleSaveRtu}
                            disabled={savingRtu || !detailId || !canWrite}
                            className={cn(
                                "h-8 w-8 shrink-0 shadow-2xs",
                                canWrite ? "cursor-pointer" : "opacity-50 cursor-not-allowed"
                            )}
                            title={t("detail.actionSuccess")}
                        >
                            {savingRtu ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        </Button>
                    )}
                </div>
            </TableCell>
            <TableCell>
                <div className="text-xs text-muted-foreground font-mono">
                    {row.lat}, {row.lng}
                </div>
            </TableCell>
            <TableCell className="text-center">
                <div className="flex items-center justify-center">
                    {getReportCauseIcon(String(row.lamp_case))}
                </div>
            </TableCell>
            <TableCell>
                <Select defaultValue={row.maintenance_case || ""} onValueChange={handleMaintenanceCaseChange} disabled={updating || !detailId || !canWrite}>
                    <SelectTrigger className={cn("h-8 w-[140px] text-xs bg-background", canWrite ? "cursor-pointer" : "opacity-60 cursor-not-allowed")} disabled={updating || !detailId || !canWrite}>
                        <SelectValue placeholder={t("detail.table.selectAction")} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem className="cursor-pointer text-xs" value="1">{t("detail.table.changeRtu")}</SelectItem>
                        <SelectItem className="cursor-pointer text-xs" value="2">{t("detail.table.changeLamp")}</SelectItem>
                        <SelectItem className="cursor-pointer text-xs" value="3">{t("detail.table.repairWiring")}</SelectItem>
                        <SelectItem className="cursor-pointer text-xs" value="4">{t("detail.table.other")}</SelectItem>
                    </SelectContent>
                </Select>
            </TableCell>
            <TableCell className="text-center">
                <Button
                    onClick={handleStatusToggle}
                    disabled={updating || !detailId || !canWrite}
                    size="sm"
                    variant="outline"
                    className={cn(
                        "h-8 text-xs font-medium gap-1.5 px-3 transition-colors",
                        canWrite ? "cursor-pointer" : "opacity-60 cursor-not-allowed",
                        status === "T"
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                            : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"
                    )}
                >
                    {updating ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : status === "T" ? (
                        <>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {t("detail.status.repaired")}
                        </>
                    ) : (
                        <>
                            <Clock className="h-3.5 w-3.5" />
                            {t("detail.status.pending")}
                        </>
                    )}
                </Button>
            </TableCell>
        </TableRow>
    )
}

export function DetailDataTable({ data, detailId, canWrite = true }: DetailDataTableProps) {
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
            <img src={getLeafletIconUrl(color, badge as MarkerBadge)} className="w-5 h-5 object-contain drop-shadow-2xs" alt="Report Cause" />
        )
    }

    if (!data.length) {
        return (
            <div className="flex flex-col items-center justify-center h-48 border rounded-lg bg-card text-muted-foreground gap-2">
                <Inbox className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm font-medium">{t("detail.table.noData")}</p>
            </div>
        )
    }

    return (
        <div className="rounded-lg border bg-card overflow-hidden shadow-2xs">
            <Table>
                <TableHeader className="bg-muted/50">
                    <TableRow>
                        <TableHead className="w-[50px] text-center font-semibold text-muted-foreground">#</TableHead>
                        <TableHead className="font-semibold text-muted-foreground">{t("detail.table.poleName")}</TableHead>
                        <TableHead className="font-semibold text-muted-foreground">{t("detail.table.oldDevice")}</TableHead>
                        <TableHead className="font-semibold text-muted-foreground">{t("detail.table.newDevice")}</TableHead>
                        <TableHead className="font-semibold text-muted-foreground">{t("detail.table.coordinates")}</TableHead>
                        <TableHead className="text-center font-semibold text-muted-foreground">{t("detail.table.issueReason")}</TableHead>
                        <TableHead className="font-semibold text-muted-foreground">{t("detail.table.repairAction")}</TableHead>
                        <TableHead className="text-center font-semibold text-muted-foreground">{t("detail.table.status")}</TableHead>
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
                            canWrite={canWrite}
                        />
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
