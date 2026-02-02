"use client"

import { useTranslations } from "next-intl"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LatLongData } from "@/app/actions/map-actions"
import { useMemo } from "react"
import { Search } from "lucide-react"
import {
    Combobox,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
} from "@/components/ui/combobox"

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
        const withGps = devices.filter(d => d.lat !== "0" && d.lng !== "0").length
        const noGps = total - withGps

        return { total, normal, powerFail, commFail, withGps, noGps }
    }, [devices])

    // Helper to find label for Combobox display if needed, but ComboboxInput handles basic display
    // or we pass it? The customized ComboboxInput displays context.value.
    // If we want to show "All" instead of "ALL", we might need to handle render logic inside ComboboxInput or pass child?
    // The current ComboboxInput implementation displays {context.value || placeholder}.
    // If value is "ALL", it displays "ALL". Ideally we want to display t("filters.all") if value is "ALL".
    // But ComboboxInput is generic. 
    // Let's rely on standard behavior for now.

    const getDisplayValue = () => {
        if (searchValue === "ALL" || !searchValue) return t("filters.all")
        const found = dataOptions.find((opt: any) => {
            const val = typeof opt === 'string' ? opt : opt.groupName
            return val === searchValue
        })
        if (found) return typeof found === 'string' ? found : found.groupName
        return searchValue
    }

    return (
        <div className="flex flex-col gap-2 w-full relative z-10 p-2 pb-0">
            {/* Filter Bar Row */}
            <div className="flex flex-col xl:flex-row gap-2 justify-between items-start xl:items-center w-full">

                {/* Left Side: Type & Search Value */}
                <div className="flex flex-col md:flex-row gap-2 w-full xl:w-auto flex-1">
                    {/* Search Type */}
                    <div className="w-full md:w-[160px]">
                        <Select value={searchType} onValueChange={(val: any) => setSearchType(val)}>
                            <SelectTrigger className="h-10 rounded-xl bg-white border-gray-200 shadow-sm text-sm">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="z-[9999]">
                                <SelectItem value="group">{t("filters.group")}</SelectItem>
                                <SelectItem value="imsi">{t("filters.imsi")}</SelectItem>
                                <SelectItem value="street_light_name">{t("filters.streetLightName")}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Search Input / Value Selector - Converted to Combobox */}
                    <div className="flex-1 w-full relative z-[50]">
                        <Combobox value={searchValue} onValueChange={setSearchValue}>
                            <ComboboxInput
                                placeholder={t("filters.all")}
                                className="h-10 rounded-xl bg-white border-gray-200 shadow-sm text-sm w-full font-normal"
                            />
                            <ComboboxContent className="z-[9999]" searchPlaceholder={t("filters.search")}>
                                <ComboboxEmpty>{t("filters.noResult")}</ComboboxEmpty>
                                <ComboboxList>
                                    <ComboboxItem value="ALL">
                                        {t("filters.all")}
                                    </ComboboxItem>
                                    {dataOptions.map((opt: any, idx) => {
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

                    {/* Status Filter */}
                    <div className="w-full md:w-[150px]">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="h-10 rounded-xl bg-white border-gray-200 shadow-sm text-sm">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="z-[9999]">
                                <SelectItem value="all">{t("status.all")}</SelectItem>
                                <SelectItem value="3">{t("status.normal")}</SelectItem>
                                <SelectItem value="4">{t("status.powerFailure")}</SelectItem>
                                <SelectItem value="5">{t("status.commFailure")}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <Button onClick={onSearch} className="h-10 rounded-xl px-4 text-sm">
                        <Search className="mr-2 h-4 w-4" />
                        {t("filters.search")}
                    </Button>
                </div>
            </div>

            {/* Status Chips Row */}
            <div className="flex flex-wrap gap-2 items-center">
                <StatusChip label={t("status.all")} count={counts.total} color="bg-primary/10 text-primary border-primary/20" />
                <StatusChip label={t("status.normal")} count={counts.normal} color="bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800" />
                <StatusChip label={t("status.powerFailure")} count={counts.powerFail} color="bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800" />
                <StatusChip label={t("status.commFailure")} count={counts.commFail} color="bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800" />
                <div className="mx-1 w-px bg-border h-8 hidden xl:block" />
                <StatusChip label={t("status.withGps")} count={counts.withGps} color="bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800" />
                <StatusChip label={t("status.noGps")} count={counts.noGps} color="bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700" />
            </div>
        </div>
    )
}

function StatusChip({ label, count, color }: { label: string, count: number, color: string }) {
    return (
        <div className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 border ${color}`}>
            <span className="font-bold">{count}</span>
            <span className="opacity-80">{label}</span>
        </div>
    )
}
