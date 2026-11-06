"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Combobox, ComboboxInput, ComboboxContent, ComboboxEmpty, ComboboxList, ComboboxItem } from "@/components/ui/combobox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { Loader2, Plus, Search, RotateCcw, X, Wrench, Lightbulb, CheckCircle2, Clock, ShieldAlert } from "lucide-react"
import { getLeafletIconUrl, MarkerColor, MarkerBadge } from "@/lib/map-icons"
import { cn } from "@/lib/utils"
import { usePermission } from "@/components/providers/permission-provider"

import {
    MaintenanceConfigRecord,
    getDataListMaintenanceTotal,
    getListDataOperator,
    saveAddDataMaintenanceAction,
    deleteDetailDataMaintenanceAction,
    confirmDataMaintenanceAction
} from "@/app/actions/maintenance"
import { getCurrentUser } from "@/app/actions/auth"
import { getListDataGroupAction, getDataLatLongSearchAction, LatLongData } from "@/app/actions/map-actions"

import dynamic from "next/dynamic"

const MaintenanceMapComponent = dynamic(() => import("./maintenance-map"), {
    ssr: false,
    loading: () => (
        <div className="h-full w-full flex items-center justify-center bg-muted/20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
    )
})
import { SelectedTable } from "./selected-table"
import { useMaintenanceColumns } from "./columns"
import { DataTable } from "./data-table"
import { DetailDialog } from "@/components/cores/maintenance/detail/detail-dialog"

export interface SelectedDevice extends LatLongData {
    reason: string
}

function LegendItem({ icons, text }: { icons: { color: MarkerColor, badge: MarkerBadge }[], text: string }) {
    return (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-0.5 min-w-[24px]">
                {icons.map((icon, idx) => (
                    <div key={idx} className="flex items-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={getLeafletIconUrl(icon.color, icon.badge)} className="w-5 h-5 object-contain" alt="" />
                        {idx < icons.length - 1 && <span className="text-muted-foreground/40 mx-0.5 text-[10px]">|</span>}
                    </div>
                ))}
            </div>
            <span>{text}</span>
        </div>
    )
}

