"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { GroupConfigData, GroupDetailWithLocation } from "@/types/group-config"
import { getListDataGroupDetailAction, getDataLatLongAction } from "@/app/actions/group-config"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Loader2, Search, Trash2, Save, Plus, Edit } from "lucide-react"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { configLatLongLampAndPoleAction, deleteImsiGroupConfigAction, getListDataIMSIAllAction, addRtuToGroupAction } from "@/app/actions/group-config"
import { toast } from "sonner"

import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from "@/components/ui/combobox"

interface AddDeviceDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    group: GroupConfigData
}

export function AddDeviceDialog({ open, onOpenChange, group }: AddDeviceDialogProps) {
    const t = useTranslations("GroupConfig.addDeviceDialog")
    // const { toast } = useToast()  <-- Removing this
    const [data, setData] = React.useState<GroupDetailWithLocation[]>([])

    // ...


    const [loading, setLoading] = React.useState(false)
    const [searchQuery, setSearchQuery] = React.useState("")

    // Add Device State
    const [availableImsis, setAvailableImsis] = React.useState<string[]>([])
    const [selectedImsi, setSelectedImsi] = React.useState("")
    const [isAddingDevice, setIsAddingDevice] = React.useState(false)

    // Save & Delete States
    const [savingImsi, setSavingImsi] = React.useState<string | null>(null)
    const [deletingImsi, setDeletingImsi] = React.useState<string | null>(null)
    const [deviceToDelete, setDeviceToDelete] = React.useState<GroupDetailWithLocation | null>(null)
    const [openDeleteAlert, setOpenDeleteAlert] = React.useState(false)

    // Pagination State
    const [currentPage, setCurrentPage] = React.useState(1)
    const pageSize = 10

    React.useEffect(() => {
        if (open) {
            const fetchData = async () => {
                setLoading(true)
                try {
                    // Fetch group details, location data, and all IMSIs
                    const [groupDetails, latLongData, allImsis] = await Promise.all([
                        getListDataGroupDetailAction(group.group_name),
                        getDataLatLongAction(group.group_code, group.group_name),
                        getListDataIMSIAllAction()
                    ])

                    if (allImsis) setAvailableImsis(allImsis)

                    if (groupDetails) {
                        // Merge location data into group details
                        const mergedData: GroupDetailWithLocation[] = groupDetails.map(item => {
                            const location = latLongData?.find(l => l.imsi === item.imsi)
                            return {
                                ...item,
                                lat: location?.lat && location.lat !== "-" ? location.lat : "",
                                lng: location?.lng && location.lng !== "-" ? location.lng : ""
                            }
                        })
                        setData(mergedData)
                    }
                } catch (error) {
                    console.error("Failed to fetch group details", error)
                } finally {
                    setLoading(false)
                }
            }
            fetchData()
        } else {
            // Reset state when closed
            setData([])
            setSearchQuery("")
            setCurrentPage(1)
        }
    }, [open, group.group_name, group.group_code])

    const filteredData = React.useMemo(() => {
        if (!searchQuery) return data
        const lowerQuery = searchQuery.toLowerCase()
        return data.filter(item =>
            item.street_light_name.toLowerCase().includes(lowerQuery) ||
            item.imsi.toLowerCase().includes(lowerQuery) ||
            item.gov_name.toLowerCase().includes(lowerQuery)
        )
    }, [data, searchQuery])

    // Reset to page 1 when search query changes
    React.useEffect(() => {
        setCurrentPage(1)
    }, [searchQuery])

    // Pagination Logic
    const totalPages = Math.ceil(filteredData.length / pageSize)
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    const paginatedData = filteredData.slice(startIndex, endIndex)

    const handlePrevPage = () => {
        setCurrentPage((prev) => Math.max(prev - 1, 1))
    }

    const handleNextPage = () => {
        setCurrentPage((prev) => Math.min(prev + 1, totalPages))
    }

    const handleInputChange = (index: number, field: keyof GroupDetailWithLocation, value: string) => {
        const newData = [...data]
        // Determine the actual index in the full data array
        // Since we are iterating over paginatedData in render, mapping back to data index is tricky if we don't have unique ID.
        // But we have IMSI.
        const itemIndex = newData.findIndex(item => item.imsi === paginatedData[index].imsi)
        if (itemIndex !== -1) {
            newData[itemIndex] = { ...newData[itemIndex], [field]: value }
            setData(newData)
        }
    }

    const handleSave = async (item: GroupDetailWithLocation) => {
        setSavingImsi(item.imsi)
        try {
            const result = await configLatLongLampAndPoleAction({
                imsi: item.imsi,
                lat_lamp: item.lat || "",
                long_lamp: item.lng || "",
                name_pole: item.street_light_name,
                name_gov: item.gov_name
            })

            if (result.result) {
                toast.success(t("saveSuccess"))
            } else {
                toast.error(result.message || t("saveError"))
            }
        } catch (error) {
            console.error("Save device error:", error)
            toast.error(t("saveError"))
        } finally {
            setSavingImsi(null)
        }
    }

    const handleDelete = async (item: GroupDetailWithLocation) => {
        setDeletingImsi(item.imsi)
        try {
            const result = await deleteImsiGroupConfigAction({
                group_code: group.group_code,
                group_name: group.group_name,
                imsi: item.imsi
            })

            if (result.result) {
                toast.success(t("deleteSuccess"))
                // Remove from local state
                setData(prev => prev.filter(d => d.imsi !== item.imsi))
            } else {
                toast.error(result.message || t("deleteError"))
            }
        } catch (error) {
            console.error("Delete device error:", error)
            toast.error(t("deleteError"))
        } finally {
            setDeletingImsi(null)
        }
    }

    const handleAddDevice = async () => {
        if (!selectedImsi) return

        setIsAddingDevice(true)
        try {
            const result = await addRtuToGroupAction({
                group_code: group.group_code,
                group_name: group.group_name,
                imsi: selectedImsi
            })

            if (result.result) {
                toast.success(t("addSuccess", { defaultValue: "Device added successfully" }))

                // Refresh data
                setLoading(true)
                const [groupDetails, latLongData, allImsis] = await Promise.all([
                    getListDataGroupDetailAction(group.group_name),
                    getDataLatLongAction(group.group_code, group.group_name),
                    getListDataIMSIAllAction()
                ])

                if (allImsis) setAvailableImsis(allImsis)

                if (groupDetails) {
                    const mergedData: GroupDetailWithLocation[] = groupDetails.map(item => {
                        const location = latLongData?.find(l => l.imsi === item.imsi)
                        return {
                            ...item,
                            lat: location?.lat && location.lat !== "-" ? location.lat : "",
                            lng: location?.lng && location.lng !== "-" ? location.lng : ""
                        }
                    })
                    setData(mergedData)
                }

                setSelectedImsi("")
            } else {
                toast.error(result.message || t("addError", { defaultValue: "Failed to add device" }))
            }
        } catch (error) {
            console.error("Failed to add device", error)
            toast.error(t("addError", { defaultValue: "Failed to add device" }))
        } finally {
            setIsAddingDevice(false)
            setLoading(false)
        }
    }

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[95vw] md:max-w-[95vw] lg:max-w-[50vw] h-[95vh] md:h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
                    <DialogHeader className="px-6 py-4 border-b shrink-0 text-left">
                        <DialogTitle className="text-lg font-semibold flex items-center justify-start gap-2 text-left">
                            <Edit className="h-5 w-5 text-primary shrink-0" />
                            {t("title")}
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            {t("title")}
                        </DialogDescription>
                        <div className="text-sm text-muted-foreground text-left">
                            {t("groupLabel", { defaultValue: "กลุ่ม" })}: <span className="font-medium text-foreground">{group.group_name}</span>
                            {group.sub_district && group.sub_district !== "-" ? (
                                <span className="text-muted-foreground"> ({group.sub_district})</span>
                            ) : null}
                        </div>
                    </DialogHeader>

                    <div className="p-4 sm:p-5 flex flex-col flex-1 min-h-0 gap-4 overflow-hidden">
                        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 w-full">
                        <div className="relative flex-1 w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={t("searchPlaceholder")}
                                className="pl-9"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="w-full md:w-[300px]">
                            <Combobox value={selectedImsi} onValueChange={setSelectedImsi}>
                                <ComboboxInput className="cursor-pointer h-10 w-full rounded-md border-input bg-background focus:bg-background" placeholder={t("selectDevice", { defaultValue: "Select Device" })} />
                                <ComboboxContent searchPlaceholder={t("searchDevice", { defaultValue: "Search IMSI..." })}>
                                    <ComboboxEmpty>{t("noDeviceFound", { defaultValue: "No device found." })}</ComboboxEmpty>
                                    <ComboboxList>
                                        {availableImsis.map((imsi) => (
                                            <ComboboxItem key={imsi} value={imsi}>
                                                {imsi}
                                            </ComboboxItem>
                                        ))}
                                    </ComboboxList>
                                </ComboboxContent>
                            </Combobox>
                        </div>
                        <Button onClick={handleAddDevice} disabled={!selectedImsi || isAddingDevice} className="cursor-pointer w-full md:w-auto">
                            {isAddingDevice && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <Plus className="mr-2 h-4 w-4" />
                            {t("add", { defaultValue: "Add" })}
                        </Button>
                    </div>

                    <div className="flex-1 overflow-hidden border rounded-md min-h-0 flex flex-col">
                        <div className="flex-1 overflow-auto">
                            <Table className="relative w-full whitespace-nowrap md:whitespace-normal">
                                <TableHeader className="bg-muted/50 sticky top-0 z-10 shadow-sm">
                                    <TableRow>
                                        <TableHead>{t("table.imsi")}</TableHead>
                                        <TableHead className="w-[200px]">{t("table.name")}</TableHead>
                                        <TableHead className="w-[150px]">{t("table.gov")}</TableHead>
                                        <TableHead className="w-[120px]">{t("table.lat")}</TableHead>
                                        <TableHead className="w-[120px]">{t("table.lng")}</TableHead>
                                        <TableHead className="text-right">{t("table.actions")}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-24 text-center">
                                                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                    <span>{t("loading", { defaultValue: "Loading..." })}</span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : paginatedData.length ? (
                                        paginatedData.map((item, index) => (
                                            <TableRow key={`${item.imsi}-${index}`}>
                                                <TableCell>{item.imsi}</TableCell>
                                                <TableCell>
                                                    <Input
                                                        className="min-w-[120px]"
                                                        value={item.street_light_name}
                                                        onChange={(e) => handleInputChange(index, "street_light_name", e.target.value)}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        className="min-w-[120px]"
                                                        value={item.gov_name}
                                                        onChange={(e) => handleInputChange(index, "gov_name", e.target.value)}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        className="min-w-[100px]"
                                                        value={item.lat || ""}
                                                        onChange={(e) => handleInputChange(index, "lat", e.target.value)}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        className="min-w-[100px]"
                                                        value={item.lng || ""}
                                                        onChange={(e) => handleInputChange(index, "lng", e.target.value)}
                                                    />
                                                </TableCell>
                                                <TableCell className="text-right space-x-2 whitespace-nowrap">
                                                    <Button
                                                        size="icon"
                                                        className="cursor-pointer h-8 w-8 bg-green-600 hover:bg-green-700 text-white"
                                                        disabled={savingImsi === item.imsi || deletingImsi === item.imsi}
                                                        onClick={() => handleSave(item)}
                                                    >
                                                        {savingImsi === item.imsi ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Save className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                    <Button
                                                        variant="destructive"
                                                        size="icon"
                                                        className="cursor-pointer h-8 w-8"
                                                        disabled={savingImsi === item.imsi || deletingImsi === item.imsi}
                                                        onClick={() => {
                                                            setDeviceToDelete(item)
                                                            setOpenDeleteAlert(true)
                                                        }}
                                                    >
                                                        {deletingImsi === item.imsi ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center">
                                            {t("noData")}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                {/* Pagination Controls */}
                {!loading && filteredData.length > 0 && (
                    <div className="flex items-center justify-between py-2">
                        <div className="text-sm text-muted-foreground">
                            {t("pagination", {
                                page: currentPage,
                                totalPage: totalPages,
                                totalItems: filteredData.length
                            })}
                        </div>
                        <div className="flex items-center space-x-2">
                            <Button
                                variant="outline"
                                className="h-8 w-8 p-0"
                                onClick={handlePrevPage}
                                disabled={currentPage === 1}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                className="h-8 w-8 p-0"
                                onClick={handleNextPage}
                                disabled={currentPage === totalPages}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
                    </div>
            </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={openDeleteAlert} onOpenChange={setOpenDeleteAlert}>
            <AlertDialogContent className="z-[60]">
                <AlertDialogHeader>
                    <AlertDialogTitle>
                        {t("deleteDialogTitle", { defaultValue: "ยืนยันการลบอุปกรณ์" })}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        {t("deleteDialogDescription", {
                            defaultValue: `คุณต้องการลบอุปกรณ์ IMSI: ${deviceToDelete?.imsi} ออกจากกลุ่ม ${group.group_name} หรือไม่?`,
                            imsi: deviceToDelete?.imsi || "",
                            groupName: group.group_name
                        })}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={!!deletingImsi}>
                        {t("cancel", { defaultValue: "ยกเลิก" })}
                    </AlertDialogCancel>
                    <AlertDialogAction
                        className="bg-destructive hover:bg-destructive/90 cursor-pointer text-white"
                        disabled={!!deletingImsi}
                        onClick={async (e) => {
                            e.preventDefault()
                            if (deviceToDelete) {
                                await handleDelete(deviceToDelete)
                                setOpenDeleteAlert(false)
                                setDeviceToDelete(null)
                            }
                        }}
                    >
                        {deletingImsi && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t("deleteConfirm", { defaultValue: "ยืนยันการลบ" })}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        </>
    )
}
