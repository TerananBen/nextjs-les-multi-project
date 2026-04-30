"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { GroupConfigData, GroupDetailWithLocation, LatLongResponseControlData } from "@/types/group-config"
import {
    getListDataGroupDetailAction,
    getDataLatLongAction,
    sendCommandMqttMultiGroupV2Action,
    sendCommandMqttMultiRtuV2Action,
    resendCommandOnOffAction,
    getDataLatLongResponseControlAction
} from "@/app/actions/group-config"
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
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
    Loader2,
    Search,
    Wifi,
    WifiOff,
    RefreshCw,
    RotateCcw,
    Power,
    PowerOff
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface ControlGroupDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    group: GroupConfigData
}

interface DeviceStatus extends GroupDetailWithLocation {
    isOnline: boolean
    commandStatus?: "pending" | "success" | "failed" | null
}

function formatTimestamp(timestamp: string): string {
    if (!timestamp) return "-";
    // Check if timestamp is unix seconds (numbers only)
    if (/^\d+$/.test(timestamp)) {
        try {
            const date = new Date(parseInt(timestamp) * 1000); // 1769497613 * 1000
            // Format: YYYY-MM-DD HH:mm:ss
            const day = date.getDate().toString().padStart(2, '0');
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const year = date.getFullYear();
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            const seconds = date.getSeconds().toString().padStart(2, '0');
            return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        } catch {
            return timestamp;
        }
    }
    return timestamp;
}

function parseCustomDate(dateStr: string): Date | null {
    if (!dateStr) return null;
    try {
        // If unix timestamp
        if (/^\d+$/.test(dateStr)) {
            return new Date(parseInt(dateStr) * 1000);
        }

        // Existing format check just in case: 27-01-2026 14:06:53
        const parts = dateStr.split(" ");
        if (parts.length === 2) {
            const [datePart, timePart] = parts;
            if (datePart.includes("-")) {
                const [day, month, year] = datePart.split("-").map(Number);
                const [hour, minute, second] = timePart.split(":").map(Number);
                if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                    return new Date(year, month - 1, day, hour || 0, minute || 0, second || 0);
                }
            }
        }
        return new Date(dateStr) // Fallback
    } catch {
        return null;
    }
}

const DeviceRow = React.memo(({
    item,
    isSelected,
    onSelect,
    t
}: {
    item: DeviceStatus,
    isSelected: boolean,
    onSelect: (imsi: string, checked: boolean) => void,
    t: (key: string) => string
}) => {
    return (
        <TableRow key={item.imsi} className="whitespace-nowrap">
            <TableCell>
                <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => onSelect(item.imsi, !!checked)}
                />
            </TableCell>
            <TableCell className="max-w-[100px] sm:max-w-[100px] truncate" title={item.imsi}>{item.imsi}</TableCell>
            <TableCell className="font-medium max-w-[150px] sm:max-w-[250px] truncate" title={item.street_light_name}>{item.street_light_name}</TableCell>
            <TableCell className="max-w-[120px] sm:max-w-[200px] truncate" title={item.gov_name}>{item.gov_name}</TableCell>
            <TableCell className="max-w-[100px] sm:max-w-[100px] truncate" title={String(item.lat)}>{item.lat}</TableCell>
            <TableCell className="max-w-[80px] sm:max-w-[100px] truncate" title={String(item.lng)}>{item.lng}</TableCell>

            <TableCell>{formatTimestamp(item.time_stamp)}</TableCell>
            <TableCell className="text-center">
                <div className="flex justify-center" title={item.isOnline ? "Online" : "Offline"}>
                    {item.isOnline ? (
                        <Wifi className="h-5 w-5 text-green-500" />
                    ) : (
                        <WifiOff className="h-5 w-5 text-muted-foreground" />
                    )}
                </div>
            </TableCell>
            <TableCell className="text-center">
                {item.commandStatus === "success" && <Badge className="bg-green-500 hover:bg-green-600">{t("success")}</Badge>}
                {item.commandStatus === "failed" && <Badge variant="destructive">{t("failed")}</Badge>}
                {item.commandStatus === "pending" && (
                    <Badge variant="outline" className="animate-pulse">{t("pending")}</Badge>
                )}
            </TableCell>
        </TableRow>
    )
})
DeviceRow.displayName = "DeviceRow"

