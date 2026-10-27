"use client"

import { useTranslations } from "next-intl"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LatLongData } from "@/app/actions/map-actions"
import { isValidGPS } from "./map-utils"
import { useMemo } from "react"
import { Filter, Hash, MapPin, Zap, WifiOff, Map as MapIcon, Globe, ShieldAlert } from "lucide-react"
import {
    Combobox,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
} from "@/components/ui/combobox"
import { Separator } from "@/components/ui/separator"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface FilterSidebarProps {
    searchType: "group" | "imsi" | "street_light_name"
    setSearchType: (val: "group" | "imsi" | "street_light_name") => void
    searchValue: string
    setSearchValue: (val: string) => void
    statusFilter: string
    setStatusFilter: (val: string) => void
    dataOptions: string[] | { groupCode: string, groupName: string }[]
    devices: LatLongData[]
}

export default function FilterSidebar({
    searchType,
    setSearchType,
    searchValue,
    setSearchValue,
    statusFilter,
    setStatusFilter,
    dataOptions,
    devices
}: FilterSidebarProps) {
    const t = useTranslations("MapGlobal")

    const counts = useMemo(() => {
        const total = devices.length
        const normal = devices.filter(d => d.status !== "4" && d.status !== "5").length
        const powerFail = devices.filter(d => d.status === "4").length
        const commFail = devices.filter(d => d.status === "5").length
        const withGps = devices.filter(d => isValidGPS(d.lat, d.lng)).length
        const noGps = total - withGps

        return { total, normal, powerFail, commFail, withGps, noGps }
    }, [devices])

    const handleChipClick = (targetStatus: string) => {
        const nextStatus = statusFilter === targetStatus ? "all" : targetStatus
        setStatusFilter(nextStatus)
    }

    return (
        <div className="flex flex-col gap-2 w-full relative z-10 px-0 pb-0 shrink-0">
            {/* Main Filter Toolbar */}
            <Card className="p-2.5 shadow-2xs border-border bg-card">
                <div className="flex flex-col gap-2.5 w-full">
                    {/* Search Row */}
                    <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center w-full">
                        {/* Search Type Selector */}
                        <div className="w-full sm:w-[180px] shrink-0">
                            <Select
                                value={searchType}
                                onValueChange={(val: "group" | "imsi" | "street_light_name") => {
                                    setSearchType(val)
                                    setSearchValue("ALL")
                                }}
                            >
                                <SelectTrigger className="cursor-pointer h-9 w-full bg-background border-input text-sm font-medium">
                                    <div className="flex items-center truncate">
                                        <SelectValue />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="z-[9999]">
                                    <SelectItem className="cursor-pointer" value="group">
                                        <div className="flex items-center gap-2"><Filter className="h-4 w-4 opacity-70" /><span>{t("filters.group")}</span></div>
                                    </SelectItem>
                                    <SelectItem className="cursor-pointer" value="imsi">
                                        <div className="flex items-center gap-2"><Hash className="h-4 w-4 opacity-70" /><span>{t("filters.imsi")}</span></div>
                                    </SelectItem>
                                    <SelectItem className="cursor-pointer" value="street_light_name">
                                        <div className="flex items-center gap-2"><MapPin className="h-4 w-4 opacity-70" /><span>{t("filters.streetLightName")}</span></div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Search Input (Combobox) */}
                        <div className="w-full sm:flex-1 min-w-0 relative z-[50]">
                            <Combobox value={searchValue} onValueChange={setSearchValue}>
                                <ComboboxInput
                                    placeholder={t("filters.all")}
                                    className="cursor-pointer h-9 bg-background border-input w-full text-sm"
                                />
                                <ComboboxContent className="z-[9999]" searchPlaceholder={t("filters.search")}>
                                    <ComboboxEmpty>{t("filters.noResult")}</ComboboxEmpty>
                                    <ComboboxList>
                                        <ComboboxItem value="ALL">
                                            <span className="font-medium text-primary">{t("filters.all")}</span>
                                        </ComboboxItem>
                                        {dataOptions.map((opt, idx) => {
                                            const val = typeof opt === 'string' ? opt : opt.groupName
                                            const label = typeof opt === 'string' ? opt : opt.groupName
                                            return (
                                                <ComboboxItem key={idx} value={val}>
                                                    {label}
                                                </ComboboxItem>
                                            )
                                        })}
                                    </ComboboxList>
                                </ComboboxContent>
                            </Combobox>
                        </div>
                    </div>

                    <Separator className="bg-border/60" />

                    {/* KPI / Status Summary Bar */}
                    <div className="flex flex-wrap items-center gap-2">
                        <StatusChip
                            label={t("status.all")}
                            count={counts.total}
                            icon={<Globe className="h-4 w-4" />}
                            isActive={statusFilter === "all"}
                            onClick={() => handleChipClick("all")}
                        />
                        <StatusChip
                            label={t("status.normal")}
                            count={counts.normal}
                            icon={<Zap className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
                            isActive={statusFilter === "3"}
                            variant="normal"
                            onClick={() => handleChipClick("3")}
                        />
                        <StatusChip
                            label={t("status.powerFailure")}
                            count={counts.powerFail}
                            icon={<ShieldAlert className="h-4 w-4 text-destructive" />}
                            isActive={statusFilter === "4"}
                            variant="powerFailure"
                            onClick={() => handleChipClick("4")}
                        />
                        <StatusChip
                            label={t("status.commFailure")}
                            count={counts.commFail}
                            icon={<WifiOff className="h-4 w-4 text-amber-600 dark:text-amber-400" />}
                            isActive={statusFilter === "5"}
                            variant="commFailure"
                            onClick={() => handleChipClick("5")}
                        />

                        {/* GPS Diagnostic Chips (Informational) */}
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-muted/40 border border-border/50 text-sm font-medium text-muted-foreground">
                            <MapIcon className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0" />
                            <span className="truncate">{t("status.withGps")}</span>
                            <span className="font-bold text-foreground tabular-nums text-sm ml-0.5 shrink-0">{counts.withGps}</span>
                        </div>
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-muted/40 border border-border/50 text-sm font-medium text-muted-foreground">
                            <MapIcon className="h-4 w-4 opacity-40 shrink-0" />
                            <span className="truncate">{t("status.noGps")}</span>
                            <span className="font-bold text-foreground tabular-nums text-sm ml-0.5 shrink-0">{counts.noGps}</span>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    )
}

interface StatusChipProps {
    label: string
    count: number
    icon?: React.ReactNode
    isActive?: boolean
    variant?: "default" | "normal" | "powerFailure" | "commFailure"
    onClick?: () => void
}

function StatusChip({
    label,
    count,
    icon,
    isActive,
    variant = "default",
    onClick
}: StatusChipProps) {
    const variantStyles = {
        default: isActive
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-background border-border text-foreground hover:bg-muted/60",
        normal: isActive
            ? "bg-emerald-600 text-white border-emerald-600"
            : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20",
        powerFailure: isActive
            ? "bg-destructive text-destructive-foreground border-destructive"
            : "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20",
        commFailure: isActive
            ? "bg-amber-600 text-white border-amber-600"
            : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20",
    }

    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "cursor-pointer inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border text-sm font-medium transition-all",
                "focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring",
                variantStyles[variant],
                isActive && "shadow-2xs font-semibold ring-1 ring-ring/30"
            )}
        >
            {icon}
            <span className="truncate">{label}</span>
            <span className={cn(
                "font-bold tabular-nums text-sm ml-0.5",
                isActive ? "opacity-100" : "opacity-90"
            )}>
                {count}
            </span>
        </button>
    )
}
