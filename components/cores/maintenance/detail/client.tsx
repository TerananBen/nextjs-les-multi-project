"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { MaintenanceDetailListRecord } from "@/app/actions/maintenance"
import { useMaintenanceDetailColumns } from "./columns"
import { DataTable } from "./data-table"
import { DetailDialog } from "./detail-dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, RotateCcw, X, Wrench, Lightbulb, CheckCircle2, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

interface MaintenanceDetailClientProps {
    initialData: MaintenanceDetailListRecord[]
    mapMode?: "online" | "offline"
    mapOfflineUrl?: string
    defaultLat?: string
    defaultLng?: string
    defaultZoom?: string
    iconScale: string
    googleMapsApiKey?: string
}

export function MaintenanceDetailClient({
    initialData,
    mapMode,
    mapOfflineUrl,
    defaultLat,
    defaultLng,
    defaultZoom,
    iconScale,
    googleMapsApiKey
}: MaintenanceDetailClientProps) {
    const t = useTranslations("MaintenanceDetail")
    const [selectedDetailId, setSelectedDetailId] = React.useState<string | null>(null)
    const columns = useMaintenanceDetailColumns(setSelectedDetailId)

    const [data] = React.useState<MaintenanceDetailListRecord[]>(initialData)

    // Filter States
    const [searchQuery, setSearchQuery] = React.useState("")
    const [statusFilter, setStatusFilter] = React.useState<string>("ALL")
    const [operatorFilter, setOperatorFilter] = React.useState<string>("ALL")

    // Unique operators for dropdown filter
    const operatorOptions = React.useMemo(() => {
        return Array.from(new Set(data.map(item => item.name_operator).filter(Boolean)))
    }, [data])

    // KPI Summary Calculation
    const kpiSummary = React.useMemo(() => {
        const totalLists = data.length
        const totalLamps = data.reduce((acc, item) => acc + parseInt(item.count_lamp_all || "0", 10), 0)
        const repairedLamps = data.reduce((acc, item) => acc + parseInt(item.repair_all || "0", 10), 0)
        const pendingLamps = data.reduce((acc, item) => acc + parseInt(item.wait_repair || "0", 10), 0)
        return { totalLists, totalLamps, repairedLamps, pendingLamps }
    }, [data])

    // Filtered data for table
    const filteredData = React.useMemo(() => {
        return data.filter(item => {
            if (statusFilter === "CONFIRMED") {
                const isConfirmed = item.confrime === "T" || item.confrime === "1" || item.confrime?.toLowerCase() === "true"
                if (!isConfirmed) return false
            } else if (statusFilter === "PENDING") {
                const isConfirmed = item.confrime === "T" || item.confrime === "1" || item.confrime?.toLowerCase() === "true"
                if (isConfirmed) return false
            }

            if (operatorFilter !== "ALL") {
                if (item.name_operator !== operatorFilter) return false
            }

            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase().trim()
                const matchesName = (item.list_name || "").toLowerCase().includes(query)
                const matchesOperator = (item.name_operator || "").toLowerCase().includes(query)
                if (!matchesName && !matchesOperator) return false
            }

            return true
        })
    }, [data, statusFilter, operatorFilter, searchQuery])

    const isFiltered = searchQuery !== "" || statusFilter !== "ALL" || operatorFilter !== "ALL"

    const handleResetFilters = () => {
        setSearchQuery("")
        setStatusFilter("ALL")
        setOperatorFilter("ALL")
    }

    return (
        <div className="flex flex-1 flex-col gap-3 w-full h-full">
            {/* 1. Compact Filter Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 p-2 rounded-lg border bg-card text-card-foreground shadow-2xs">
                {/* Status Filter */}
                <div className="w-full sm:w-[170px]">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="h-9 text-sm w-full bg-background cursor-pointer">
                            <SelectValue placeholder={t("filter.statusAll")} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL" className="cursor-pointer text-sm">{t("filter.statusAll")}</SelectItem>
                            <SelectItem value="CONFIRMED" className="cursor-pointer text-sm">{t("filter.statusConfirmed")}</SelectItem>
                            <SelectItem value="PENDING" className="cursor-pointer text-sm">{t("filter.statusPending")}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Operator Filter */}
                <div className="w-full sm:w-[170px]">
                    <Select value={operatorFilter} onValueChange={setOperatorFilter}>
                        <SelectTrigger className="h-9 text-sm w-full bg-background cursor-pointer">
                            <SelectValue placeholder={t("filter.operatorAll")} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL" className="cursor-pointer text-sm">{t("filter.operatorAll")}</SelectItem>
                            {operatorOptions.map(op => (
                                <SelectItem key={op} value={op} className="cursor-pointer text-sm">{op}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Search & Actions Row */}
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

            {/* 2. KPI Summary Cards (Placed directly under Compact Filter Toolbar) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full">
                {/* Card 1: Total Lists */}
                <button
                    type="button"
                    onClick={() => setStatusFilter("ALL")}
                    className={cn(
                        "flex items-center gap-3.5 p-3.5 rounded-xl border transition-all text-left cursor-pointer shadow-2xs",
                        statusFilter === "ALL" && isFiltered
                            ? "border-primary/50 bg-primary/10 ring-1 ring-primary/30"
                            : "border-border/80 bg-muted/40 hover:bg-muted/70"
                    )}
                >
                    <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">
                        <Wrench className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs text-muted-foreground font-medium truncate">{t("kpi.totalLists")}</p>
                        <div className="flex items-baseline gap-1.5">
                            <p className="text-xl font-bold tracking-tight text-foreground">{kpiSummary.totalLists}</p>
                            <span className="text-xs text-muted-foreground">{t("kpi.listsUnit")}</span>
                        </div>
                    </div>
                </button>

                {/* Card 2: Total Lamps */}
                <div className="flex items-center gap-3.5 p-3.5 rounded-xl border border-border/80 bg-muted/40 shadow-2xs">
                    <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                        <Lightbulb className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs text-muted-foreground font-medium truncate">{t("kpi.totalLamps")}</p>
                        <div className="flex items-baseline gap-1.5">
                            <p className="text-xl font-bold tracking-tight text-foreground">{kpiSummary.totalLamps}</p>
                            <span className="text-xs text-muted-foreground">{t("kpi.lampsUnit")}</span>
                        </div>
                    </div>
                </div>

                {/* Card 3: Repaired Lamps */}
                <button
                    type="button"
                    onClick={() => setStatusFilter(prev => prev === "CONFIRMED" ? "ALL" : "CONFIRMED")}
                    className={cn(
                        "flex items-center gap-3.5 p-3.5 rounded-xl border transition-all text-left cursor-pointer shadow-2xs",
                        statusFilter === "CONFIRMED"
                            ? "border-emerald-500/50 bg-emerald-500/10 ring-1 ring-emerald-500/30"
                            : "border-border/80 bg-muted/40 hover:bg-muted/70"
                    )}
                >
                    <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                        <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs text-muted-foreground font-medium truncate">{t("kpi.repairedLamps")}</p>
                        <div className="flex items-baseline gap-1.5">
                            <p className="text-xl font-bold tracking-tight text-foreground">{kpiSummary.repairedLamps}</p>
                            <span className="text-xs text-muted-foreground">{t("kpi.lampsUnit")}</span>
                        </div>
                    </div>
                </button>

                {/* Card 4: Pending Lamps */}
                <button
                    type="button"
                    onClick={() => setStatusFilter(prev => prev === "PENDING" ? "ALL" : "PENDING")}
                    className={cn(
                        "flex items-center gap-3.5 p-3.5 rounded-xl border transition-all text-left cursor-pointer shadow-2xs",
                        statusFilter === "PENDING"
                            ? "border-amber-500/50 bg-amber-500/10 ring-1 ring-amber-500/30"
                            : "border-border/80 bg-muted/40 hover:bg-muted/70"
                    )}
                >
                    <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                        <Clock className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs text-muted-foreground font-medium truncate">{t("kpi.pendingLamps")}</p>
                        <div className="flex items-baseline gap-1.5">
                            <p className="text-xl font-bold tracking-tight text-foreground">{kpiSummary.pendingLamps}</p>
                            <span className="text-xs text-muted-foreground">{t("kpi.lampsUnit")}</span>
                        </div>
                    </div>
                </button>
            </div>

            {/* 3. Data Table */}
            <div className="flex-1 min-h-[420px]">
                <DataTable columns={columns} data={filteredData} />
            </div>

            {/* Detail Dialog */}
            <DetailDialog
                mapMode={mapMode}
                mapOfflineUrl={mapOfflineUrl}
                defaultLat={defaultLat || "0"}
                defaultLng={defaultLng || "0"}
                defaultZoom={defaultZoom || "13"}
                iconScale={iconScale || "1"}
                googleMapsApiKey={googleMapsApiKey}
                detailId={selectedDetailId}
                onClose={() => setSelectedDetailId(null)}
            />
        </div>
    )
}