// ---------------------------------------------------------------------------
// Add Form Component
// ---------------------------------------------------------------------------
function AddMaintenanceForm({
    mapMode,
    mapOfflineUrl,
    defaultLat,
    defaultLng,
    defaultZoom,
    iconScale,
    googleMapsApiKey,
    onCancel,
    onSuccess
}: {
    mapMode?: "online" | "offline"
    mapOnlineUrl?: string
    mapOfflineUrl?: string
    defaultLat?: number
    defaultLng?: number
    defaultZoom?: number
    iconScale?: number
    googleMapsApiKey?: string
    onCancel: () => void
    onSuccess: () => void
}) {
    const tForm = useTranslations("MaintenanceConfig.form")
    const tMap = useTranslations("MapGlobal")
    const tTable = useTranslations("MaintenanceConfig.selectedTable")
    const tMessages = useTranslations("MaintenanceConfig.messages")

    // Form States
    const [itemName, setItemName] = React.useState("")
    const [operatorId, setOperatorId] = React.useState("0")
    const [reporterName, setReporterName] = React.useState("")
    const [adminId, setAdminId] = React.useState("")

    // Search States
    const [searchGroup, setSearchGroup] = React.useState("ALL")
    const [searchStatus, setSearchStatus] = React.useState("all")

    // Data Options
    const [operators, setOperators] = React.useState<{ id: string, full_name: string }[]>([])
    const [groups, setGroups] = React.useState<{ groupCode: string, groupName: string }[]>([])

    // Map & Table Data
    const [devices, setDevices] = React.useState<LatLongData[]>([])
    const [selectedDevices, setSelectedDevices] = React.useState<SelectedDevice[]>([])

    // UI States
    const [isLoadingInit, setIsLoadingInit] = React.useState(true)
    const [isSearching, setIsSearching] = React.useState(false)
    const [isSaving, setIsSaving] = React.useState(false)

    React.useEffect(() => {
        const initData = async () => {
            try {
                const [ops, user, grps] = await Promise.all([
                    getListDataOperator(),
                    getCurrentUser(),
                    getListDataGroupAction()
                ])

                setOperators(ops)
                setGroups(grps)
                if (user) {
                    setReporterName(`${user.firstName} ${user.lastName}`)
                    setAdminId(user.userId)
                }

                // Fetch initial map data with default search values
                const results = await getDataLatLongSearchAction("group", ["ALL"], "all")
                setDevices(results)
            } catch (error) {
                console.error("Init Error", error)
                toast.error(tMessages("initError"))
            } finally {
                setIsLoadingInit(false)
            }
        }
        initData()
    }, [tMessages])

    const handleSearch = async () => {
        setIsSearching(true)
        try {
            const results = await getDataLatLongSearchAction("group", [searchGroup], searchStatus)
            setDevices(results)
        } catch (error) {
            console.error("Search error", error)
            toast.error(tMessages("searchError"))
        } finally {
            setIsSearching(false)
        }
    }

    const handleSelectDeviceFromMap = (device: LatLongData) => {
        if (selectedDevices.find(d => d.imsi === device.imsi)) {
            toast.info(tMessages("deviceSelected"))
            return
        }
        setSelectedDevices(prev => [...prev, { ...device, reason: device.status || "" }])
    }

    const handleRemoveDevice = (imsi: string) => {
        setSelectedDevices(prev => prev.filter(d => d.imsi !== imsi))
    }

    const handleClearAllSelected = () => {
        setSelectedDevices([])
    }

    const handleSave = async () => {
        if (!itemName.trim()) {
            toast.error(tMessages("enterItemName"))
            return
        }
        if (operatorId === "0") {
            toast.error(tMessages("selectOperatorError"))
            return
        }
        if (selectedDevices.length === 0) {
            toast.error(tMessages("selectDeviceError"))
            return
        }

        setIsSaving(true)
        try {
            const list_imsi_arr = selectedDevices.map(d => ({
                street_light_name: d.street_light_name || "-",
                imsi: d.imsi,
                lat: d.lat,
                lng: d.lng,
                lamp_case: d.reason || "0"
            }))

            const payload = {
                list_name: itemName.trim(),
                id_operator: operatorId,
                id_admin: adminId,
                list_imsi: JSON.stringify(list_imsi_arr)
            }

            const res = await saveAddDataMaintenanceAction(payload)
            if (res.success) {
                toast.success(tMessages("saveSuccess"))
                onSuccess()
            } else {
                toast.error(res.message || tMessages("saveError"))
            }
        } catch {
            toast.error(tMessages("saveError"))
        } finally {
            setIsSaving(false)
        }
    }

    if (isLoadingInit) {
        return (
            <div className="flex items-center justify-center p-12 h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full flex-1 overflow-hidden">
            {/* Scrollable Dialog Body */}
            <div className="p-4 sm:p-6 flex flex-col flex-1 min-h-0 gap-4 overflow-y-auto">
                {/* Form Inputs Header Card */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 rounded-lg border bg-card shadow-2xs">
                    <div className="space-y-1.5 md:col-span-1">
                        <label className="text-xs font-semibold text-foreground">
                            {tForm("itemName")} <span className="text-destructive">*</span>
                        </label>
                        <Input
                            value={itemName}
                            onChange={e => setItemName(e.target.value)}
                            className="h-9 text-sm bg-background"
                            placeholder={tForm("itemNamePlaceholder")}
                        />
                    </div>
                    <div className="space-y-1.5 md:col-span-1">
                        <label className="text-xs font-semibold text-foreground">
                            {tForm("operatorName")} <span className="text-destructive">*</span>
                        </label>
                        <Combobox
                            value={operatorId === "0" || operatorId === tForm("selectOperator") ? tForm("selectOperator") : operators.find(op => op.id === operatorId)?.full_name || tForm("selectOperator")}
                            onValueChange={(val) => {
                                if (val === tForm("selectOperator")) {
                                    setOperatorId("0")
                                } else {
                                    const found = operators.find(op => op.full_name === val)
                                    setOperatorId(found ? found.id : "0")
                                }
                            }}
                        >
                            <ComboboxInput className="cursor-pointer h-9 w-full bg-background text-sm" placeholder={tForm("selectOperator")} />
                            <ComboboxContent searchPlaceholder={tForm("searchOperatorPlaceholder")}>
                                <ComboboxEmpty>{tForm("noOperatorFound")}</ComboboxEmpty>
                                <ComboboxList>
                                    <ComboboxItem key={0} value={tForm("selectOperator")}>{tForm("selectOperator")}</ComboboxItem>
                                    {operators.map(op => (
                                        <ComboboxItem key={op.id} value={op.full_name}>{op.full_name}</ComboboxItem>
                                    ))}
                                </ComboboxList>
                            </ComboboxContent>
                        </Combobox>
                    </div>
                    <div className="space-y-1.5 md:col-span-1">
                        <label className="text-xs font-semibold text-foreground">{tForm("reporterName")}</label>
                        <Input
                            value={reporterName}
                            readOnly
                            disabled
                            className="h-9 text-sm bg-muted/50 cursor-not-allowed"
                        />
                    </div>
                </div>

                {/* Map and Table Layout (Fills all remaining height with zero bottom gap) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0">
                    {/* Left Column: Map & Filter */}
                    <div className="flex flex-col lg:col-span-7 xl:col-span-7 h-full min-h-[360px]">
                        <div className="flex flex-col flex-1 h-full rounded-lg border bg-card shadow-2xs overflow-hidden min-h-0">
                            {/* Map Toolbar */}
                            <div className="flex flex-col sm:flex-row gap-2.5 items-end sm:items-center bg-card p-2.5 border-b shrink-0">
                                <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap hidden sm:block">
                                    {tForm("searchBy")}
                                </span>
                                <div className="flex-1 w-full sm:w-auto">
                                    <Combobox value={searchGroup} onValueChange={setSearchGroup}>
                                        <ComboboxInput className="cursor-pointer h-8.5 w-full bg-background text-xs" placeholder="ALL" />
                                        <ComboboxContent searchPlaceholder={tForm("searchGroupPlaceholder")}>
                                            <ComboboxEmpty>{tForm("noGroupFound")}</ComboboxEmpty>
                                            <ComboboxList>
                                                <ComboboxItem value="ALL">ALL</ComboboxItem>
                                                {groups
                                                    .filter((group) => (group.groupName || "").toUpperCase() !== "ALL")
                                                    .map((group, index) => (
                                                        <ComboboxItem key={`${group.groupCode || "grp"}-${group.groupName}-${index}`} value={group.groupName}>
                                                            {group.groupName}
                                                        </ComboboxItem>
                                                    ))}
                                            </ComboboxList>
                                        </ComboboxContent>
                                    </Combobox>
                                </div>
                                <div className="flex-1 w-full sm:w-auto">
                                    <Select value={searchStatus} onValueChange={setSearchStatus}>
                                        <SelectTrigger className="cursor-pointer h-8.5 bg-background text-xs">
                                            <SelectValue placeholder={tForm("selectStatus")} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all" className="text-xs">{tMap("filters.all")}</SelectItem>
                                            <SelectItem value="0" className="text-xs">{tMap("status.normal")}</SelectItem>
                                            <SelectItem value="4" className="text-xs">{tMap("status.powerFailure")}</SelectItem>
                                            <SelectItem value="5" className="text-xs">{tMap("status.commFailure")}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                {/* Magnifying Glass Icon Button */}
                                <Button
                                    onClick={() => handleSearch()}
                                    disabled={isSearching}
                                    size="icon"
                                    className="cursor-pointer h-8.5 w-8.5 shrink-0 shadow-2xs"
                                    title={tForm("search")}
                                    aria-label={tForm("search")}
                                >
                                    {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                                </Button>
                            </div>

                            {/* Map View */}
                            <div className="flex flex-col flex-1 min-h-0 relative">
                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-1.5 px-3 py-1.5 bg-muted/40 border-b text-xs font-medium shrink-0">
                                    <LegendItem icons={[{ color: "blue", badge: "A" }]} text={tMap("legend.disconnect")} />
                                    <LegendItem icons={[{ color: "green", badge: "⚡" }, { color: "gray", badge: "⚡" }]} text={tMap("legend.abnormal")} />
                                    <LegendItem icons={[{ color: "red", badge: null }]} text={tMap("legend.failure")} />
                                </div>
                                <div className="flex-1 min-h-0 relative w-full h-full">
                                    <MaintenanceMapComponent
                                        mapMode={mapMode}
                                        mapOfflineUrl={mapOfflineUrl}
                                        defaultLat={defaultLat?.toString()}
                                        defaultLng={defaultLng?.toString()}
                                        defaultZoom={defaultZoom?.toString()}
                                        iconScale={iconScale?.toString()}
                                        googleMapsApiKey={googleMapsApiKey}
                                        devices={devices}
                                        onSelectDevice={handleSelectDeviceFromMap}
                                        selectedImsis={selectedDevices.map(d => d.imsi)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Selected Devices Table */}
                    <div className="flex flex-col lg:col-span-5 xl:col-span-5 h-full min-h-[360px]">
                        <div className="flex flex-col flex-1 h-full rounded-lg border bg-card shadow-2xs overflow-hidden min-h-0">
                            {/* Header for Table with Item Count Badge */}
                            <div className="flex items-center justify-between bg-card p-2.5 border-b shrink-0 h-[49px]">
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold text-xs text-foreground">{tTable("title")}</span>
                                    <Badge variant="secondary" className="text-xs px-2 py-0.5 font-medium">
                                        {tTable("showing", {
                                            start: selectedDevices.length > 0 ? 1 : 0,
                                            end: selectedDevices.length,
                                            total: selectedDevices.length
                                        })}
                                    </Badge>
                                </div>
                                {selectedDevices.length > 0 && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleClearAllSelected}
                                        className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive cursor-pointer"
                                    >
                                        {tTable("clearAll")}
                                    </Button>
                                )}
                            </div>

                            {/* Table Area */}
                            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                                <SelectedTable
                                    items={selectedDevices}
                                    onRemoveItem={handleRemoveDevice}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Standard Dialog Footer (matches setting-control/group-config) */}
            <DialogFooter className="px-6 py-4 border-t shrink-0 bg-muted/20 flex flex-row items-center justify-end gap-2.5">
                <Button
                    variant="outline"
                    onClick={onCancel}
                    className="cursor-pointer"
                    disabled={isSaving}
                >
                    {tTable("close")}
                </Button>
                <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="cursor-pointer shadow-xs"
                >
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {tTable("save")}
                </Button>
            </DialogFooter>
        </div>
    )
}

