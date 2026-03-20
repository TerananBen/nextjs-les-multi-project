"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { getLeafletIconUrl, MarkerColor, MarkerBadge } from "@/lib/map-icons"

import { MaintenanceConfigRecord, getDataListMaintenanceTotal, getListDataOperator, saveAddDataMaintenanceAction, deleteDetailDataMaintenanceAction, confirmDataMaintenanceAction } from "@/app/actions/maintenance"
import { getCurrentUser } from "@/app/actions/auth"
import { getListDataGroupAction, getDataLatLongSearchAction, LatLongData } from "@/app/actions/map-actions"

import dynamic from "next/dynamic"

const MaintenanceMapComponent = dynamic(() => import("./maintenance-map"), {
    ssr: false,
    loading: () => (
        <div className="h-full w-full flex items-center justify-center bg-gray-50">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
    )
})
import { SelectedTable } from "./selected-table"
import { useMaintenanceColumns } from "./columns"
import { DataTable } from "./data-table"
import { DetailDialog } from "@/app/[locale]/(main)/Maintenance/MaintenanceDashboard/detail-dialog"

export interface SelectedDevice extends LatLongData {
    reason: string;
}

function LegendItem({ icons, text }: { icons: { color: MarkerColor, badge: MarkerBadge }[], text: string }) {
    return (
        <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 min-w-[30px]">
                {icons.map((icon, idx) => (
                    <div key={idx} className="flex items-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={getLeafletIconUrl(icon.color, icon.badge)} className="w-6 h-6 object-contain" alt="" />
                        {idx < icons.length - 1 && <span className="text-gray-400 mx-0.5 text-xs">|</span>}
                    </div>
                ))}
            </div>
            <span>{text}</span>
        </div>
    )
}

