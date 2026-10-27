"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { DeviceGroup, StreetLightDevice } from "@/types/street-light"
import { getListDataGroupAction, searchStreetLightFromGroupAction } from "@/app/actions/street-light"
import { useStreetLightColumns } from "./columns"
import { DataTable } from "./data-table"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Search, FileUp, X, Lightbulb, Sun, Moon, WifiOff } from "lucide-react"
import { cn } from "@/lib/utils"
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface StreetLightClientProps {
    defaultGroupCode?: string
}

function isDeviceOffline(device: StreetLightDevice, now: number): boolean {
    const timeStr = device.streetLightLastUpdate || device.lastUpdate
    if (!timeStr || timeStr === "-" || timeStr === "ไม่มีข้อมูล") return true
    try {
        if (/^\d+$/.test(timeStr)) {
            return (now - parseInt(timeStr, 10) * 1000) > 24 * 60 * 60 * 1000
        }
        const parts = timeStr.split(" ")
        if (parts.length === 2) {
            const [datePart, timePart] = parts
            if (datePart.includes("-")) {
                const [d, m, y] = datePart.split("-").map(Number)
                const [h, min, s] = timePart.split(":").map(Number)
                if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
                    const parsed = new Date(y, m - 1, d, h || 0, min || 0, s || 0)
                    return (now - parsed.getTime()) > 24 * 60 * 60 * 1000
                }
            }
        }
        const fallbackDate = new Date(timeStr)
        if (!isNaN(fallbackDate.getTime())) {
            return (now - fallbackDate.getTime()) > 24 * 60 * 60 * 1000
        }
    } catch {
        return true
    }
    return false
}