interface MaintenanceConfigClientProps {
    mapMode?: "online" | "offline"
    mapOfflineUrl?: string
    defaultLat?: string
    defaultLng?: string
    defaultZoom?: string
    iconScale: string
    googleMapsApiKey?: string
}

// ---------------------------------------------------------------------------
// Main Client Component
// ---------------------------------------------------------------------------
export function MaintenanceConfigClient({
    mapMode,
    mapOfflineUrl,
    defaultLat,
    defaultLng,
    defaultZoom,
    iconScale,
    googleMapsApiKey
}: MaintenanceConfigClientProps) {
    const t = useTranslations("MaintenanceConfig")
    const tButtons = useTranslations("MaintenanceConfig.buttons")
    const tDelete = useTranslations("MaintenanceConfig.deleteDialog")
    const tConfirm = useTranslations("MaintenanceConfig.confirmDialog")
    const tMessages = useTranslations("MaintenanceConfig.messages")
    const tForm = useTranslations("MaintenanceConfig.form")

    const { getPermission, permissions } = usePermission()

    const perm = React.useMemo(() => {
        if (!permissions.length) return { readable: true, writable: true, control: true }
        return getPermission("maintenance_request")
    }, [getPermission, permissions])

    const isReadable = perm.readable
    const canWrite = perm.writable
    const canControl = perm.control

    const [data, setData] = React.useState<MaintenanceConfigRecord[]>([])
    const [loading, setLoading] = React.useState(true)
    const [isAddOpen, setIsAddOpen] = React.useState(false)
    const [detailId, setDetailId] = React.useState<string | null>(null)

    // Filter States
    const [searchQuery, setSearchQuery] = React.useState("")
    const [statusFilter, setStatusFilter] = React.useState<string>("ALL")
    const [operatorFilter, setOperatorFilter] = React.useState<string>("ALL")

    const [confirmingStatusItem, setConfirmingStatusItem] = React.useState<MaintenanceConfigRecord | null>(null)
    const [isConfirming, setIsConfirming] = React.useState(false)

    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false)
    const [deletingId, setDeletingId] = React.useState<string | null>(null)
    const [isDeleting, setIsDeleting] = React.useState(false)

    const fetchData = React.useCallback(async () => {
        setLoading(true)
        try {
            const result = await getDataListMaintenanceTotal()
            setData(result || [])
        } catch (error) {
            console.error("Failed to fetch data", error)
            toast.error(tMessages("loadDataError"))
        } finally {
            setLoading(false)
        }
    }, [tMessages])

    React.useEffect(() => {
        fetchData()
    }, [fetchData])

    // KPI Summary Calculation
    const kpiSummary = React.useMemo(() => {
        const totalLists = data.length
        const totalLamps = data.reduce((acc, item) => acc + parseInt(item.count_lamp_all || "0", 10), 0)
        const repairedLamps = data.reduce((acc, item) => acc + parseInt(item.repair_all || "0", 10), 0)
        const pendingLamps = data.reduce((acc, item) => acc + parseInt(item.wait_repair || "0", 10), 0)
        return { totalLists, totalLamps, repairedLamps, pendingLamps }
    }, [data])

    // Unique operators for dropdown filter
    const operatorOptions = React.useMemo(() => {
        return Array.from(new Set(data.map(item => item.name_operator).filter(Boolean)))
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

    const columns = useMaintenanceColumns({
        onDetail: (item) => {
            setDetailId(item.detail)
        },
        onStatusChange: (item) => {
            if (!canWrite) {
                toast.error(tMessages("permissionDenied", { defaultMessage: "ไม่มีสิทธิ์ในการดำเนินการนี้" }))
                return
            }
            if (isConfirming) return

            const waitRepair = parseInt(item.wait_repair || "0", 10)
            if (waitRepair > 0) {
                toast.error(tMessages("pendingRepairs", { count: waitRepair }))
                return
            }

            setConfirmingStatusItem(item)
        },
        onDelete: (item) => {
            if (!canControl) {
                toast.error(tMessages("permissionDenied", { defaultMessage: "ไม่มีสิทธิ์ในการดำเนินการนี้" }))
                return
            }
            setDeletingId(item.detail)
            setIsDeleteDialogOpen(true)
        },
        canWrite,
        canControl,
    })

    const handleAdd = () => {
        if (!canWrite) {
            toast.error(tMessages("permissionDenied", { defaultMessage: "ไม่มีสิทธิ์ในการดำเนินการนี้" }))
            return
        }
        setIsAddOpen(true)
    }

    const handleCloseAdd = () => {
        setIsAddOpen(false)
    }

    const handleSuccessAdd = () => {
        setIsAddOpen(false)
        fetchData()
    }

    const handleConfirmStatus = async () => {
        if (!canWrite) {
            toast.error(tMessages("permissionDenied", { defaultMessage: "ไม่มีสิทธิ์ในการดำเนินการนี้" }))
            return
        }
        if (!confirmingStatusItem) return

        const isConfirmed = confirmingStatusItem.confrime === "T" || confirmingStatusItem.confrime === "1" || confirmingStatusItem.confrime?.toLowerCase() === "true"
        const newType = isConfirmed ? "F" : "T"

        setIsConfirming(true)
        try {
            const res = await confirmDataMaintenanceAction({ type: newType, id: confirmingStatusItem.detail })
            if (res.success) {
                toast.success(tMessages("confirmSuccess"))
                fetchData()
            } else {
                toast.error(res.message || tMessages("confirmError"))
            }
        } catch (error) {
            console.error("Status update error", error)
            toast.error(tMessages("confirmError"))
        } finally {
            setIsConfirming(false)
            setConfirmingStatusItem(null)
        }
    }

    const handleDelete = async () => {
        if (!canControl) {
            toast.error(tMessages("permissionDenied", { defaultMessage: "ไม่มีสิทธิ์ในการดำเนินการนี้" }))
            return
        }
        if (!deletingId) return

        setIsDeleting(true)
        try {
            const res = await deleteDetailDataMaintenanceAction(deletingId)
            if (res.success) {
                toast.success(tDelete("success"))
                setIsDeleteDialogOpen(false)
                fetchData()
            } else {
                toast.error(res.message || tDelete("error"))
            }
        } catch (error) {
            console.error("Delete error", error)
            toast.error(tDelete("error"))
        } finally {
            setIsDeleting(false)
            setDeletingId(null)
        }
    }

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

                    <Button
                        onClick={handleAdd}
                        disabled={!canWrite}
                        className={cn(
                            "h-9 px-4 shrink-0 shadow-2xs font-medium gap-2",
                            canWrite ? "cursor-pointer" : "opacity-50 cursor-not-allowed"
                        )}
                    >
                        <Plus className="h-4 w-4" />
                        {tButtons("add")}
                    </Button>
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
                <DataTable columns={columns} data={filteredData} loading={loading} />
            </div>

            {/* Add Maintenance Task Modal (Styled exactly like setting-control/group-config) */}
            <Dialog open={isAddOpen && canWrite} onOpenChange={setIsAddOpen}>
                <DialogContent className="sm:max-w-[95vw] md:max-w-[95vw] lg:max-w-[85vw] xl:max-w-[1240px] h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
                    {/* 1. Title Dialog Header (Matches setting-control/group-config) */}
                    <DialogHeader className="px-6 py-4 border-b shrink-0 text-left">
                        <DialogTitle className="text-lg font-semibold flex items-center justify-start gap-2 text-left">
                            <Plus className="h-5 w-5 text-primary shrink-0" />
                            {tForm("addTitle")}
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            {tForm("addTitle")}
                        </DialogDescription>
                        <div className="text-sm text-muted-foreground text-left">
                            {tForm("addDescription")}
                        </div>
                    </DialogHeader>

                    {/* 2. Dialog Body & Footer inside AddMaintenanceForm */}
                    {isAddOpen && (
                        <AddMaintenanceForm
                            mapMode={mapMode}
                            mapOfflineUrl={mapOfflineUrl}
                            defaultLat={parseFloat(defaultLat || "0")}
                            defaultLng={parseFloat(defaultLng || "0")}
                            defaultZoom={parseFloat(defaultZoom || "13")}
                            iconScale={parseFloat(iconScale || "1")}
                            googleMapsApiKey={googleMapsApiKey}
                            onCancel={handleCloseAdd}
                            onSuccess={handleSuccessAdd}
                        />
                    )}
                </DialogContent>
            </Dialog>

            {/* Detail Dialog */}
            <DetailDialog
                detailId={detailId}
                mapMode={mapMode}
                mapOfflineUrl={mapOfflineUrl}
                defaultLat={defaultLat}
                defaultLng={defaultLng}
                defaultZoom={defaultZoom}
                iconScale={iconScale}
                googleMapsApiKey={googleMapsApiKey}
                canWrite={canWrite}
                canControl={canControl}
                onClose={() => setDetailId(null)}
            />

            {/* Delete Confirmation Alert Dialog */}
            <AlertDialog open={isDeleteDialogOpen && canControl} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{tDelete("title")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {tDelete("description")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="cursor-pointer" disabled={isDeleting}>
                            {tDelete("cancel")}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault()
                                handleDelete()
                            }}
                            disabled={isDeleting}
                            className="cursor-pointer bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                        >
                            {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            {tDelete("confirm")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Status Change Confirmation Alert Dialog */}
            <AlertDialog open={!!confirmingStatusItem} onOpenChange={(open) => !open && setConfirmingStatusItem(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{tConfirm("title")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {tConfirm("description")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="cursor-pointer" disabled={isConfirming}>
                            {tConfirm("cancel")}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault()
                                handleConfirmStatus()
                            }}
                            disabled={isConfirming}
                            className="cursor-pointer"
                        >
                            {isConfirming ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            {tConfirm("confirm")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
