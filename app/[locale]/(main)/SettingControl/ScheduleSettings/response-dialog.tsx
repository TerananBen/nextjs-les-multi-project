"use client"

import * as React from "react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
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
import { Loader2, RefreshCw, RotateCw, Send } from "lucide-react"
import { toast } from "sonner"

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
                setData(result.dataReturn)
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
            // Determine mode based on typeSchedule
            // 2.1 type: light -> mode: light
            // 2.2 type: time -> mode: time
            // 2.3 type: manual -> mode: manual
            // The typeSchedule from parent comes from item.typeSchedule which can be "time", "light", "manual"

            const payload = {
                imsi: item.imsi,
                mode: typeSchedule,
                last_update: item.last_update,
                // wait_time is handled in server action
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
            <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
                <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="flex flex-col gap-1">
                        <DialogTitle>{t("title")} - {scheduleName}</DialogTitle>
                        <DialogDescription>
                            {/* Summary or description if needed */}
                        </DialogDescription>
                    </div>
                    <div className="flex gap-2 ml-auto mr-8">
                        <Button
                            variant="default"
                            size="sm"
                            onClick={handleResendAll}
                            disabled={loading || isResendingAll || !data.some(item => item.status !== "respone")}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
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
                        >
                            <RotateCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                            {t("reload")}
                        </Button>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-auto min-h-[300px]">
                    {loading && data.length === 0 ? (
                        <div className="flex h-full items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <span className="ml-2">{t("loading")}</span>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t("table.imsi")}</TableHead>
                                    <TableHead>{t("table.group")}</TableHead>
                                    <TableHead>{t("table.status")}</TableHead>
                                    <TableHead>{t("table.sendAgain")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.length > 0 ? (
                                    data.map((item, index) => (
                                        <TableRow key={index}>
                                            <TableCell>{item.imsi}</TableCell>
                                            <TableCell>
                                                {Array.isArray(item.group_name)
                                                    ? item.group_name.join(", ")
                                                    : item.group_name}
                                            </TableCell>
                                            <TableCell>{getStatusLabel(item.status)}</TableCell>
                                            <TableCell>
                                                <Button
                                                    size="sm"
                                                    variant="default"
                                                    className="bg-pink-600 hover:bg-pink-700 text-white"
                                                    onClick={() => handleResend(item)}
                                                    disabled={resendingImsi === item.imsi}
                                                >
                                                    {resendingImsi === item.imsi ? (
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
                                        <TableCell colSpan={4} className="text-center h-24">
                                            No data
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
