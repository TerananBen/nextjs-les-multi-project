"use client"

import { ColumnDef } from "@tanstack/react-table"
import { StreetLightDevice } from "@/types/street-light"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useTranslations } from "next-intl"
import {
    Lightbulb,
    RefreshCcw,
    FileText,
    Activity,
    Power,
    Clock,
    Sun,
    Moon,
    MapPin,
    Hand,
    MousePointer2,
    Layers,
    X,
    ArrowUpDown
} from "lucide-react"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { refreshStreetLightPowerAction, sendStreetLightCommandAction } from "@/app/actions/street-light"
import * as React from "react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Slider } from "@/components/ui/slider"
import { Send } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { HistoryPowerDialog } from "./history-power-dialog"

// --- Command Cell Component ---
const CommandCell = ({
    initialCommand,
    imei
}: {
    initialCommand: string[],
    imei: string
}) => {
    const t = useTranslations("StreetLight.table")
    const [open, setOpen] = React.useState(false)
    const [loading, setLoading] = React.useState(false)

    // Parse initial state
    // initialCommand[0]: "0" (Off) or "1" (On)
    // initialCommand[1]: Dim percent "0"-"100"
    const isOn = initialCommand?.[0] === "1"
    const initialDim = parseInt(initialCommand?.[1] || "0", 10)

    const [dimLevel, setDimLevel] = React.useState(initialDim)

    // Update local state if prop changes (optional, but good for table updates)
    React.useEffect(() => {
        setDimLevel(initialDim)
    }, [initialDim])

    const handleSend = async () => {
        setLoading(true)
        try {
            // Logic: If dim > 0 -> Open (1), else Close (0) or User intent is to set this level.
            // If dim == 0, we can assume off, or just send 0% brightness (which is effectively off).
            // User requirement: "If ON, give brightness value". 
            // So if we are sending, we send Command "1" (On) with the Dim Level.
            // But if Dim is 0, maybe we should send "0"? 
            // Let's stick to: If > 0 send "1", else "0".
            const commandType = dimLevel > 0 ? "1" : "0"

            const result = await sendStreetLightCommandAction(imei, commandType, dimLevel.toString())
            if (result.success) {
                toast.success(t("commandSuccess"))
                setOpen(false)
            } else {
                toast.error(t("commandFailed"))
            }
        } catch (error) {
            toast.error(t("refreshError"))
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex justify-center">
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <div className="flex w-[100px] h-[30px] rounded-full overflow-hidden shadow-sm hover:opacity-90 transition-opacity cursor-pointer">
                        {/* Percentage Side */}
                        <div className={cn(
                            "flex-1 flex items-center justify-center text-xs font-bold text-white",
                            isOn ? "bg-green-400" : "bg-gray-300 text-gray-600"
                        )}>
                            {dimLevel}%
                        </div>
                        {/* Icon Side */}
                        <div className={cn(
                            "flex-1 flex items-center justify-center text-white",
                            isOn ? "bg-green-500" : "bg-gray-400"
                        )}>
                            {isOn ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                        </div>
                    </div>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-center text-lg font-bold">{t("controlTitle")}</DialogTitle>
                        <div className="text-center text-sm text-muted-foreground">{imei}</div>
                    </DialogHeader>

                    <div className="py-6 space-y-6">
                        {/* Slider Section */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center px-1 gap-4">
                                <span className="text-sm font-medium shrink-0">{t("brightness")}</span>
                                <div className="flex items-center gap-1">
                                    <Input
                                        type="text" // Use text to control validation manually or number
                                        value={dimLevel}
                                        onChange={(e) => {
                                            const val = e.target.value
                                            // Allow empty for typing
                                            if (val === "") {
                                                // @ts-ignore - temporary cast for transition valid number
                                                setDimLevel("" as any)
                                                return
                                            }
                                            const num = parseInt(val, 10)
                                            if (!isNaN(num)) {
                                                if (num > 100) setDimLevel(100)
                                                else if (num < 0) setDimLevel(0) // Logic allows 0 but user said 1-100. Let's stick to 0-100 range in general but UI text said 1-100. Slider allows 0.
                                                else setDimLevel(num)
                                            }
                                        }}
                                        onBlur={() => {
                                            if (dimLevel === "" as any) setDimLevel(0)
                                        }}
                                        className="w-16 h-8 text-right font-bold text-primary"
                                    />
                                    <span className="text-sm font-bold text-primary">%</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <Slider
                                    defaultValue={[Number(dimLevel) || 0]}
                                    value={[Number(dimLevel) || 0]}
                                    max={100}
                                    step={1}
                                    onValueChange={(vals) => setDimLevel(vals[0])}
                                    className="w-full flex-1"
                                />
                                <Button
                                    onClick={handleSend}
                                    disabled={loading}
                                    className="h-10 w-10 shrink-0 bg-blue-500 hover:bg-blue-600 text-white rounded-full p-0 flex items-center justify-center"
                                >
                                    {loading ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <div className="flex items-center justify-center text-xs font-bold w-full h-full">
                                        <Send className="h-4 w-4" />
                                    </div>}
                                </Button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export const useStreetLightColumns = () => {
    const t = useTranslations("StreetLight.table")

    const columns: ColumnDef<StreetLightDevice>[] = [
        {
            accessorKey: "streetLightName", // Name
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        {t("streetLightName")}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                return (
                    <div className="flex flex-col">
                        <span className="font-semibold text-sm">{row.original.streetLightName || "-"}</span>
                    </div>
                )
            },
        },
        {
            accessorKey: "imeI_Name", // IMEI
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        IMEI
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => <div className="text-sm">{row.original.imeI_Name || "-"}</div>,
        },
        {
            accessorKey: "streetLightSerial", // Gov / Asset ID
            header: ({ column }) => {
                return (
                    <div className="text-center">
                        <Button
                            variant="ghost"
                            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        >
                            {t("gov")}
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                )
            },
            cell: ({ row }) => <div className="text-center">{row.original.streetLightSerial || "-"}</div>
        },
        {
            accessorKey: "streetLightGroups",
            header: t("groupName"),
            cell: ({ row }) => {
                const groups = row.original.streetLightGroups || []
                return (
                    <div className="flex justify-center">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="default" size="icon" className="h-8 w-8 bg-blue-500 hover:bg-blue-600 rounded-lg cursor-pointer">
                                    <Layers className="h-4 w-4 text-white" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 p-4">
                                <div className="space-y-2">
                                    <div className="font-medium border-b pb-2 mb-2">
                                        {t("groupName")} ({groups.length})
                                    </div>
                                    <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto">
                                        {groups.length > 0 ? (
                                            groups.map((group, index) => (
                                                <div key={index} className="text-sm p-2 bg-muted/50 rounded-md">
                                                    {group}
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-sm text-center text-muted-foreground py-2">
                                                {t("noData")}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                )
            },
        },
        {
            accessorKey: "streetLightLastUpdate",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        {t("lastUpdate")}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => <div className="text-center text-sm">{row.original.streetLightLastUpdate || "-"}</div>
        },
        {
            accessorKey: "lifeTime",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        {t("lifeTime")}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => <div className="text-center text-sm">{row.original.lifeTime}</div>
        },
        {
            accessorKey: "lastPower",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        {t("lastPower")}
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const [power, setPower] = React.useState(row.original.lastPower || "0");
                const [loading, setLoading] = React.useState(false);

                const handleRefresh = async () => {
                    setLoading(true);
                    try {
                        const gatewayId = row.original.gatewayId;
                        const imei = row.original.imeI_Name;
                        if (!gatewayId || !imei) {
                            toast.error(t("errorConfigMissing"));
                            return;
                        }

                        // Call Server Action
                        // Dynamically imported to avoid Client Module errors if action not fully ready? 
                        // No, import at top.
                        const result = await refreshStreetLightPowerAction(gatewayId, imei);

                        if (result.success) {
                            setPower(result.power);
                            toast.success(t("refreshSuccess"));
                        } else {
                            toast.error(t("refreshFailed"));
                        }
                    } catch (error) {
                        toast.error(t("refreshError"));
                    } finally {
                        setLoading(false);
                    }
                };

                return (
                    <div className="flex items-center justify-center gap-2">
                        <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-md min-w-[100px] justify-between">
                            <Lightbulb className="h-4 w-4 text-blue-500" />
                            <span className="text-sm font-medium">{power} W</span>
                        </div>
                        <Button
                            variant="default"
                            size="icon"
                            className="h-8 w-8 bg-blue-500 hover:bg-blue-600 rounded-lg cursor-pointer"
                            onClick={handleRefresh}
                            disabled={loading}
                        >
                            <RefreshCcw className={cn("h-4 w-4 text-white", loading && "animate-spin")} />
                        </Button>
                    </div>
                )
            }
        },
        {
            id: "command",
            header: t("command"),
            cell: ({ row }) => (
                <CommandCell
                    initialCommand={row.original.streetLightCommand || ["0", "0"]}
                    imei={row.original.imeI_Name}
                />
            )
        },
        {
            id: "logPower",
            header: t("logPower"),
            cell: ({ row }) => {
                const imei = row.original.imeI_Name
                const deviceName = row.original.streetLightName
                return (
                    <div className="flex justify-center">
                        <HistoryPowerDialog imei={imei} deviceName={deviceName} />
                    </div>
                )
            }
        },
        {
            id: "logControl",
            header: t("logControl"),
            cell: () => (
                <div className="flex justify-center">
                    <Button variant="default" size="icon" className="h-8 w-8 bg-green-500 hover:bg-green-600 rounded-lg">
                        <Activity className="h-4 w-4 text-white" />
                    </Button>
                </div>
            )
        },
        {
            id: "automatic",
            header: t("automatic"),
            cell: ({ row }) => {
                const isAuto = row.original.typeSchedule === "light" // Example
                return (
                    <div className="flex justify-center items-center gap-2">
                        <div className={`flex items-center justify-center h-8 w-8 rounded-full ${isAuto ? 'bg-green-500' : 'bg-gray-300'}`}>
                            <Power className="h-4 w-4 text-white" />
                        </div>
                        <div className={`flex items-center justify-center h-8 w-8 rounded-full border ${isAuto ? 'border-green-500 text-green-500' : 'border-gray-300 text-gray-300'}`}>
                            {isAuto ? <Clock className="h-4 w-4" /> : <Hand className="h-4 w-4" />}
                        </div>
                    </div>
                )
            }
        },
    ]

    return columns
}
