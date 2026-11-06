"use client"

import * as React from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { useTranslations } from "next-intl"
import { ScheduleResponseItem } from "@/types/schedule-settings"
import { getScheduleResponseAction, setModeResendAction, resendAllScheduleByGroupAction } from "@/app/actions/schedule-settings"
import { Loader2, RefreshCw, RotateCw, Send, Info } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { usePermission } from "@/components/providers/permission-provider"

interface ResponseDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    codeName: string | null
    scheduleName: string | null
    typeSchedule: string | null
}

export function ResponseDialog({
    open,
    onOpenChange,
    codeName,
    scheduleName,
    typeSchedule
}: ResponseDialogProps) {
    const t = useTranslations("ScheduleSettings.responseDialog")
    const { getPermission } = usePermission()
    const { writable: canManage, control: canControl } = getPermission("V_SettingSchedule")
    const canSend = canManage || canControl

    const [data, setData] = React.useState<ScheduleResponseItem[]>([])
    const [loading, setLoading] = React.useState(false)
    const [resendingImsi, setResendingImsi] = React.useState<string | null>(null)
    const [isResendingAll, setIsResendingAll] = React.useState(false)

    const fetchData = React.useCallback(async (showToast = false) => {
        if (!codeName) return

        setLoading(true)
        try {
            const result = await getScheduleResponseAction(codeName)
            if (result.result && Array.isArray(result.dataReturn)) {
                setData(result.dataReturn as ScheduleResponseItem[])
                if (showToast) {
                    toast.success(t("reloadSuccess"))
                }
            } else {
                setData([])
                if (showToast) {
                    toast.info(t("noData"))
                }
            }
        } catch (error) {
            console.error("Failed to fetch response data", error)
            setData([])
            if (showToast) {
                toast.error(t("resendError"))
            }
        } finally {
            setLoading(false)
        }
    }, [codeName, t])

    React.useEffect(() => {
        if (open && codeName) {
            fetchData()
        }
    }, [open, codeName, fetchData])

    const handleResend = async (item: ScheduleResponseItem) => {
        if (!typeSchedule) return
        if (!canSend) {
            toast.error(t("permissionDenied"))
            return
        }

        const deviceImsi = item.imsi || item.SN || ""
        setResendingImsi(deviceImsi)
        try {
            const payload = {
                code_name: codeName || "",
                imsi: deviceImsi,
                last_update: item.last_update,
                mode: typeSchedule,
                wait_time: 20
            }

            const result = await setModeResendAction(payload)

            if (result.success) {
                toast.success(t("resendSuccess"))
            } else {
                toast.error(t("resendFailed") + (result.message ? `: ${result.message}` : ""))
            }
        } catch (error) {
            console.error(error)
            toast.error(t("resendError"))
        } finally {
            setResendingImsi(null)
        }
    }

    const getStatusLabel = (status: string) => {
        if (status === "wait response") return t("status.waitResponse")
        if (status === "respone") return t("status.response")
        return status
    }

    const renderStatusBadge = (status: string) => {
        const isResponse = status === "respone"
        const isWait = status === "wait response"
        return (
            <span
                className={cn(
                    "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border shadow-2xs",
                    isResponse
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                        : isWait
                        ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                        : "bg-muted text-muted-foreground border-border"
                )}
            >
                {getStatusLabel(status)}
            </span>
        )
    }

    const handleResendAll = async () => {
        if (!codeName || !typeSchedule) return
        if (!canSend) {
            toast.error(t("permissionDenied"))
            return
        }

        setIsResendingAll(true)
        toast.loading(t("resendingAll"), { id: "resend-all-toast" })

        try {
            const result = await resendAllScheduleByGroupAction({
                groupCode: codeName,
                mode: typeSchedule,
                waitTime: 20
            })

            toast.dismiss("resend-all-toast")

            if (result.total === 0) {
                toast.info(t("noData"))
            } else if (result.success || result.successCount > 0) {
                toast.success(t("resendAllComplete", { success: result.successCount, failed: result.failCount }))
            } else {
                toast.error(t("resendFailed") + (result.message ? `: ${result.message}` : ""))
            }

            fetchData()
        } catch (error) {
            console.error("Error in resend all batch:", error)
            toast.dismiss("resend-all-toast")
            toast.error(t("resendError"))
        } finally {
            setIsResendingAll(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[calc(100%-2rem)] sm:w-[calc(100%-3rem)] md:w-[calc(100%-4rem)] sm:max-w-2xl max-h-[calc(100dvh-2.5rem)] sm:max-h-[85vh] overflow-hidden flex flex-col p-0 rounded-xl">
                <DialogHeader className="px-5 py-3.5 border-b shrink-0 text-left">
                    <DialogTitle className="text-lg font-semibold flex items-center justify-start gap-2 text-left">
                        <Info className="h-5 w-5 text-primary shrink-0" />
                        {t("title")}
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        {t("title")}
                    </DialogDescription>
                    {scheduleName && (
                        <div className="text-sm text-muted-foreground text-left">
                            <span>{t("settingLabel")}</span>
                            <span className="font-medium text-foreground">{scheduleName}</span>
                        </div>
                    )}
                </DialogHeader>

                <div className="p-4 sm:px-5 sm:py-3.5 overflow-y-auto flex-1 bg-background space-y-3.5">
                    {/* Action Bar */}
                    <div className="flex justify-end gap-2.5">
                        <Button
                            variant="default"
                            size="sm"
                            onClick={handleResendAll}
                            disabled={loading || isResendingAll || !canSend || !codeName}
                            className={cn(
                                "cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xs font-medium h-9",
                                !canSend && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            {isResendingAll ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4 mr-2" />
                            )}
                            {t("resendAll")}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fetchData(true)}
                            disabled={loading || isResendingAll}
                            className="cursor-pointer shadow-2xs font-medium h-9"
                        >
                            <RotateCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                            {t("reload")}
                        </Button>
                    </div>

                    {/* Table */}
                    {loading && data.length === 0 ? (
                        <div className="flex h-48 items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            <span className="ml-2 text-sm text-muted-foreground">{t("loading")}</span>
                        </div>
                    ) : (
                        <div className="rounded-lg border bg-card overflow-hidden shadow-2xs">
                            <Table>
                                <TableHeader className="bg-muted/40">
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="font-semibold text-sm h-10 px-3">{t("table.imsi")}</TableHead>
                                        <TableHead className="font-semibold text-sm h-10 px-3">{t("table.group")}</TableHead>
                                        <TableHead className="font-semibold text-sm h-10 px-3 text-center">{t("table.status")}</TableHead>
                                        <TableHead className="font-semibold text-sm h-10 px-3 text-center">{t("table.sendAgain")}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.length > 0 ? (
                                        data.map((item, index) => (
                                            <TableRow key={item.SN || item.imsi || index} className="hover:bg-muted/40 transition-colors">
                                                <TableCell className="font-mono text-sm py-2.5 px-3">{item.imsi}</TableCell>
                                                <TableCell className="text-sm py-2.5 px-3">
                                                    {Array.isArray(item.group_name)
                                                        ? item.group_name.join(", ")
                                                        : item.group_name}
                                                </TableCell>
                                                <TableCell className="text-center py-2.5 px-3">{renderStatusBadge(item.status)}</TableCell>
                                                <TableCell className="text-center py-2.5 px-3">
                                                    <Button
                                                        size="icon"
                                                        variant="outline"
                                                        className={cn(
                                                            "cursor-pointer h-8 w-8 text-primary hover:bg-primary/10 border-primary/20 shadow-2xs",
                                                            !canSend && "opacity-50 cursor-not-allowed"
                                                        )}
                                                        onClick={() => {
                                                            if (canSend) handleResend(item)
                                                            else toast.error(t("permissionDenied"))
                                                        }}
                                                        disabled={resendingImsi === (item.imsi || item.SN) || !canSend}
                                                        title={t("table.sendAgain")}
                                                    >
                                                        {resendingImsi === (item.imsi || item.SN) ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <RefreshCw className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center h-24 text-sm text-muted-foreground">
                                                {t("noData")}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </div>

                {/* Footer Section */}
                <div className="px-5 py-3 border-t bg-muted/30 flex justify-end gap-3 shrink-0">
                    <Button
                        type="button"
                        variant="outline"
                        className="cursor-pointer"
                        onClick={() => onOpenChange(false)}
                    >
                        {t("close")}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
