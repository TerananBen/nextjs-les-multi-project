"use client"

import * as React from "react"
import { useTranslations, useLocale } from "next-intl"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { DataTable } from "./data-table"
import { useMaintenanceColumns } from "./columns"
import { DetailDialog } from "@/components/cores/maintenance/detail/detail-dialog"
import { Search, RotateCcw, AlertCircle, Clock, CheckCircle2, Lightbulb, CalendarIcon, X, ShieldAlert } from "lucide-react"
import { usePermission } from "@/components/providers/permission-provider"
import { format } from "date-fns"
import { th, enUS } from "date-fns/locale"
import { DateRange } from "react-day-picker"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

import {
    OperatorAndAdminData,
    MaintenanceDashboardData,
    getDataListAllMaintenanceDashboard
} from "@/app/actions/maintenance"

interface ClientProps {
    initialUsersData: OperatorAndAdminData | null
    defaultLat?: string
    defaultLng?: string
    defaultZoom?: string
    iconScale?: string
    mapMode?: "offline" | "online"
    mapOfflineUrl?: string
    googleMapsApiKey?: string
}

export default function MaintenanceDashboardClient({
    initialUsersData,
    defaultLat,
    defaultLng,
    defaultZoom,
    iconScale,
    mapMode,
    mapOfflineUrl,
    googleMapsApiKey
}: ClientProps) {
    const t = useTranslations("MaintenanceDashboard")
    const locale = useLocale()
    const dateLocale = locale === "th" ? th : enUS

    const { getPermission, permissions } = usePermission()

    const perm = React.useMemo(() => {
        if (!permissions.length) return { readable: true, writable: true, control: true }
        return getPermission("maintenance_dashboard")
    }, [getPermission, permissions])

    const isReadable = perm.readable
    const canWrite = perm.writable
    const canControl = perm.control

    const [selectedDetailId, setSelectedDetailId] = React.useState<string | null>(null)
    const columns = useMaintenanceColumns(setSelectedDetailId)

    const [dateRange, setDateRange] = React.useState<DateRange | undefined>(undefined)
    const [technician, setTechnician] = React.useState("ALL")
    const [supervisor, setSupervisor] = React.useState("ALL")
    const [searchQuery, setSearchQuery] = React.useState("")
    const [data, setData] = React.useState<MaintenanceDashboardData | null>(null)
    const [isLoading, setIsLoading] = React.useState(false)

    const executeFetch = React.useCallback(async (
        range: DateRange | undefined,
        tech: string,
        sup: string
    ) => {
        setIsLoading(true)
        try {
            let formattedStart = "ALL"
            let formattedEnd = "ALL"

            if (range?.from) {
                formattedStart = format(range.from, "dd-MM-yyyy")
                formattedEnd = range.to ? format(range.to, "dd-MM-yyyy") : formattedStart
            }

            const result = await getDataListAllMaintenanceDashboard({
                id_admin: sup,
                id_operator: tech,
                date_start: formattedStart,
                date_end: formattedEnd
            })
            setData(result)
        } catch (error) {
            console.error("Failed to load maintenance dashboard data:", error)
        } finally {
            setIsLoading(false)
        }
    }, [])

    // Fetch on mount and filter changes
    React.useEffect(() => {
        executeFetch(dateRange, technician, supervisor)
    }, [executeFetch, dateRange, technician, supervisor])

    const handleReset = () => {
        setDateRange(undefined)
        setTechnician("ALL")
        setSupervisor("ALL")
        setSearchQuery("")
    }

    const isFiltered = Boolean(dateRange?.from || technician !== "ALL" || supervisor !== "ALL" || searchQuery.trim())

    // Filter table records by search query
    const filteredRecords = React.useMemo(() => {
        const list = data?.list_imsi_all || []
        if (!searchQuery.trim()) return list

        const q = searchQuery.toLowerCase().trim()
        return list.filter((item) =>
            (item.name_operator && item.name_operator.toLowerCase().includes(q)) ||
            (item.name_admin && item.name_admin.toLowerCase().includes(q)) ||
            (item.list_name && item.list_name.toLowerCase().includes(q)) ||
            (item.detail && item.detail.toLowerCase().includes(q))
        )
    }, [data?.list_imsi_all, searchQuery])

    // Calculations for KPI Summary Cards
    const totalLamp = parseInt(data?.total_lamp || "0", 10)
    const totalWaste = parseInt(data?.total_lamp_waste || "0", 10)
    const totalPending = parseInt(data?.total_wait_repair || "0", 10)
    const totalRepaired = parseInt(data?.total_repair_all || "0", 10)

    const wasteRatio = totalLamp > 0 ? ((totalWaste / totalLamp) * 100).toFixed(1) : "0"
    const completionRate = totalWaste > 0 ? Math.round((totalRepaired / totalWaste) * 100) : 0

    if (!isReadable) {
        return (
            <div className="flex flex-1 flex-col items-center justify-center min-h-[400px] gap-3 text-muted-foreground">
                <ShieldAlert className="h-12 w-12 text-muted-foreground/60" />
                <p className="text-base font-medium">{t("noAccess", { defaultMessage: "คุณไม่มีสิทธิ์ในการเข้าถึงหน้านี้" })}</p>
            </div>
        )
    }

    return (
        <div className="flex flex-1 flex-col gap-3 w-full h-full">
            {/* Compact Filter Controls Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 p-2 rounded-lg border bg-card text-card-foreground shadow-2xs">
                {/* 1. Date Range Selector */}
                <div className="w-full sm:w-[230px]">
                    <div className="relative">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={cn(
                                        "h-9 text-sm w-full justify-start text-left font-normal bg-background cursor-pointer shadow-2xs pr-7",
                                        !dateRange?.from && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                                    {dateRange?.from ? (
                                        dateRange.to ? (
                                            <span className="truncate">
                                                {format(dateRange.from, "d MMM yyyy", { locale: dateLocale })} - {format(dateRange.to, "d MMM yyyy", { locale: dateLocale })}
                                            </span>
                                        ) : (
                                            <span>{format(dateRange.from, "d MMM yyyy", { locale: dateLocale })}</span>
                                        )
                                    ) : (
                                        <span>{t("filter.selectDateRange")}</span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="range"
                                    selected={dateRange}
                                    onSelect={setDateRange}
                                    numberOfMonths={2}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                        {dateRange?.from && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setDateRange(undefined)
                                }}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* 2. Technician Selector */}
                <div className="w-full sm:w-[170px]">
                    <Select value={technician} onValueChange={setTechnician}>
                        <SelectTrigger className="h-9 text-sm w-full bg-background cursor-pointer shadow-2xs">
                            <SelectValue placeholder={t("filter.technician")} />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                            <SelectItem value="ALL" className="cursor-pointer text-sm">
                                {t("filter.allTechnicians")}
                            </SelectItem>
                            {initialUsersData?.name_operator?.map((op) => (
                                <SelectItem key={op.id} value={op.id} className="cursor-pointer text-sm">
                                    {op.full_name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* 3. Supervisor Selector */}
                <div className="w-full sm:w-[170px]">
                    <Select value={supervisor} onValueChange={setSupervisor}>
                        <SelectTrigger className="h-9 text-sm w-full bg-background cursor-pointer shadow-2xs">
                            <SelectValue placeholder={t("filter.supervisor")} />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                            <SelectItem value="ALL" className="cursor-pointer text-sm">
                                {t("filter.allSupervisors")}
                            </SelectItem>
                            {initialUsersData?.name_admin?.map((ad) => (
                                <SelectItem key={ad.id} value={ad.id} className="cursor-pointer text-sm">
                                    {ad.full_name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* 4. Search Input & Actions */}
                <div className="flex items-center gap-2 flex-1 min-w-0 w-full sm:w-auto">
                    <div className="relative flex-1 min-w-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                            placeholder={t("filter.searchPlaceholder")}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 pr-9 h-9 text-sm bg-background w-full shadow-2xs"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full">
                {/* Card 1: Total Lamps */}
                <div className="flex items-center gap-3.5 p-3.5 rounded-xl border border-border/80 bg-muted/40 shadow-2xs">
                    <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">
                        <Lightbulb className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs text-muted-foreground font-medium truncate">{t("summary.totalLamps")}</p>
                        {isLoading ? (
                            <Skeleton className="h-7 w-20 mt-1" />
                        ) : (
                            <div className="flex items-baseline gap-1 mt-0.5">
                                <span className="text-xl font-bold tracking-tight text-foreground tabular-nums">
                                    {totalLamp.toLocaleString()}
                                </span>
                                <span className="text-xs text-muted-foreground font-normal">{t("summary.lampsUnit")}</span>
                            </div>
                        )}
                        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{t("summary.inProject")}</p>
                    </div>
                </div>

                {/* Card 2: Reported Waste */}
                <div className="flex items-center gap-3.5 p-3.5 rounded-xl border border-border/80 bg-muted/40 shadow-2xs">
                    <div className="p-2.5 rounded-lg bg-destructive/10 text-destructive shrink-0">
                        <AlertCircle className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs text-muted-foreground font-medium truncate">{t("summary.reported")}</p>
                        {isLoading ? (
                            <Skeleton className="h-7 w-16 mt-1" />
                        ) : (
                            <div className="flex items-baseline gap-1 mt-0.5">
                                <span className={cn(
                                    "text-xl font-bold tracking-tight tabular-nums",
                                    totalWaste > 0 ? "text-destructive" : "text-foreground"
                                )}>
                                    {totalWaste.toLocaleString()}
                                </span>
                                <span className="text-xs text-muted-foreground font-normal">{t("summary.lampsUnit")}</span>
                            </div>
                        )}
                        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                            {t("summary.wasteRatio", { ratio: wasteRatio })}
                        </p>
                    </div>
                </div>

                {/* Card 3: Pending Repair */}
                <div className="flex items-center gap-3.5 p-3.5 rounded-xl border border-border/80 bg-muted/40 shadow-2xs">
                    <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                        <Clock className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs text-muted-foreground font-medium truncate">{t("summary.pending")}</p>
                        {isLoading ? (
                            <Skeleton className="h-7 w-16 mt-1" />
                        ) : (
                            <div className="flex items-baseline gap-1 mt-0.5">
                                <span className={cn(
                                    "text-xl font-bold tracking-tight tabular-nums",
                                    totalPending > 0 ? "text-amber-600 dark:text-amber-400" : "text-foreground"
                                )}>
                                    {totalPending.toLocaleString()}
                                </span>
                                <span className="text-xs text-muted-foreground font-normal">{t("summary.lampsUnit")}</span>
                            </div>
                        )}
                        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{t("summary.remaining")}</p>
                    </div>
                </div>

                {/* Card 4: Repaired */}
                <div className="flex items-center gap-3.5 p-3.5 rounded-xl border border-border/80 bg-muted/40 shadow-2xs">
                    <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                        <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs text-muted-foreground font-medium truncate">{t("summary.repaired")}</p>
                        {isLoading ? (
                            <Skeleton className="h-7 w-16 mt-1" />
                        ) : (
                            <div className="flex items-baseline gap-1 mt-0.5">
                                <span className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">
                                    {totalRepaired.toLocaleString()}
                                </span>
                                <span className="text-xs text-muted-foreground font-normal">{t("summary.lampsUnit")}</span>
                            </div>
                        )}
                        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                            {t("summary.completionRate", { rate: completionRate })}
                        </p>
                    </div>
                </div>
            </div>

            {/* Data Table */}
            <DataTable
                columns={columns}
                data={filteredRecords}
                loading={isLoading}
            />

            {/* Detail Modal */}
            <DetailDialog
                detailId={selectedDetailId}
                defaultLat={defaultLat}
                defaultLng={defaultLng}
                defaultZoom={defaultZoom}
                iconScale={iconScale}
                mapMode={mapMode}
                mapOfflineUrl={mapOfflineUrl}
                googleMapsApiKey={googleMapsApiKey}
                canWrite={canWrite}
                canControl={canControl}
                onClose={() => setSelectedDetailId(null)}
            />
        </div>
    )
}
