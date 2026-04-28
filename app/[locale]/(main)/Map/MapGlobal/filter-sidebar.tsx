"use client"

import { useTranslations } from "next-intl"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { LatLongData } from "@/app/actions/map-actions"
import { isValidGPS } from "./map-utils"
import { useMemo } from "react"
import { Search, Filter, Hash, MapPin, Activity, Zap, WifiOff, Map as MapIcon, Globe, ShieldAlert } from "lucide-react"
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

interface FilterSidebarProps {
    searchType: "group" | "imsi" | "street_light_name"
    setSearchType: (val: "group" | "imsi" | "street_light_name") => void
    searchValue: string
    setSearchValue: (val: string) => void
    statusFilter: string
    setStatusFilter: (val: string) => void
    onSearch: () => void
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
    onSearch,
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


    return (
        <div className="flex flex-col gap-3 w-full relative z-10 px-0 pb-0">
            {/* Main Filter Toolbar */}
            <Card className="p-2 shadow-sm border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="flex flex-col xl:flex-row gap-3 justify-between items-start xl:items-center w-full">

                    {/* Search Section */}
                    <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto flex-1 items-stretch md:items-center">

                        {/* Search Criteria Group */}
                        <div className="flex flex-col md:flex-row w-full md:flex-1 gap-2 items-center bg-muted/30 p-1 rounded-xl">
                            {/* Type Selector */}
                            <div className="w-full md:w-auto shrink-0">
                                <Select value={searchType} onValueChange={(val: "group" | "imsi" | "street_light_name") => setSearchType(val)}>
                                    <SelectTrigger className="cursor-pointer h-9 w-full rounded-xl bg-white border-gray-200 shadow-sm text-sm font-medium">
                                        <div className="flex items-center">
                                            <SelectValue />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent className="z-[9999]">
                                        <SelectItem className="cursor-pointer" value="group"><div className="flex items-center"><Filter className="mr-2 h-4 w-4 opacity-70" />{t("filters.group")}</div></SelectItem>
                                        <SelectItem className="cursor-pointer" value="imsi"><div className="flex items-center"><Hash className="mr-2 h-4 w-4 opacity-70" />{t("filters.imsi")}</div></SelectItem>
                                        <SelectItem className="cursor-pointer" value="street_light_name"><div className="flex items-center"><MapPin className="mr-2 h-4 w-4 opacity-70" />{t("filters.streetLightName")}</div></SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <Separator orientation="vertical" className="h-6 hidden md:block" />

                            {/* Search Input (Combobox) */}
                            <div className="w-full md:w-auto flex-1 min-w-0 relative z-[50]">
                                <Combobox value={searchValue} onValueChange={setSearchValue}>
                                    <ComboboxInput
                                        placeholder={t("filters.all")}
                                        className="cursor-pointer h-9 rounded-xl bg-white border-gray-200 shadow-sm"
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

                        {/* Status Filter */}
                        <div className="w-full md:w-[240px]">
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="cursor-pointer h-12 md:h-12 w-full rounded-xl bg-white dark:bg-muted border-gray-200 dark:border-border shadow-sm text-sm">
                                    <div className="flex items-center">
                                        <Activity className="h-4 w-2 mr-2 text-muted-foreground" />
                                        <SelectValue />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="z-[9999]">
                                    <SelectItem className="cursor-pointer" value="all">{t("status.all")}</SelectItem>
                                    <SelectItem className="cursor-pointer" value="3">{t("status.normal")}</SelectItem>
                                    <SelectItem className="cursor-pointer" value="4">{t("status.powerFailure")}</SelectItem>
                                    <SelectItem className="cursor-pointer" value="5">{t("status.commFailure")}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Search Button */}
                        <Button size="sm" onClick={onSearch} className="cursor-pointer h-9 w-full md:w-12 rounded-xl p-0 ml-0 md:ml-4 shadow-md transition-all hover:shadow-lg hover:scale-[1.02] shrink-0">
                            <Search className="h-4 w-5" />
                        </Button>
                    </div>
                </div>

                <Separator className="my-2 bg-border/50" />

                {/* Status Summary & Chips - Designed as Stats Bar */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:flex lg:flex-wrap gap-2 items-stretch">
                    {/* Main Stats */}
                    <StatusBadge
                        label={t("status.all")}
                        count={counts.total}
                        icon={<Globe className="h-3.5 w-3.5" />}
                        className="bg-background border-border text-foreground hover:bg-muted/50"
                    />
                    <StatusBadge
                        label={t("status.normal")}
                        count={counts.normal}
                        icon={<Zap className="h-3.5 w-3.5" />}
                        className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
                    />
                    <StatusBadge
                        label={t("status.powerFailure")}
                        count={counts.powerFail}
                        icon={<ShieldAlert className="h-3.5 w-3.5" />}
                        className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
                    />
                    <StatusBadge
                        label={t("status.commFailure")}
                        count={counts.commFail}
                        icon={<WifiOff className="h-3.5 w-3.5" />}
                        className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800"
                    />

                    <div className="hidden lg:block w-px bg-border/60 mx-1 h-8 self-center" />

                    {/* GPS Stats */}
                    <StatusBadge
                        label={t("status.withGps")}
                        count={counts.withGps}
                        icon={<MapIcon className="h-3.5 w-3.5" />}
                        className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800"
                    />
                    <StatusBadge
                        label={t("status.noGps")}
                        count={counts.noGps}
                        icon={<MapIcon className="h-3.5 w-3.5 opacity-50" />}
                        className="bg-gray-50 text-gray-600 border-gray-200 dark:bg-muted/40 dark:text-muted-foreground dark:border-border"
                    />
                </div>
            </Card>
        </div>
    )
}

function StatusBadge({
    label,
    count,
    color,
    className,
    icon
}: {
    label: string,
    count: number,
    color?: string, // Legacy support if needed, but moving to className
    className?: string,
    icon?: React.ReactNode
}) {
    return (
        <div className={`
            flex items-center gap-3 px-4 py-2 rounded-xl border shadow-sm transition-all hover:shadow-md cursor-default
            min-w-[120px] lg:min-w-0 flex-1 lg:flex-none justify-between lg:justify-start
            ${className || color}
        `}>
            <div className="flex items-center gap-2 overflow-hidden">
                {icon}
                <span className="text-xs font-semibold uppercase tracking-wider opacity-80 truncate">{label}</span>
            </div>
            <span className="font-bold text-lg leading-none">{count}</span>
        </div>
    )
}
