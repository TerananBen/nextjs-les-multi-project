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
import { getScheduleResponseAction, setModeResendAction } from "@/app/actions/schedule-settings"
import { Loader2, RefreshCw, RotateCw, Send, Info } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

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
    const [data, setData] = React.useState<ScheduleResponseItem[]>([])
    const [loading, setLoading] = React.useState(false)
    const [resendingImsi, setResendingImsi] = React.useState<string | null>(null)
    const [isResendingAll, setIsResendingAll] = React.useState(false)

    const fetchData = React.useCallback(async () => {
        if (!codeName) return

        setLoading(true)
        try {
            const result = await getScheduleResponseAction(codeName)
            if (result.result && Array.isArray(result.dataReturn)) {
                setData(result.dataReturn as ScheduleResponseItem[])
            } else {
                setData([])
            }
        } catch (error) {
            console.error("Failed to fetch response data", error)
            setData([])
        } finally {
            setLoading(false)
        }
    }, [codeName])

    React.useEffect(() => {
        if (open && codeName) {
            fetchData()
        }
    }, [open, codeName, fetchData])

    const handleResend = async (item: ScheduleResponseItem) => {
        if (!typeSchedule) return

        setResendingImsi(item.imsi)
        try {
            const payload = {
                imsi: item.imsi,
                mode: typeSchedule,
                last_update: item.last_update,
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
                    "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border shadow-2xs",
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
        if (!typeSchedule || data.length === 0) return

        const pendingItems = data.filter(item => item.status !== "respone")

        if (pendingItems.length === 0) return

        setIsResendingAll(true)
        let successCount = 0
        let failCount = 0

        toast.loading(t("resendingAll"), { id: "resend-all-toast" })

        try {
            for (const item of pendingItems) {
                const payload = {
                    imsi: item.imsi,
                    mode: typeSchedule,
                    last_update: item.last_update,
                }

                try {
                    const result = await setModeResendAction(payload)
                    if (result.success) {
                        successCount++
                    } else {
                        failCount++
                    }
                } catch (error) {
                    console.error(`Error resending to ${item.imsi}:`, error)
                    failCount++
                }
            }

            toast.dismiss("resend-all-toast")
            toast.success(t("resendAllComplete", { success: successCount, failed: failCount }))

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
                            disabled={loading || isResendingAll || !data.some(item => item.status !== "respone")}
                            className="cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xs font-medium h-9"
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
                            onClick={fetchData}
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
                                        <TableHead className="font-semibold text-xs h-10 px-3">{t("table.imsi")}</TableHead>
                                        <TableHead className="font-semibold text-xs h-10 px-3">{t("table.group")}</TableHead>
                                        <TableHead className="font-semibold text-xs h-10 px-3 text-center">{t("table.status")}</TableHead>
                                        <TableHead className="font-semibold text-xs h-10 px-3 text-center">{t("table.sendAgain")}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.length > 0 ? (
                                        data.map((item, index) => (
                                            <TableRow key={index} className="hover:bg-muted/40 transition-colors">
                                                <TableCell className="font-mono text-xs py-2.5 px-3">{item.imsi}</TableCell>
                                                <TableCell className="text-xs py-2.5 px-3">
                                                    {Array.isArray(item.group_name)
                                                        ? item.group_name.join(", ")
                                                        : item.group_name}
                                                </TableCell>
                                                <TableCell className="text-center py-2.5 px-3">{renderStatusBadge(item.status)}</TableCell>
                                                <TableCell className="text-center py-2.5 px-3">
                                                    <Button
                                                        size="icon"
                                                        variant="outline"
                                                        className="cursor-pointer h-7 w-7 text-primary hover:bg-primary/10 border-primary/20 shadow-2xs"
                                                        onClick={() => handleResend(item)}
                                                        disabled={resendingImsi === item.imsi}
                                                        title={t("table.sendAgain")}
                                                    >
                                                        {resendingImsi === item.imsi ? (
                                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        ) : (
                                                            <RefreshCw className="h-3.5 w-3.5" />
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
