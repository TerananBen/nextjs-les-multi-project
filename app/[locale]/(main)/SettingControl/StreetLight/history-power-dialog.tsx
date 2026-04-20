"use client"

import * as React from "react"
import { useTranslations, useLocale } from "next-intl"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { FileText, RefreshCcw, ArrowUpDown, FileSpreadsheet, Calendar as CalendarIcon, X } from "lucide-react"
import { StreetLightLog } from "@/types/street-light"
import { getDataLogStreetLightMongoAction } from "@/app/actions/street-light"
import { toast } from "sonner"
import { DateRange } from "react-day-picker"
import { format, differenceInDays } from "date-fns"
import { th, enUS } from "date-fns/locale"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface HistoryPowerDialogProps {
    imei: string
    deviceName?: string
}

export function HistoryPowerDialog({ imei, deviceName }: HistoryPowerDialogProps) {
    const t = useTranslations("StreetLight") // Adjust namespace if needed
    const locale = useLocale()
    const [open, setOpen] = React.useState(false)
    const [loading, setLoading] = React.useState(false)
    const [logs, setLogs] = React.useState<StreetLightLog[]>([])

    // Dates - specific to this component state
    const [dateRange, setDateRange] = React.useState<DateRange | undefined>()

    // Sorting state
    const [sortConfig, setSortConfig] = React.useState<{ key: keyof StreetLightLog; direction: 'asc' | 'desc' } | null>(null)

    const fetchData = React.useCallback(async () => {
        if (!dateRange?.from || !dateRange?.to) return

        const start = dateRange.from
        const end = dateRange.to

        if (start > end) {
            toast.error(t("powerHistory.validation.startDateAfterEndDate", { defaultValue: "Start date cannot be after end date" }))
            return
        }

        const now = new Date()
        now.setHours(23, 59, 59, 999)

        if (start > now || end > now) {
            toast.error(t("powerHistory.validation.futureDatesNotAllowed", { defaultValue: "Cannot select future dates" }))
            return
        }

        const diffDays = Math.abs(differenceInDays(end, start))

        if (diffDays > 31) {
            toast.error(t("powerHistory.validation.rangeExceeded", { defaultValue: "Date range cannot exceed 1 month (31 days)" }))
            return
        }

        setLoading(true)
        try {
            const startStr = format(start, 'yyyy-MM-dd')
            const endStr = format(end, 'yyyy-MM-dd')

            const startTs = Math.floor(new Date(`${startStr}T00:00:00`).getTime() / 1000).toString()
            const endTs = Math.floor(new Date(`${endStr}T23:59:59`).getTime() / 1000).toString()

            const data = await getDataLogStreetLightMongoAction(imei, startTs, endTs)

            const logArray = Object.values(data)
            logArray.sort((a, b) => parseInt(b.ts) - parseInt(a.ts))

            setLogs(logArray)

            if (logArray.length === 0) {
                toast.info(t("powerHistory.status.noData", { defaultValue: "No data found for this period" }))
            } else {
                toast.success(t("powerHistory.status.foundRecords", { count: logArray.length, defaultValue: `Found ${logArray.length} records` }))
            }

        } catch (error) {
            console.error(error)
            toast.error(t("powerHistory.status.error", { defaultValue: "Failed to fetch history" }))
        } finally {
            setLoading(false)
        }
    }, [dateRange, imei, t])

    React.useEffect(() => {
        if (dateRange?.from && dateRange?.to) {
            fetchData()
        }
    }, [dateRange, fetchData])

    React.useEffect(() => {
        if (open && (!dateRange || !dateRange.from)) {
            const now = new Date()
            setDateRange({ from: now, to: now })
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open])

    // Sorting logic - Restored
    const handleSort = (key: keyof StreetLightLog) => {
        let direction: 'asc' | 'desc' = 'asc'
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc'
        }
        setSortConfig({ key, direction })
    }

    // Export to Excel (CSV)
    const handleExport = () => {
        if (logs.length === 0) {
            toast.error(t("powerHistory.status.noDataExport", { defaultValue: "No data to export" }))
            return
        }

        const headers = [
            t("powerHistory.table.dateTime", { defaultValue: "Date-Time" }),
            t("powerHistory.table.i", { defaultValue: "Current (mA)" }),
            t("powerHistory.table.v", { defaultValue: "Voltage (V)" }),
            t("powerHistory.table.w", { defaultValue: "Power (W)" }),
            t("powerHistory.table.pf", { defaultValue: "Power Factor" })
        ]
        const csvContent = [
            headers.join(","),
            ...logs.map(log => [
                `${log.date} ${log.time}`,
                log.i,
                log.v,
                log.w,
                log.pf
            ].join(","))
        ].join("\n")

        const blob = new Blob([`\uFEFF${csvContent}`], { type: "text/csv;charset=utf-8;" })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.setAttribute("href", url)
        const startStr = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : ""
        const endStr = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : ""
        link.setAttribute("download", `power_history_${imei}_${startStr}_${endStr}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const sortedLogs = React.useMemo(() => {
        const sortableLogs = [...logs]
        if (sortConfig !== null) {
            sortableLogs.sort((a, b) => {
                const aValue = a[sortConfig.key]
                const bValue = b[sortConfig.key]

                // Handle nulls
                if (aValue === null) return 1
                if (bValue === null) return -1
                if (aValue === null && bValue === null) return 0

                // Numeric comparison only for specific fields
                const numericKeys = ['i', 'v', 'w', 'pf', 'ts']
                if (numericKeys.includes(sortConfig.key)) {
                    return sortConfig.direction === 'asc'
                        ? parseFloat(aValue as string) - parseFloat(bValue as string)
                        : parseFloat(bValue as string) - parseFloat(aValue as string)
                }

                if (aValue < bValue) {
                    return sortConfig.direction === 'asc' ? -1 : 1
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'asc' ? 1 : -1
                }
                return 0
            })
        }
        return sortableLogs
    }, [logs, sortConfig])

    // Calculations for summary stats
    const averagePower = React.useMemo(() => {
        if (logs.length === 0) return 0
        const sum = logs.reduce((acc, curr) => acc + (parseFloat(curr.w) || 0), 0)
        return (sum / logs.length).toFixed(4)
    }, [logs])

    const averageVoltage = React.useMemo(() => {
        if (logs.length === 0) return 0
        const sum = logs.reduce((acc, curr) => acc + (parseFloat(curr.v) || 0), 0)
        return (sum / logs.length).toFixed(4)
    }, [logs])

    const averageCurrent = React.useMemo(() => {
        if (logs.length === 0) return 0
        const sum = logs.reduce((acc, curr) => acc + (parseFloat(curr.i) || 0), 0)
        return (sum / logs.length).toFixed(4)
    }, [logs])


    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="default" size="icon" className="h-8 w-8 bg-green-500 hover:bg-green-600 rounded-lg">
                    <FileText className="h-4 w-4 text-white" />
                </Button>
            </DialogTrigger>
            {/* Increase standard max width for detailed table */}
            <DialogContent className="max-w-[95vw] w-full max-h-[90vh] overflow-hidden flex flex-col p-0">
                <DialogHeader className="px-6 py-4 border-b">
                    <DialogTitle>{t("historyPowerTitle", { defaultValue: "History Power" })}</DialogTitle>
                    <div className="text-sm text-muted-foreground">{t("device", { defaultValue: "Device" })}: {imei} {deviceName ? `(${deviceName})` : ''}</div>
                </DialogHeader>

                <div className="flex flex-col flex-1 overflow-hidden bg-gray-50/50">
                    {/* Controls Bar */}
                    <div className="p-4 bg-white border-b space-y-4">
                        {/* Row 1: Date Range & Actions (Centered) */}
                        <div className="flex flex-col md:flex-row gap-4 items-center justify-center">
                            <div className="flex items-center gap-2 flex-nowrap overflow-x-auto max-w-full pb-2 md:pb-0">
                                <Label className="whitespace-nowrap font-medium text-gray-700">{t("powerHistory.labels.selectDateRange", { defaultValue: "Select Date Range :" })}</Label>
                                <div className="flex items-center gap-1">
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "w-auto min-w-[240px] justify-start text-left font-normal bg-white h-10",
                                                    !dateRange && "text-muted-foreground"
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {dateRange?.from ? (
                                                    dateRange.to ? (
                                                        <>
                                                            {format(dateRange.from, "PPP", { locale: locale === "th" ? th : enUS })} -{" "}
                                                            {format(dateRange.to, "PPP", { locale: locale === "th" ? th : enUS })}
                                                        </>
                                                    ) : (
                                                        format(dateRange.from, "PPP", { locale: locale === "th" ? th : enUS })
                                                    )
                                                ) : (
                                                    <span>{t("powerHistory.labels.selectDateRange", { defaultValue: "Pick a date" })}</span>
                                                )}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="range"
                                                selected={dateRange}
                                                onSelect={(val) => {
                                                    if (val?.from && val?.to) {
                                                        const days = Math.abs(differenceInDays(val.to, val.from))
                                                        if (days > 31) {
                                                            toast.error(t("powerHistory.validation.rangeExceeded", { defaultValue: "Date range cannot exceed 1 month (31 days)" }))
                                                            return
                                                        }
                                                    }
                                                    setDateRange(val)
                                                }}
                                                locale={locale === "th" ? th : enUS}
                                                disabled={(date) => {
                                                    const today = new Date()
                                                    today.setHours(23, 59, 59, 999)
                                                    return date > today
                                                }}
                                                initialFocus
                                                defaultMonth={dateRange?.from}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    {dateRange?.from && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-10 w-10 shrink-0 text-gray-400 hover:text-gray-600 rounded-lg"
                                            onClick={() => {
                                                setDateRange(undefined)
                                                setLogs([])
                                            }}
                                        >
                                            <X className="h-5 w-5" />
                                        </Button>
                                    )}
                                </div>
                                <Button
                                    size="icon"
                                    onClick={handleExport}
                                    className="h-10 w-10 min-w-10 bg-green-500 hover:bg-green-600 text-white ml-2 rounded-lg header-icon-button"
                                    title={t("powerHistory.labels.exportExcel", { defaultValue: "Export to Excel" })}
                                >
                                    <FileSpreadsheet className="h-5 w-5" />
                                </Button>
                                {loading && <RefreshCcw className="h-4 w-4 animate-spin text-primary ml-2" />}
                            </div>
                        </div>

                        {/* Row 2: Summary Stats (Horizontal - Label Top, Value Bottom, Compact, Centered) */}
                        <div className="flex flex-wrap gap-12 pt-4 pb-2 justify-center border-t border-dashed border-gray-100">
                            <div className="flex flex-col items-center justify-center">
                                <span className="text-sm font-medium text-gray-500">{t("powerHistory.labels.averagePower", { defaultValue: "Average Power" })}</span>
                                <span className="text-base font-bold text-sky-700">{averagePower} W</span>
                            </div>
                            <div className="flex flex-col items-center justify-center">
                                <span className="text-sm font-medium text-gray-500">{t("powerHistory.labels.averageVoltage", { defaultValue: "Average Voltage" })}</span>
                                <span className="text-base font-bold text-sky-700">{averageVoltage} V</span>
                            </div>
                            <div className="flex flex-col items-center justify-center">
                                <span className="text-sm font-medium text-gray-500">{t("powerHistory.labels.averageCurrent", { defaultValue: "Average Current" })}</span>
                                <span className="text-base font-bold text-sky-700">{averageCurrent} mA</span>
                            </div>
                        </div>
                    </div>

                    {/* Table Area */}
                    <div className="flex-1 overflow-y-auto p-4">
                        <div className="rounded-md border bg-white shadow-sm overflow-hidden">
                            <Table>
                                <TableHeader className="bg-gray-50 sticky top-0 z-10">
                                    <TableRow>
                                        <TableHead className="w-[60px] font-bold text-gray-600">#</TableHead>
                                        <TableHead onClick={() => handleSort('date')} className="font-bold text-gray-600 cursor-pointer hover:bg-gray-100"><span className="flex items-center gap-1">{t("powerHistory.table.dateTime", { defaultValue: "Date-Time" })} <ArrowUpDown className="h-4 w-4" /></span></TableHead>
                                        <TableHead onClick={() => handleSort('i')} className="font-bold text-gray-600 cursor-pointer hover:bg-gray-100"><span className="flex items-center gap-1">{t("powerHistory.table.i", { defaultValue: "I (mA)" })} <ArrowUpDown className="h-4 w-4" /></span></TableHead>
                                        <TableHead onClick={() => handleSort('v')} className="font-bold text-gray-600 cursor-pointer hover:bg-gray-100"><span className="flex items-center gap-1">{t("powerHistory.table.v", { defaultValue: "V (V)" })} <ArrowUpDown className="h-4 w-4" /></span></TableHead>
                                        <TableHead onClick={() => handleSort('w')} className="font-bold text-gray-600 cursor-pointer hover:bg-gray-100"><span className="flex items-center gap-1">{t("powerHistory.table.w", { defaultValue: "P (W)" })} <ArrowUpDown className="h-4 w-4" /></span></TableHead>
                                        <TableHead onClick={() => handleSort('pf')} className="font-bold text-gray-600 cursor-pointer hover:bg-gray-100"><span className="flex items-center gap-1">{t("powerHistory.table.pf", { defaultValue: "PF" })} <ArrowUpDown className="h-4 w-4" /></span></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sortedLogs.length > 0 ? (
                                        sortedLogs.map((log, index) => (
                                            <TableRow key={index} className="hover:bg-gray-50 even:bg-white odd:bg-gray-50/30">
                                                <TableCell className="font-medium text-gray-500">{index + 1}</TableCell>
                                                <TableCell className="text-gray-700">{log.date} {log.time}</TableCell>
                                                <TableCell className="text-gray-700">{log.i}</TableCell>
                                                <TableCell className="text-gray-700">{log.v}</TableCell>
                                                <TableCell className="text-gray-700">{log.w}</TableCell>
                                                <TableCell className="text-gray-700">{log.pf}</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                                {loading ? t("loading", { defaultValue: "Loading..." }) : t("powerHistory.status.noData", { defaultValue: "No data found for this period" })}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                        <div className="py-4 text-xs text-gray-500">
                            {t("powerHistory.labels.showing", {
                                start: sortedLogs.length > 0 ? 1 : 0,
                                end: sortedLogs.length,
                                total: sortedLogs.length,
                                defaultValue: `Showing ${sortedLogs.length > 0 ? 1 : 0} to ${sortedLogs.length} of ${sortedLogs.length} entries`
                            })}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
