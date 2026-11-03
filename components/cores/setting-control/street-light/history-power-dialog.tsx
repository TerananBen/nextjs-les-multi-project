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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { FileText, RefreshCcw, ArrowUpDown, FileUp, Calendar as CalendarIcon, X, Zap, Activity, TrendingUp } from "lucide-react"
import { StreetLightLog } from "@/types/street-light"
import { getDataLogStreetLightMongoAction } from "@/app/actions/street-light"
import { toast } from "sonner"
import { DateRange } from "react-day-picker"
import { format, differenceInDays, subDays } from "date-fns"
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
                `"${log.date} ${log.time}"`,
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

    const activePreset = React.useMemo(() => {
        if (!dateRange?.from || !dateRange?.to) return null
        const fromStr = format(dateRange.from, 'yyyy-MM-dd')
        const toStr = format(dateRange.to, 'yyyy-MM-dd')
        const today = new Date()
        const todayStr = format(today, 'yyyy-MM-dd')

        if (fromStr === todayStr && toStr === todayStr) return 'today'
        if (fromStr === format(subDays(today, 6), 'yyyy-MM-dd') && toStr === todayStr) return '7d'
        if (fromStr === format(subDays(today, 29), 'yyyy-MM-dd') && toStr === todayStr) return '30d'
        return null
    }, [dateRange])

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="icon" className="cursor-pointer h-8 w-8 text-muted-foreground hover:text-foreground">
                    <FileText className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            {/* Expanded dialog width to comfortably fit filters on a single row */}
            <DialogContent className="w-[calc(100%-2rem)] sm:w-[calc(100%-3rem)] md:w-[calc(100%-4rem)] sm:max-w-5xl max-h-[calc(100dvh-2.5rem)] sm:max-h-[85vh] overflow-hidden flex flex-col p-0">
                <DialogHeader className="px-5 py-3.5 border-b text-left">
                    <DialogTitle className="text-lg font-semibold flex items-center justify-start gap-2 text-left">
                        <Zap className="h-5 w-5 text-amber-500 shrink-0" />
                        {t("historyPowerTitle", { defaultValue: "History Power" })}
                    </DialogTitle>
                    <div className="text-sm text-muted-foreground text-left">{t("device", { defaultValue: "Device" })}: {imei} {deviceName ? `(${deviceName})` : ''}</div>
                </DialogHeader>

                <div className="flex flex-col flex-1 overflow-hidden bg-muted/20">
                    {/* Controls Bar */}
                    <div className="p-3.5 bg-background border-b space-y-2.5">
                        {/* Filter Toolbar: Full width, balanced layout */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 w-full">
                            {/* Date Picker with integrated Clear button (flex-1) */}
                            <div className="relative w-full sm:flex-1 min-w-0">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={cn(
                                                "cursor-pointer w-full justify-start text-left font-normal bg-background h-9 text-xs sm:text-sm shadow-2xs pr-9",
                                                !dateRange && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground shrink-0" />
                                            {dateRange?.from ? (
                                                dateRange.to ? (
                                                    <span className="truncate">
                                                        {format(dateRange.from, "PPP", { locale: locale === "th" ? th : enUS })} -{" "}
                                                        {format(dateRange.to, "PPP", { locale: locale === "th" ? th : enUS })}
                                                    </span>
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
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setDateRange(undefined)
                                            setLogs([])
                                        }}
                                        className="cursor-pointer absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-sm z-10 transition-colors"
                                        title={locale === "th" ? "ล้างวันที่" : "Clear date"}
                                        aria-label={locale === "th" ? "ล้างวันที่" : "Clear date"}
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>

                            {/* Quick Presets matching Date Input size (flex-1) */}
                            <div className="grid grid-cols-3 w-full sm:flex-1 min-w-0 h-9 rounded-lg border bg-muted/50 p-0.5 text-muted-foreground">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const today = new Date()
                                        setDateRange({ from: today, to: today })
                                    }}
                                    className={cn(
                                        "h-full flex items-center justify-center rounded-md text-xs sm:text-sm font-medium transition-all cursor-pointer",
                                        activePreset === 'today'
                                            ? "bg-background text-foreground shadow-2xs font-semibold"
                                            : "hover:text-foreground"
                                    )}
                                >
                                    {locale === "th" ? "วันนี้" : "Today"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const today = new Date()
                                        setDateRange({ from: subDays(today, 6), to: today })
                                    }}
                                    className={cn(
                                        "h-full flex items-center justify-center rounded-md text-xs sm:text-sm font-medium transition-all cursor-pointer",
                                        activePreset === '7d'
                                            ? "bg-background text-foreground shadow-2xs font-semibold"
                                            : "hover:text-foreground"
                                    )}
                                >
                                    {locale === "th" ? "7 วัน" : "7 Days"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const today = new Date()
                                        setDateRange({ from: subDays(today, 29), to: today })
                                    }}
                                    className={cn(
                                        "h-full flex items-center justify-center rounded-md text-xs sm:text-sm font-medium transition-all cursor-pointer",
                                        activePreset === '30d'
                                            ? "bg-background text-foreground shadow-2xs font-semibold"
                                            : "hover:text-foreground"
                                    )}
                                >
                                    {locale === "th" ? "30 วัน" : "30 Days"}
                                </button>
                            </div>

                            {/* Actions: Export Excel, Loading, Badge */}
                            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start shrink-0">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleExport}
                                    disabled={loading || logs.length === 0}
                                    className="h-9 px-4 gap-2 cursor-pointer shadow-2xs flex-1 sm:flex-none justify-center font-medium"
                                    title={t("exportAllExcel", { defaultValue: "Export to Excel" })}
                                >
                                    <FileUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                    <span className="text-sm font-medium">{t("exportAllExcel", { defaultValue: "Export to Excel" })}</span>
                                </Button>

                                {loading && <RefreshCcw className="h-4 w-4 animate-spin text-primary shrink-0" />}

                                {/* Record Count Badge */}
                                {logs.length > 0 && (
                                    <div className="text-xs font-mono text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-md border shrink-0">
                                        {sortedLogs.length} {locale === "th" ? "รายการ" : "records"}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Row 2: Summary Stats */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t">
                            <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-muted/80 border border-border shadow-2xs">
                                <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                    <Zap className="h-3.5 w-3.5 text-amber-500" />
                                    {t("powerHistory.labels.averagePower", { defaultValue: "Average Power" })}
                                </span>
                                <span className="text-lg font-bold font-mono text-foreground mt-1">
                                    {averagePower} <span className="text-xs font-normal text-muted-foreground">W</span>
                                </span>
                            </div>
                            <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-muted/80 border border-border shadow-2xs">
                                <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                    <Activity className="h-3.5 w-3.5 text-sky-500" />
                                    {t("powerHistory.labels.averageVoltage", { defaultValue: "Average Voltage" })}
                                </span>
                                <span className="text-lg font-bold font-mono text-foreground mt-1">
                                    {averageVoltage} <span className="text-xs font-normal text-muted-foreground">V</span>
                                </span>
                            </div>
                            <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-muted/80 border border-border shadow-2xs">
                                <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                    <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                                    {t("powerHistory.labels.averageCurrent", { defaultValue: "Average Current" })}
                                </span>
                                <span className="text-lg font-bold font-mono text-foreground mt-1">
                                    {averageCurrent} <span className="text-xs font-normal text-muted-foreground">mA</span>
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Table Area */}
                    <div className="flex-1 overflow-y-auto p-4">
                        <div className="rounded-md border bg-background shadow-xs overflow-hidden">
                            <Table>
                                <TableHeader className="bg-muted/50 sticky top-0 z-10 shadow-xs">
                                    <TableRow>
                                        <TableHead className="w-[60px] font-semibold text-sm">#</TableHead>
                                        <TableHead onClick={() => handleSort('date')} className="font-semibold text-sm cursor-pointer select-none">
                                            <span className="flex items-center gap-1">{t("powerHistory.table.dateTime", { defaultValue: "Date-Time" })} <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" /></span>
                                        </TableHead>
                                        <TableHead onClick={() => handleSort('i')} className="font-semibold text-sm cursor-pointer select-none">
                                            <span className="flex items-center gap-1">{t("powerHistory.table.i", { defaultValue: "I (mA)" })} <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" /></span>
                                        </TableHead>
                                        <TableHead onClick={() => handleSort('v')} className="font-semibold text-sm cursor-pointer select-none">
                                            <span className="flex items-center gap-1">{t("powerHistory.table.v", { defaultValue: "V (V)" })} <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" /></span>
                                        </TableHead>
                                        <TableHead onClick={() => handleSort('w')} className="font-semibold text-sm cursor-pointer select-none">
                                            <span className="flex items-center gap-1">{t("powerHistory.table.w", { defaultValue: "P (W)" })} <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" /></span>
                                        </TableHead>
                                        <TableHead onClick={() => handleSort('pf')} className="font-semibold text-sm cursor-pointer select-none">
                                            <span className="flex items-center gap-1">{t("powerHistory.table.pf", { defaultValue: "PF" })} <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" /></span>
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sortedLogs.length > 0 ? (
                                        sortedLogs.map((log, index) => (
                                            <TableRow key={log.ts || index}>
                                                <TableCell className="font-mono text-sm text-muted-foreground">{index + 1}</TableCell>
                                                <TableCell className="text-sm">{log.date} {log.time}</TableCell>
                                                <TableCell className="font-mono text-sm text-foreground">{log.i}</TableCell>
                                                <TableCell className="font-mono text-sm text-foreground">{log.v}</TableCell>
                                                <TableCell className="font-mono text-sm text-foreground">{log.w}</TableCell>
                                                <TableCell className="font-mono text-sm text-foreground">{log.pf}</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-24 text-center text-muted-foreground text-sm">
                                                {loading ? t("loading", { defaultValue: "Loading..." }) : t("powerHistory.status.noData", { defaultValue: "No data found for this period" })}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                        <div className="py-3 text-sm text-muted-foreground">
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