export function ControlGroupDialog({ open, onOpenChange, group }: ControlGroupDialogProps) {
    const t = useTranslations("GroupConfig.controlDialog")

    // Data State
    const [data, setData] = React.useState<DeviceStatus[]>([])
    const [originalData, setOriginalData] = React.useState<DeviceStatus[]>([])
    const [loading, setLoading] = React.useState(false)
    const [searchQuery, setSearchQuery] = React.useState("")

    // Command State
    const [selectedImsis, setSelectedImsis] = React.useState<Set<string>>(new Set())
    const [dimPercent, setDimPercent] = React.useState(100)
    const [isSending, setIsSending] = React.useState(false)
    const [isChecking, setIsChecking] = React.useState(false)
    const [commandToken, setCommandToken] = React.useState<string | null>(null)

    // Derived State
    const filteredData = React.useMemo(() => {
        if (!searchQuery) return data
        const lowerQuery = searchQuery.toLowerCase()
        return data.filter(item =>
            item.street_light_name.toLowerCase().includes(lowerQuery) ||
            item.imsi.toLowerCase().includes(lowerQuery) ||
            item.gov_name.toLowerCase().includes(lowerQuery)
        )
    }, [data, searchQuery])

    const allSelected = filteredData.length > 0 && selectedImsis.size === filteredData.length
    const isIndeterminate = selectedImsis.size > 0 && selectedImsis.size < filteredData.length

    // Fetch Data
    const fetchData = React.useCallback(async () => {
        setLoading(true)
        try {
            const [groupDetails, latLongData] = await Promise.all([
                getListDataGroupDetailAction(group.group_name),
                getDataLatLongAction(group.group_name)
            ])

            if (groupDetails) {
                const now = new Date()
                const mergedData: DeviceStatus[] = groupDetails.map(item => {
                    const location = latLongData?.find(l => l.imsi === item.imsi)

                    // Check online status: < 24 hours
                    // Format: 27-01-2026 14:06:53
                    let isOnline = false
                    if (item.time_stamp) {
                        const date = parseCustomDate(item.time_stamp)
                        if (date) {
                            const diffMs = now.getTime() - date.getTime()
                            const diffHours = diffMs / (1000 * 60 * 60)
                            isOnline = diffHours < 24 && diffHours >= 0
                        }
                    }

                    return {
                        ...item,
                        lat: location?.lat || "-",
                        lng: location?.lng || "-",
                        isOnline,
                        commandStatus: null
                    }
                })
                setOriginalData(mergedData)
                setData(mergedData)

                // Select All by default
                const allImsis = mergedData.map(d => d.imsi)
                setSelectedImsis(new Set(allImsis))
            }
        } catch (error) {
            console.error("Failed to fetch group details", error)
            toast.error(t("fetchError"))
        } finally {
            setLoading(false)
        }
    }, [group.group_name, t])

    React.useEffect(() => {
        if (open) {
            fetchData()
        } else {
            setCommandToken(null)
            setSelectedImsis(new Set())
            setSearchQuery("")
        }
    }, [open, fetchData])


    const handleCheckStatus = async () => {
        if (!commandToken) return
        setIsChecking(true)
        try {
            const result = await getDataLatLongResponseControlAction(commandToken, group.group_code)
            if (result.result && result.dataReturn) {
                let successCount = 0;
                let failCount = 0;
                const statusData = result.dataReturn as LatLongResponseControlData[]
                setData(prev => prev.map(item => {
                    const statusItem = statusData?.find(r => r.imsi === item.imsi)
                    if (statusItem) {
                        if (statusItem.status === "1") successCount++;
                        if (statusItem.status === "0") failCount++;
                        return {
                            ...item,
                            commandStatus: statusItem.status === "1" ? "success" : "failed"
                        }
                    }
                    return item
                }))
                toast.success(t("statusUpdated", { success: successCount, failed: failCount }))
            }
        } catch (error) {
            console.error("Check status error", error)
        } finally {
            setIsChecking(false)
        }
    }


    // Handlers
    // Handlers
    const handleSelectAll = React.useCallback((checked: boolean | "indeterminate") => {
        if (checked === true) {
            const allImsis = filteredData.map(d => d.imsi)
            setSelectedImsis(new Set(allImsis))
        } else {
            setSelectedImsis(new Set())
        }
    }, [filteredData])

    const handleSelectRow = React.useCallback((imsi: string, checked: boolean) => {
        setSelectedImsis(prev => {
            const newSelected = new Set(prev)
            if (checked) {
                newSelected.add(imsi)
            } else {
                newSelected.delete(imsi)
            }
            return newSelected
        })
    }, [])

    const handleSendCommand = async (commandType: "0" | "1") => {
        if (selectedImsis.size === 0) {
            toast.warning(t("selectDeviceWarning"))
            return
        }

        setIsSending(true)
        setCommandToken(null) // Reset previous token

        // Clear previous status for selected
        setData(prev => prev.map(d => selectedImsis.has(d.imsi) ? { ...d, commandStatus: "pending" } : d))

        try {
            let result;
            // Check if we are selecting ALL visible devices AND the selection matches the full group 
            // OR the user specifically wants to use group command?
            // The user requirement said: "2.1 api ส่งความคุมทั้งกลุ่ม (group)" vs "2.2 choose specific".
            // If user clicks "Select All" and it covers the whole group, we could use group command.
            // But robust way is:
            // If (selected count == total group count) -> Use Group API (more efficient?)
            // Actually, filtered data might hide some.
            // Let's logic: If selectedImsis.size === originalData.length -> Use Group API.
            // Else -> Use MultiRtu API.

            if (selectedImsis.size === originalData.length) {
                // Use Group API
                result = await sendCommandMqttMultiGroupV2Action({
                    group_code: group.group_code, // Note: user said group_code but showed array in example `["CODE"]`. 
                    // However, action logic I wrote wraps it in array.
                    command_type: commandType,
                    dim_percent: dimPercent.toString()
                })
            } else {
                // Use Specific Device API
                result = await sendCommandMqttMultiRtuV2Action({
                    list_imsi: Array.from(selectedImsis),
                    command_type: commandType,
                    dim_percent: dimPercent.toString()
                })
            }

            if (result.result && result.dataReturn) {
                toast.success(t("commandSent"))
                setCommandToken(result.dataReturn)
            } else {
                toast.error(result.message || t("commandFailed"))
                // Reset status
                setData(prev => prev.map(d => selectedImsis.has(d.imsi) ? { ...d, commandStatus: null } : d))
            }

        } catch (error) {
            console.error("Command error", error)
            toast.error(t("commandFailed"))
        } finally {
            setIsSending(false)
        }
    }

    const handleResend = async () => {
        if (!commandToken) return
        try {
            const result = await resendCommandOnOffAction(commandToken)
            if (result.result) {
                toast.success(t("resendSuccess"))
            } else {
                toast.error(t("resendFailed"))
            }
        } catch {
            toast.error(t("resendError"))
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="md:max-w-[85vw] lg:max-w-[60vw] xl:max-w-[50vw] h-[80vh] flex flex-col p-4 sm:p-3 gap-3 sm:gap-4 overflow-hidden">
                <DialogHeader>
                    <DialogTitle>{t("title")} - {group.group_name}</DialogTitle>
                    <DialogDescription>
                        {t("description")}
                    </DialogDescription>
                </DialogHeader>

                {/* Control Panel */}
                <div className="flex flex-col gap-4 p-4 border rounded-md bg-muted/20">
                    {/* Top Row: Brightness & Main Actions */}
                    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 w-full">
                        <div className="flex items-center gap-3 w-full xl:flex-1">
                            <span className="text-sm font-medium whitespace-nowrap">{t("brightness")}: {dimPercent}%</span>
                            <Slider
                                value={[dimPercent]}
                                onValueChange={(vals) => setDimPercent(vals[0])}
                                max={100}
                                step={1}
                                className="flex-1 cursor-pointer"
                            />
                            <Input
                                type="number"
                                min={0}
                                max={100}
                                value={dimPercent}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value)
                                    if (!isNaN(val) && val >= 0 && val <= 100) setDimPercent(val)
                                }}
                                className="w-[70px] h-9 shrink-0"
                            />
                        </div>

                        <div className="flex items-center gap-2 w-full xl:w-auto shrink-0 justify-end">
                            <Button
                                onClick={() => handleSendCommand("1")}
                                disabled={isSending || selectedImsis.size === 0}
                                className="flex-1 xl:flex-none cursor-pointer bg-green-600 hover:bg-green-700 text-white"
                            >
                                <Power className="w-4 h-4 mr-2" />
                                {t("on")}
                            </Button>
                            <Button
                                onClick={() => handleSendCommand("0")}
                                disabled={isSending || selectedImsis.size === 0}
                                variant="destructive"
                                className="flex-1 xl:flex-none cursor-pointer"
                            >
                                <PowerOff className="w-4 h-4 mr-2" />
                                {t("off")}
                            </Button>
                        </div>
                    </div>

                    {/* Bottom Row: Search & Advanced Actions */}
                    <div className="flex flex-col md:flex-row md:items-center gap-4 w-full">
                        {commandToken && (
                            <div className="flex items-center gap-2 w-full md:flex-1">
                                <Button
                                    onClick={handleResend}
                                    variant="outline"
                                    className="flex-1 cursor-pointer"
                                    title={t("resend")}
                                >
                                    <RotateCcw className="w-4 h-4 mr-2" />
                                    {t("resend")}
                                </Button>
                                <Button
                                    onClick={handleCheckStatus}
                                    disabled={isChecking}
                                    variant="outline"
                                    className="flex-1 cursor-pointer"
                                >
                                    <RefreshCw className={cn("w-4 h-4 mr-2", isChecking && "animate-spin")} />
                                    {t("checkStatus")}
                                </Button>
                            </div>
                        )}

                        <div className={cn("relative w-full", commandToken && "md:flex-1")}>
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={t("searchPlaceholder")}
                                className="pl-9 h-9 w-full"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
                {/* Device Table */}
                <div className="flex-1 overflow-hidden border rounded-md min-h-0 flex flex-col">
                    <div className="flex-1 overflow-auto">
                        <Table className="relative w-full">
                            <TableHeader className="bg-muted/50 sticky top-0 z-10 shadow-sm">
                                <TableRow>
                                    <TableHead className="w-[50px]">
                                        <Checkbox
                                            className="cursor-pointer"
                                            checked={isIndeterminate ? "indeterminate" : allSelected}
                                            onCheckedChange={handleSelectAll}
                                        />
                                    </TableHead>
                                    <TableHead>{t("table.imsi")}</TableHead>
                                    <TableHead>{t("table.name")}</TableHead>
                                    <TableHead>{t("table.asset")}</TableHead>
                                    <TableHead className="w-[80px] sm:w-[100px]">{t("table.lat")}</TableHead>
                                    <TableHead className="w-[80px] sm:w-[100px]">{t("table.lng")}</TableHead>
                                    <TableHead>{t("table.lastWorkTime")}</TableHead>
                                    <TableHead className="text-center">{t("table.status")}</TableHead>
                                    <TableHead className="text-center">{t("table.cmdStatus")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="h-24 text-center">
                                            <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                <span>{t("loading", { defaultValue: "Loading..." })}</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : filteredData.length ? (
                                    filteredData.map((item) => (
                                        <DeviceRow
                                            key={item.imsi}
                                            item={item}
                                            isSelected={selectedImsis.has(item.imsi)}
                                            onSelect={handleSelectRow}
                                            t={t}
                                        />
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={9} className="h-24 text-center">
                                            {t("noData")}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                <div className="p-2 text-xs text-muted-foreground flex justify-between">
                    <div>{t("selectedCount", { count: selectedImsis.size })}</div>
                    <div>{t("totalCount", { count: data.length })}</div>
                </div>

            </DialogContent>
        </Dialog>
    )
}