// ---------------------------------------------------------------------------
// Add Form Component (was the main client component)
// ---------------------------------------------------------------------------
function AddMaintenanceForm({ mapMode, mapOfflineUrl, defaultLat, defaultLng, defaultZoom, iconScale, googleMapsApiKey, onCancel, onSuccess }: { mapMode?: "online" | "offline", mapOnlineUrl?: string, mapOfflineUrl?: string, defaultLat?: number, defaultLng?: number, defaultZoom?: number, iconScale?: number, googleMapsApiKey?: string, onCancel: () => void, onSuccess: () => void }) {
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

    const handleSelectDeviceFromMap = async (device: LatLongData) => {
        if (selectedDevices.find(d => d.imsi === device.imsi)) {
            toast.info(tMessages("deviceSelected"))
            return
        }
        setSelectedDevices(prev => [...prev, { ...device, reason: device.status || "" }])
    }

    const handleUpdateReason = (imsi: string, reason: string) => {
        setSelectedDevices(prev => prev.map(d => d.imsi === imsi ? { ...d, reason } : d))
    }

    const handleRemoveDevice = (imsi: string) => {
        setSelectedDevices(prev => prev.filter(d => d.imsi !== imsi))
    }

    const handleSave = async () => {
        if (!itemName) {
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
                list_name: itemName,
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
            <div className="flex items-center justify-center p-8 h-48">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-5 w-full">
            {/* Headers / Form Data */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <div className="space-y-1.5 md:col-span-1">
                    <label className="text-sm font-bold text-gray-500">{tForm("itemName")} <span className="text-red-500">*</span></label>
                    <Input
                        value={itemName}
                        onChange={e => setItemName(e.target.value)}
                        className="bg-gray-50 focus:bg-white transition-colors"
                        placeholder={tForm("itemNamePlaceholder")}
                    />
                </div>
                <div className="space-y-1.5 md:col-span-1">
                    <label className="text-sm font-bold text-gray-500">{tForm("operatorName")} <span className="text-red-500">*</span></label>
                    <Select value={operatorId} onValueChange={setOperatorId}>
                        <SelectTrigger className="bg-gray-50 focus:bg-white transition-colors">
                            <SelectValue placeholder={tForm("selectOperator")} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="0">{tForm("selectOperator")}</SelectItem>
                            {operators.map(op => (
                                <SelectItem key={op.id} value={op.id}>{op.full_name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-1.5 md:col-span-1">
                    <label className="text-sm font-bold text-gray-500">{tForm("reporterName")}</label>
                    <Input
                        value={reporterName}
                        readOnly
                        disabled
                        className="bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200"
                    />
                </div>
            </div>

            {/* Map and Table Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-full">

                {/* Left Column: Map & Search (7 columns on large screens) */}
                <div className="flex flex-col lg:col-span-7 xl:col-span-8 h-full">
                    {/* Unified Container */}
                    <div className="flex flex-col flex-1 bg-white border border-gray-100 rounded-lg shadow-sm overflow-hidden min-h-[500px]">

                        {/* Search Bar */}
                        <div className="flex flex-col sm:flex-row gap-3 items-end sm:items-center bg-white p-3 border-b border-gray-100 z-10 shrink-0">
                            <span className="text-sm font-bold text-gray-500 whitespace-nowrap hidden sm:block">{tForm("searchBy")}</span>
                            <div className="flex-1 w-full sm:w-auto">
                                <Select value={searchGroup} onValueChange={setSearchGroup}>
                                    <SelectTrigger className="bg-gray-50">
                                        <SelectValue placeholder="ALL" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">ALL</SelectItem>
                                        {groups.map((group) => (
                                            <SelectItem key={group.groupCode} value={group.groupCode}>
                                                {group.groupName}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex-1 w-full sm:w-auto">
                                <Select value={searchStatus} onValueChange={setSearchStatus}>
                                    <SelectTrigger className="bg-gray-50">
                                        <SelectValue placeholder={tForm("selectStatus")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">-- {tMap("filters.all")} --</SelectItem>
                                        <SelectItem value="0">{tMap("status.normal")}</SelectItem>
                                        <SelectItem value="4">{tMap("status.powerFailure")}</SelectItem>
                                        <SelectItem value="5">{tMap("status.commFailure")}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button
                                onClick={() => handleSearch()}
                                disabled={isSearching}
                                className="w-full sm:w-28 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                            >
                                {isSearching ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                {tForm("search")}
                            </Button>
                        </div>

                        {/* Map View */}
                        <div className="flex flex-col flex-1 relative min-h-[400px]">
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-2 p-2.5 bg-gray-50 border-b text-xs sm:text-sm font-medium text-gray-600 z-10 relative">
                                <LegendItem icons={[{ color: "blue", badge: "A" }]} text={tMap("legend.disconnect")} />
                                <LegendItem icons={[{ color: "green", badge: "⚡" }, { color: "gray", badge: "⚡" }]} text={tMap("legend.abnormal")} />
                                <LegendItem icons={[{ color: "red", badge: null }]} text={tMap("legend.failure")} />
                            </div>
                            <div className="flex-1 absolute inset-0 pt-[45px] sm:pt-[45px] md:pt-[41px]">
                                {/* The pt-[xxpx] is to offset the legend height so the map takes the full remaining space */}
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

                {/* Right Column: Selected Table (5 columns on large screens) */}
                <div className="flex flex-col lg:col-span-5 xl:col-span-4 h-full">
                    {/* Unified Container */}
                    <div className="flex flex-col flex-1 bg-white border border-gray-100 rounded-lg shadow-sm overflow-hidden min-h-[400px]">

                        {/* Header for Table */}
                        <div className="flex items-center justify-between bg-white p-3 border-b border-gray-100 z-10 shrink-0 h-auto sm:h-[65px]">
                            {/* h-[65px] matches typical SM height of search bar with inputs + padding */}
                            <span className="font-bold text-gray-700 text-sm">{tTable("title")}</span>
                            <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                {tTable("selectedCount", { count: selectedDevices.length })}
                            </span>
                        </div>

                        {/* Table Area */}
                        <div className="flex-1 w-full bg-white flex flex-col h-[300px] lg:h-auto overflow-hidden">
                            <SelectedTable
                                items={selectedDevices}
                                onUpdateReason={handleUpdateReason}
                                onRemoveItem={handleRemoveDevice}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Action Buttons */}
            <div className="flex items-center justify-between pt-4 mt-2 border-t border-gray-200">
                <div className="text-sm shadow-none p-0 text-gray-500 hidden sm:block">
                    {selectedDevices.length > 0
                        ? tTable("showing", { start: 1, end: selectedDevices.length, total: selectedDevices.length })
                        : tTable("showing", { start: 0, end: 0, total: 0 })
                    }
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <Button variant="outline" onClick={onCancel} className="flex-1 sm:flex-none text-gray-600 font-semibold px-6 border-gray-300">
                        {tTable("close")}
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white font-semibold px-8 shadow-sm"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        {tTable("save")}
                    </Button>
                </div>
            </div>
        </div>
    )
}

interface MaintenanceConfigClientProps {
    mapMode?: "online" | "offline" | undefined
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
export function MaintenanceConfigClient({ mapMode, mapOfflineUrl, defaultLat, defaultLng, defaultZoom, iconScale, googleMapsApiKey }: MaintenanceConfigClientProps) {
    const tForm = useTranslations("MaintenanceConfig.form")
    const tMessages = useTranslations("MaintenanceConfig.messages")
    const tDelete = useTranslations("MaintenanceConfig.deleteDialog")
    const tConfirm = useTranslations("MaintenanceConfig.confirmDialog")

    const [data, setData] = React.useState<MaintenanceConfigRecord[]>([])
    const [loading, setLoading] = React.useState(true)
    const [isAddOpen, setIsAddOpen] = React.useState(false)
    const [detailId, setDetailId] = React.useState<string | null>(null)

    const [confirmingStatusItem, setConfirmingStatusItem] = React.useState<MaintenanceConfigRecord | null>(null)

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

    const [isConfirming, setIsConfirming] = React.useState(false)

    const columns = useMaintenanceColumns({
        onDetail: (item) => {
            setDetailId(item.detail)
        },
        onStatusChange: (item) => {
            if (isConfirming) return

            const waitRepair = parseInt(item.wait_repair || "0", 10)
            if (waitRepair > 0) {
                toast.error(tMessages("pendingRepairs", { count: waitRepair }))
                return
            }

            setConfirmingStatusItem(item)
        },
        onDelete: (item) => {
            setDeletingId(item.detail)
            setIsDeleteDialogOpen(true)
        }
    })

    const handleAdd = () => {
        setIsAddOpen(true)
    }

    const handleCloseAdd = () => {
        setIsAddOpen(false)
    }

    const handleSuccessAdd = () => {
        setIsAddOpen(false)
        fetchData() // Refresh list after adding
    }

    const handleConfirmStatus = async () => {
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
        if (!deletingId) return

        setIsDeleting(true)
        try {
            const res = await deleteDetailDataMaintenanceAction(deletingId)
            if (res.success) {
                toast.success(tDelete("success"))
                setIsDeleteDialogOpen(false)
                fetchData() // Refresh list after deleting
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

    return (
        <div className="flex flex-col gap-6 w-full">
            <div className="flex-1">
                <DataTable columns={columns} data={data} loading={loading} onAdd={handleAdd} />
            </div>

            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent className="max-w-[95vw] lg:max-w-[90vw] xl:max-w-[1300px] w-full max-h-[95vh] overflow-y-auto p-4 md:p-6 bg-slate-50 border-0 outline-none focus:outline-none focus-visible:ring-0 rounded-xl">
                    <DialogHeader className="mb-2">
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            <span className="w-1.5 h-6 bg-blue-500 rounded-full inline-block"></span>
                            {tForm("addTitle")}
                        </DialogTitle>
                        <DialogDescription className="hidden">{tForm("addDescription")}</DialogDescription>
                    </DialogHeader>

                    {/* Only render form when dialog is open to ensure Leaflet maps init correctly */}
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
            <DetailDialog detailId={detailId} onClose={() => setDetailId(null)} />

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{tDelete("title")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {tDelete("description")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>{tDelete("cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault()
                                handleDelete()
                            }}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700 text-white focus:ring-red-600"
                        >
                            {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            {tDelete("confirm")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={!!confirmingStatusItem} onOpenChange={(open) => !open && setConfirmingStatusItem(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{tConfirm("title")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {tConfirm("description")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isConfirming}>{tConfirm("cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault()
                                handleConfirmStatus()
                            }}
                            disabled={isConfirming}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
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