export function StreetLightClient({ defaultGroupCode }: StreetLightClientProps) {
    const t = useTranslations("StreetLight")

    // State
    const [groups, setGroups] = React.useState<DeviceGroup[]>([])
    const [selectedGroup, setSelectedGroup] = React.useState<string>("ALL")
    const [statusFilter, setStatusFilter] = React.useState<string>("ALL")
    const [devices, setDevices] = React.useState<StreetLightDevice[]>([])
    const [loading, setLoading] = React.useState(false)

    // Local Filter State
    const [searchQuery, setSearchQuery] = React.useState("")

    const handleCommandSuccess = React.useCallback((imei: string, command: [string, string]) => {
        setDevices(prevDevices =>
            prevDevices.map(d =>
                d.imeI_Name === imei
                    ? { ...d, streetLightCommand: command }
                    : d
            )
        )
    }, [])

    // Columns
    const columns = useStreetLightColumns(handleCommandSuccess)

    // 1. Fetch Groups on Mount
    React.useEffect(() => {
        const fetchGroups = async () => {
            try {
                const data = await getListDataGroupAction()
                if (data && data.length > 0) {
                    const hasAll = data.some(g => g.groupName?.toUpperCase() === "ALL" || (defaultGroupCode && g.groupCode === defaultGroupCode))
                    const rawList = hasAll
                        ? data
                        : [{ groupCode: defaultGroupCode || "ALL", groupName: "ALL" }, ...data]

                    // Deduplicate by groupName to prevent duplicate select values and keys
                    const seen = new Set<string>()
                    const dedupedGroups: typeof rawList = []
                    for (const g of rawList) {
                        const nameKey = (g.groupName || "").trim().toUpperCase()
                        if (nameKey && !seen.has(nameKey)) {
                            seen.add(nameKey)
                            dedupedGroups.push(g)
                        }
                    }
                    setGroups(dedupedGroups)
                } else {
                    if (process.env.NODE_ENV === "development") {
                        setGroups([
                            { groupCode: defaultGroupCode || "oPIvy3ef9VIT", groupName: "ALL" }
                        ])
                    }
                }
            } catch (error) {
                console.error("Failed to fetch groups", error)
                toast.error(t("failedToLoadData"))
            }
        }

        fetchGroups()
    }, [t, defaultGroupCode])

    // 2. Fetch Devices when Group Changes (Auto-Search)
    React.useEffect(() => {
        const fetchDevices = async () => {
            if (!selectedGroup) return

            setLoading(true)
            try {
                const data = await searchStreetLightFromGroupAction(selectedGroup)
                if (data) {
                    setDevices(data)
                } else {
                    setDevices([])
                }
            } catch (error) {
                console.error("Failed to fetch devices", error)
                toast.error(t("failedToLoadData"))
                setDevices([])
            } finally {
                setLoading(false)
            }
        }

        fetchDevices()
    }, [selectedGroup, t])

    // 3. KPI Summary Calculation
    const kpiSummary = React.useMemo(() => {
        const now = Date.now()
        let on = 0
        let off = 0
        let offline = 0

        for (const d of devices) {
            if (d.streetLightCommand?.[0] === "1") {
                on++
            } else {
                off++
            }
            if (isDeviceOffline(d, now)) {
                offline++
            }
        }

        return {
            total: devices.length,
            on,
            off,
            offline,
        }
    }, [devices])

    // 4. Filtering
    const filteredDevices = React.useMemo(() => {
        let result = devices

        // Status Filter: ON, OFF, or OFFLINE
        if (statusFilter !== "ALL") {
            const now = Date.now()
            result = result.filter((device) => {
                if (statusFilter === "ON") return device.streetLightCommand?.[0] === "1"
                if (statusFilter === "OFF") return device.streetLightCommand?.[0] !== "1"
                if (statusFilter === "OFFLINE") return isDeviceOffline(device, now)
                return true
            })
        }

        // Search Filter
        if (searchQuery.trim()) {
            const lowerQuery = searchQuery.toLowerCase().trim()
            result = result.filter(device =>
                (device.streetLightName && device.streetLightName.toLowerCase().includes(lowerQuery)) ||
                (device.imeI_Name && device.imeI_Name.toLowerCase().includes(lowerQuery)) ||
                (device.streetLightSerial && device.streetLightSerial.toLowerCase().includes(lowerQuery)) ||
                (device.streetLightGroups && device.streetLightGroups.some(g => g.toLowerCase().includes(lowerQuery))) ||
                (device.streetLightStatus && device.streetLightStatus.toLowerCase().includes(lowerQuery))
            )
        }

        return result
    }, [devices, statusFilter, searchQuery])


    const isFiltered = searchQuery !== "" || selectedGroup !== "ALL" || statusFilter !== "ALL"

    const handleExportExcel = () => {
        if (!devices || devices.length === 0) {
            toast.error(t("noData"))
            return
        }

        const escapeCSV = (val: string | number | null | undefined) => {
            const str = String(val ?? "")
            if (str.includes(",") || str.includes("\"") || str.includes("\n")) {
                return `"${str.replace(/"/g, '""')}"`
            }
            return str
        }

        const headers = [
            t("table.index", { defaultValue: "Index" }),
            t("table.streetLightName", { defaultValue: "Street Light Name" }),
            t("table.gov", { defaultValue: "Group" }),
            t("table.deviceNo", { defaultValue: "Device No" }),
            t("table.groupName", { defaultValue: "Group Name" }),
            t("table.lastUpdate", { defaultValue: "Last Update" }),
            t("table.lifeTime", { defaultValue: "Life Time" }),
            t("table.lastPower", { defaultValue: "Last Power (W)" })
        ]

        const csvContent = [
            headers.join(","),
            ...devices.map((d, index) => [
                index + 1,
                escapeCSV(d.streetLightName),
                escapeCSV(d.streetLightSerial),
                escapeCSV(d.imeI_Name),
                escapeCSV(d.streetLightGroups?.join(", ")),
                escapeCSV(d.streetLightLastUpdate),
                escapeCSV(d.lifeTime),
                escapeCSV(d.lastPower)
            ].join(","))
        ].join("\n")

        const blob = new Blob([`\uFEFF${csvContent}`], { type: "text/csv;charset=utf-8;" })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.setAttribute("href", url)
        const now = new Date()
        const dateStr = now.toISOString().split("T")[0]
        const timeStr = now.toTimeString().split(" ")[0].replace(/:/g, "-")
        const fileName = `device_list_${selectedGroup}_${dateStr}_${timeStr}.csv`
        link.setAttribute("download", fileName)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <div className="flex flex-1 flex-col gap-3 w-full h-full">
            {/* Filter Controls Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 p-2 rounded-lg border bg-card text-card-foreground shadow-2xs">
                {/* Group Selector */}
                <div className="w-full sm:w-[220px]">
                    <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                        <SelectTrigger className="h-9 text-sm w-full bg-background cursor-pointer">
                            <SelectValue placeholder={t("selectGroupPlaceholder")} />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                            {groups.map((group, index) => (
                                <SelectItem key={`${group.groupCode || "grp"}-${group.groupName}-${index}`} value={group.groupName} className="cursor-pointer text-sm">
                                    {group.groupName}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Status Filter */}
                <div className="w-full sm:w-[170px]">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="h-9 text-sm w-full bg-background cursor-pointer">
                            <SelectValue placeholder={t("filter.allStatuses")} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL" className="cursor-pointer text-sm">{t("filter.allStatuses")}</SelectItem>
                            <SelectItem value="ON" className="cursor-pointer text-sm">{t("filter.statusOn")}</SelectItem>
                            <SelectItem value="OFF" className="cursor-pointer text-sm">{t("filter.statusOff")}</SelectItem>
                            <SelectItem value="OFFLINE" className="cursor-pointer text-sm">{t("filter.statusOffline")}</SelectItem>
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

                    {/* Export Excel Button with Tooltip */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={handleExportExcel}
                                disabled={loading || devices.length === 0}
                                className="h-9 w-9 shrink-0 cursor-pointer shadow-2xs"
                                aria-label="ส่งออกเป็นไฟล์ Excel"
                            >
                                <FileUp className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                            <p>ส่งออกเป็นไฟล์ Excel</p>
                        </TooltipContent>
                    </Tooltip>
                </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full">
                {/* Card 1: Total Devices */}
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
                        <Lightbulb className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs text-muted-foreground font-medium truncate">{t("kpi.totalDevices")}</p>
                        <p className="text-xl font-bold tracking-tight text-foreground">{kpiSummary.total}</p>
                    </div>
                </button>

                {/* Card 2: Lamps ON */}
                <button
                    type="button"
                    onClick={() => setStatusFilter(prev => prev === "ON" ? "ALL" : "ON")}
                    className={cn(
                        "flex items-center gap-3.5 p-3.5 rounded-xl border transition-all text-left cursor-pointer shadow-2xs",
                        statusFilter === "ON"
                            ? "border-emerald-500/50 bg-emerald-500/10 ring-1 ring-emerald-500/30"
                            : "border-border/80 bg-muted/40 hover:bg-muted/70"
                    )}
                >
                    <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                        <Sun className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs text-muted-foreground font-medium truncate">{t("kpi.lampsOn")}</p>
                        <p className="text-xl font-bold tracking-tight text-foreground">{kpiSummary.on}</p>
                    </div>
                </button>

                {/* Card 3: Lamps OFF */}
                <button
                    type="button"
                    onClick={() => setStatusFilter(prev => prev === "OFF" ? "ALL" : "OFF")}
                    className={cn(
                        "flex items-center gap-3.5 p-3.5 rounded-xl border transition-all text-left cursor-pointer shadow-2xs",
                        statusFilter === "OFF"
                            ? "border-slate-500/50 bg-slate-500/10 ring-1 ring-slate-500/30"
                            : "border-border/80 bg-muted/40 hover:bg-muted/70"
                    )}
                >
                    <div className="p-2.5 rounded-lg bg-muted text-muted-foreground shrink-0 border border-border/50">
                        <Moon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs text-muted-foreground font-medium truncate">{t("kpi.lampsOff")}</p>
                        <p className="text-xl font-bold tracking-tight text-foreground">{kpiSummary.off}</p>
                    </div>
                </button>

                {/* Card 4: Offline Alert */}
                <button
                    type="button"
                    onClick={() => setStatusFilter(prev => prev === "OFFLINE" ? "ALL" : "OFFLINE")}
                    className={cn(
                        "flex items-center gap-3.5 p-3.5 rounded-xl border transition-all text-left cursor-pointer shadow-2xs",
                        statusFilter === "OFFLINE"
                            ? "border-amber-500/50 bg-amber-500/10 ring-1 ring-amber-500/30"
                            : "border-border/80 bg-muted/40 hover:bg-muted/70"
                    )}
                >
                    <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                        <WifiOff className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs text-muted-foreground font-medium truncate">{t("kpi.offlineAlert")}</p>
                        <p className="text-xl font-bold tracking-tight text-foreground">{kpiSummary.offline}</p>
                    </div>
                </button>
            </div>

            {/* Table Section */}
            <div className="flex-1 flex flex-col min-h-0">
                <DataTable columns={columns} data={filteredDevices} loading={loading} />
            </div>
        </div>
    )
}
