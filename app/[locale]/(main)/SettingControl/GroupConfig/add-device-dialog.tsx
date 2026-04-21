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
import { ChevronLeft, ChevronRight, Loader2, Search, Trash2, Save, Check, PlusSquare, ChevronsUpDown } from "lucide-react"
import { ConfirmButton } from "@/components/ui/confirm-button"
import { configLatLongLampAndPoleAction, deleteImsiGroupConfigAction, getListDataIMSIAllAction, addRtuToGroupAction } from "@/app/actions/group-config"
import { toast } from "sonner"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

// ... imports

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
    const [isAddDeviceOpen, setIsAddDeviceOpen] = React.useState(false)
    const [isAddingDevice, setIsAddingDevice] = React.useState(false)

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
                        getDataLatLongAction(group.group_name),
                        getListDataIMSIAllAction()
                    ])

                    if (allImsis) setAvailableImsis(allImsis)

                    if (groupDetails) {
                        // Merge location data into group details
                        const mergedData: GroupDetailWithLocation[] = groupDetails.map(item => {
                            const location = latLongData?.find(l => l.imsi === item.imsi)
                            return {
                                ...item,
                                lat: location?.lat || "-",
                                lng: location?.lng || "-"
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
    }, [open, group.group_name])

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
    }

    const handleDelete = async (item: GroupDetailWithLocation) => {
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
                const [groupDetails, latLongData] = await Promise.all([
                    getListDataGroupDetailAction(group.group_name),
                    getDataLatLongAction(group.group_name)
                ])

                if (groupDetails) {
                    const mergedData: GroupDetailWithLocation[] = groupDetails.map(item => {
                        const location = latLongData?.find(l => l.imsi === item.imsi)
                        return {
                            ...item,
                            lat: location?.lat || "-",
                            lng: location?.lng || "-"
                        }
                    })
                    setData(mergedData)
                }

                setIsAddDeviceOpen(false)
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
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[95vw] md:max-w-[85vw] lg:max-w-[75vw] h-[95vh] md:h-[85vh] flex flex-col p-4 sm:p-6 overflow-hidden">
                <DialogHeader>
                    <DialogTitle>{t("title")}</DialogTitle>
                    <DialogDescription>
                        {t("description")} ({group.group_name})
                    </DialogDescription>
                </DialogHeader>

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

                    <Popover open={isAddDeviceOpen} onOpenChange={setIsAddDeviceOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" role="combobox" aria-expanded={isAddDeviceOpen} className="cursor-pointer justify-between">
                                {selectedImsi
                                    ? selectedImsi
                                    : t("selectDevice", { defaultValue: "Select Device" })}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0">
                            <Command>
                                <CommandInput placeholder={t("searchDevice", { defaultValue: "Search IMSI..." })} />
                                <CommandList>
                                    <CommandEmpty>{t("noDeviceFound", { defaultValue: "No device found." })}</CommandEmpty>
                                    <CommandGroup>
                                        {availableImsis.map((imsi) => (
                                            <CommandItem
                                                key={imsi}
                                                value={imsi}
                                                onSelect={(currentValue) => {
                                                    setSelectedImsi(currentValue === selectedImsi ? "" : currentValue)
                                                    setIsAddDeviceOpen(false)
                                                }}
                                            >
                                                <Check
                                                    className={cn(
                                                        "mr-2 h-4 w-4",
                                                        selectedImsi === imsi ? "opacity-100" : "opacity-0"
                                                    )}
                                                />
                                                {imsi}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                    <Button onClick={handleAddDevice} disabled={!selectedImsi || isAddingDevice} className="cursor-pointer w-full md:w-auto">
                        {isAddingDevice && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <PlusSquare className="mr-2 h-4 w-4" />
                        {t("add", { defaultValue: "Add" })}
                    </Button>
                </div>

                <div className="flex-1 overflow-hidden border rounded-md min-h-0 flex flex-col">
                    <div className="flex-1 overflow-auto">
                        <Table className="relative w-full whitespace-nowrap md:whitespace-normal">
                            <TableHeader className="bg-muted/50 sticky top-0 z-10 shadow-sm">
                                <TableRow>
                                    <TableHead className="w-[200px]">{t("table.name")}</TableHead>
                                    <TableHead>{t("table.imsi")}</TableHead>
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
                                            <TableCell>
                                                <Input
                                                    className="min-w-[120px]"
                                                    value={item.street_light_name}
                                                    onChange={(e) => handleInputChange(index, "street_light_name", e.target.value)}
                                                />
                                            </TableCell>
                                            <TableCell>{item.imsi}</TableCell>
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
                                                <ConfirmButton
                                                    initialLabel={<Save className="h-4 w-4" />}
                                                    confirmLabel={<Check className="h-4 w-4" />}
                                                    onConfirm={() => handleSave(item)}
                                                    onCancel={() => toast.info(t("saveCancelled"))}
                                                    size="icon"
                                                    className="cursor-pointer h-8 w-8 bg-green-600 hover:bg-green-700 text-white"
                                                />
                                                <ConfirmButton
                                                    initialLabel={<Trash2 className="h-4 w-4" />}
                                                    confirmLabel={<Check className="h-4 w-4" />}
                                                    onConfirm={() => handleDelete(item)}
                                                    onCancel={() => toast.info(t("deleteCancelled"))}
                                                    variant="destructive"
                                                    size="icon"
                                                    className="cursor-pointer h-8 w-8"
                                                />
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
            </DialogContent>
        </Dialog>
    )
}
