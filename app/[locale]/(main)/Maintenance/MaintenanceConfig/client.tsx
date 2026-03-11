"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

import { MaintenanceConfigRecord, getDataListMaintenanceTotal, getListDataOperator } from "@/app/actions/maintenance"
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

export interface SelectedDevice extends LatLongData {
    reason: string;
}

// ---------------------------------------------------------------------------
// Add Form Component (was the main client component)
// ---------------------------------------------------------------------------
function AddMaintenanceForm({ onCancel, onSuccess }: { onCancel: () => void, onSuccess: () => void }) {
    const tForm = useTranslations("MaintenanceConfig.form")
    const tMap = useTranslations("MapGlobal")
    const tTable = useTranslations("MaintenanceConfig.selectedTable")

    // Form States
    const [itemName, setItemName] = React.useState("")
    const [operatorId, setOperatorId] = React.useState("0")
    const [reporterName, setReporterName] = React.useState("")
    
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

    // Config
    const mapMode = (process.env.NEXT_PUBLIC_MAP_MODE as "online" | "offline") || "online"
    const onlineUrl = process.env.NEXT_PUBLIC_MAP_ONLINE_URL
    const offlineUrl = process.env.NEXT_PUBLIC_MAP_OFFLINE_URL

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
                }
                
                // Fetch initial map data with default search values
                const results = await getDataLatLongSearchAction("group", ["ALL"], "all")
                setDevices(results)
            } catch (error) {
                console.error("Init Error", error)
                toast.error("Failed to load initial data")
            } finally {
                setIsLoadingInit(false)
            }
        }
        initData()
    }, [])

    const handleSearch = async () => {
        setIsSearching(true)
        try {
            const results = await getDataLatLongSearchAction("group", [searchGroup], searchStatus)
            setDevices(results)
        } catch (error) {
            console.error("Search error", error)
            toast.error("Search failed")
        } finally {
            setIsSearching(false)
        }
    }

    const handleSelectDeviceFromMap = async (device: LatLongData) => {
        if (selectedDevices.find(d => d.imsi === device.imsi)) {
            toast.info("Device already selected")
            return
        }
        setSelectedDevices(prev => [...prev, { ...device, reason: "" }])
    }

    const handleUpdateReason = (imsi: string, reason: string) => {
        setSelectedDevices(prev => prev.map(d => d.imsi === imsi ? { ...d, reason } : d))
    }

    const handleRemoveDevice = (imsi: string) => {
        setSelectedDevices(prev => prev.filter(d => d.imsi !== imsi))
    }

    const handleSave = async () => {
        if (!itemName) {
            toast.error("Please enter Item Name")
            return
        }
        if (operatorId === "0") {
            toast.error("Please select Operator")
            return
        }
        if (selectedDevices.length === 0) {
            toast.error("Please select at least one device from map")
            return
        }

        setIsSaving(true)
        try {
            // TODO: Implement Save action when API is available.
            console.log({
                itemName,
                operatorId,
                reporterName,
                devices: selectedDevices.map(d => ({ imsi: d.imsi, reason: d.reason }))
            })
            toast.success("Saved successfully (Mock)")
            onSuccess()
        } catch (error) {
            toast.error("Failed to save")
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
        <div className="flex flex-col gap-4 w-full">
            {/* 1. Item Name */}
            <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-500">{tForm("itemName")}</label>
                <Input 
                    value={itemName} 
                    onChange={e => setItemName(e.target.value)} 
                    className="bg-white"
                />
            </div>

            {/* 2. Operator & Reporter */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="text-sm font-bold text-gray-500">{tForm("operatorName")}</label>
                    <Select value={operatorId} onValueChange={setOperatorId}>
                        <SelectTrigger className="bg-white">
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
                <div className="space-y-1.5">
                    <label className="text-sm font-bold text-gray-500">{tForm("reporterName")}</label>
                    <Input 
                        value={reporterName} 
                        readOnly 
                        disabled 
                        className="bg-gray-100 text-gray-600 cursor-not-allowed border-gray-200"
                    />
                </div>
            </div>

            {/* 3. Search Bar */}
            <div className="flex flex-col md:flex-row gap-4 items-center bg-white p-4 border rounded-md">
                <span className="text-sm font-bold text-gray-500 whitespace-nowrap">{tForm("searchBy")}</span>
                
                <div className="flex-1 md:flex-initial">
                    <Select value={searchGroup} onValueChange={setSearchGroup}>
                        <SelectTrigger className="bg-white w-full md:w-64">
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

                <div className="flex-1 md:flex-initial">
                    <Select value={searchStatus} onValueChange={setSearchStatus}>
                        <SelectTrigger className="bg-white w-full md:w-64">
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
                    className="w-full md:w-32 bg-indigo-500 hover:bg-indigo-600 text-white md:ml-auto"
                >
                    {isSearching ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {tForm("search")}
                </Button>
            </div>

            {/* 4. Map View */}
            <div className="rounded-md border bg-white overflow-hidden shadow-sm">
                <div className="flex flex-wrap items-center gap-6 p-3 bg-slate-50 border-b text-sm font-medium text-gray-600">
                    <div className="flex items-center gap-2">
                        <img src="/images/marker-icon-red.png" className="w-5 h-8 object-contain" alt="" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />
                        {tMap("status.powerFailure")}
                    </div>
                    <div className="flex items-center gap-2">
                        <img src="/images/marker-icon-gray-lightning.png" className="w-5 h-8 object-contain" alt="" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />
                        {tMap("legend.abnormal")}
                    </div>
                    <div className="flex items-center gap-2">
                        <img src="/images/marker-icon-blue-auto.png" className="w-5 h-8 object-contain" alt="" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />
                        {tMap("status.commFailure")}
                    </div>
                </div>
                <div className="h-[350px] relative">
                    <MaintenanceMapComponent 
                        mode={mapMode}
                        onlineUrl={onlineUrl}
                        offlineUrl={offlineUrl}
                        devices={devices}
                        onSelectDevice={handleSelectDeviceFromMap}
                        selectedImsis={selectedDevices.map(d => d.imsi)}
                    />
                </div>
            </div>

            {/* 5. Selected Table */}
            <div className="min-h-[150px] max-h-[300px] overflow-auto border shadow-sm rounded-md bg-white">
                <SelectedTable 
                    items={selectedDevices}
                    onUpdateReason={handleUpdateReason}
                    onRemoveItem={handleRemoveDevice}
                />
            </div>

            {/* 6. Footer (Pagination text & Buttons) */}
            <div className="flex items-center justify-between pt-2">
                <div className="text-sm text-gray-500">
                    {selectedDevices.length > 0 
                        ? tTable("showing", { start: 1, end: selectedDevices.length, total: selectedDevices.length })
                        : tTable("showing", { start: 0, end: 0, total: 0 })
                    }
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" onClick={onCancel} className="text-gray-600 hover:bg-gray-100 font-semibold px-6">{tTable("close")}</Button>
                    <Button 
                        onClick={handleSave} 
                        disabled={isSaving}
                        className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-8"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        {tTable("save")}
                    </Button>
                </div>
            </div>
        </div>
    )
}

// ---------------------------------------------------------------------------
// Main Client Component
// ---------------------------------------------------------------------------
export function MaintenanceConfigClient() {
    const [data, setData] = React.useState<MaintenanceConfigRecord[]>([])
    const [loading, setLoading] = React.useState(true)
    const [isAddOpen, setIsAddOpen] = React.useState(false)

    const fetchData = async () => {
        setLoading(true)
        try {
            const result = await getDataListMaintenanceTotal()
            setData(result || [])
        } catch (error) {
            console.error("Failed to fetch data", error)
            toast.error("Failed to load data")
        } finally {
            setLoading(false)
        }
    }

    React.useEffect(() => {
        fetchData()
    }, [])

    const columns = useMaintenanceColumns({
        onDetail: (item) => {
            console.log("Detail clicked", item)
            // Implementation pending
        },
        onStatusChange: (item) => {
            console.log("Status clicked", item)
            // Implementation pending
        },
        onDelete: (item) => {
            console.log("Delete clicked", item)
            // Implementation pending
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

    return (
        <div className="flex flex-col gap-6 w-full">
            <div className="flex-1">
                <DataTable columns={columns} data={data} loading={loading} onAdd={handleAdd} />
            </div>

            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent className="max-w-[90vw] md:max-w-[60vw] w-[90vw] md:w-[60vw] max-h-[90vh] overflow-y-auto p-6 bg-[#f8f9fa] border-0 outline-none focus:outline-none focus-visible:ring-0">
                    <DialogHeader className="mb-2">
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            <span className="w-1.5 h-6 bg-blue-500 rounded-full inline-block"></span>
                            เพิ่มรายการซ่อม
                        </DialogTitle>
                        <DialogDescription className="hidden">Add new maintenance task overlay</DialogDescription>
                    </DialogHeader>
                    
                    {/* Only render form when dialog is open to ensure Leaflet maps init correctly */}
                    {isAddOpen && (
                        <AddMaintenanceForm onCancel={handleCloseAdd} onSuccess={handleSuccessAdd} />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
