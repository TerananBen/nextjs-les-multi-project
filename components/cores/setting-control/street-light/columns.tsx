"use client"

import { ColumnDef } from "@tanstack/react-table"
import { StreetLightDevice } from "@/types/street-light"
import { Button } from "@/components/ui/button"
import { useTranslations } from "next-intl"
import {
    Lightbulb,
    RefreshCcw,
    Sun,
    Moon,
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
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Send } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { HistoryPowerDialog } from "./history-power-dialog"
import { usePermission } from "@/components/providers/permission-provider"

// --- Command Cell Component ---
const CommandCell = ({
    initialCommand,
    imei,
    deviceName,
    onCommandSuccess,
}: {
    initialCommand: string[],
    imei: string,
    deviceName?: string,
    onCommandSuccess?: (imei: string, command: [string, string]) => void,
}) => {
    const t = useTranslations("StreetLight.table")
    const { getPermission } = usePermission()
    const permissions = getPermission("V_StreetLight")
    const canControl = permissions.control

    const [open, setOpen] = React.useState(false)
    const [loading, setLoading] = React.useState(false)

    // Committed state (what is actually active/displayed in table)
    const initialIsOn = initialCommand?.[0] === "1"
    const initialDimVal = parseInt(initialCommand?.[1] || "0", 10)

    const [committedDim, setCommittedDim] = React.useState<number>(initialDimVal)
    const [committedIsOn, setCommittedIsOn] = React.useState<boolean>(initialIsOn)

    // Draft state (isolated inside Dialog only)
    const [draftDim, setDraftDim] = React.useState<number>(initialDimVal)

    // Synchronize committed state when initialCommand prop updates
    React.useEffect(() => {
        setCommittedDim(initialDimVal)
        setCommittedIsOn(initialIsOn)
    }, [initialDimVal, initialIsOn])

    // On Dialog open/close: reset draft state to current committed value
    const handleOpenChange = (nextOpen: boolean) => {
        if (!canControl && nextOpen) {
            toast.error(t("permissionDenied"))
            return
        }
        if (nextOpen) {
            setDraftDim(committedDim)
        }
        setOpen(nextOpen)
    }

    const handleSend = async () => {
        setLoading(true)
        try {
            const commandType = draftDim > 0 ? "1" : "0"
            const result = await sendStreetLightCommandAction(imei, commandType, draftDim.toString())
            if (result.success) {
                toast.success(t("commandSuccess"))
                // Commit draft value to active state upon successful API call
                setCommittedDim(draftDim)
                setCommittedIsOn(draftDim > 0)
                onCommandSuccess?.(imei, [commandType, draftDim.toString()])
                setOpen(false)
            } else {
                toast.error(t("commandFailed"))
            }
        } catch {
            toast.error(t("refreshError"))
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex justify-center">
            <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogTrigger asChild>
                    <button
                        type="button"
                        className={cn(
                            "flex w-[100px] h-[30px] rounded-full overflow-hidden shadow-xs transition-all border",
                            committedIsOn
                                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20"
                                : "border-border bg-muted/60 text-muted-foreground hover:bg-muted",
                            canControl ? "cursor-pointer hover:shadow-sm" : "cursor-not-allowed opacity-50 grayscale"
                        )}
                        disabled={!canControl}
                    >
                        {/* Percentage Side */}
                        <div className="flex-1 flex items-center justify-center text-xs font-semibold">
                            {committedDim}%
                        </div>
                        {/* Icon Side */}
                        <div className={cn(
                            "w-8 flex items-center justify-center transition-colors",
                            committedIsOn
                                ? "bg-emerald-500 text-white"
                                : "bg-muted-foreground/20 text-muted-foreground"
                        )}>
                            {committedIsOn ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                        </div>
                    </button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md p-0 overflow-hidden flex flex-col">
                    <DialogHeader className="px-6 py-4 border-b text-left">
                        <DialogTitle className="text-lg font-semibold flex items-center justify-start gap-2 text-left">
                            <Sun className="h-5 w-5 text-amber-500 shrink-0" />
                            {t("controlTitle")}
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            {t("controlTitle")}
                        </DialogDescription>
                        <div className="text-sm text-muted-foreground text-left">
                            {t("device")}: <span className="font-mono text-foreground">{imei}</span>{deviceName ? ` (${deviceName})` : ""}
                        </div>
                    </DialogHeader>

                    <div className="p-6 space-y-5">
                        {/* Status Preview Card */}
                        <div className={cn(
                            "flex items-center justify-between p-4 rounded-xl border transition-all",
                            draftDim > 0
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-100"
                                : "bg-muted/50 border-border text-muted-foreground"
                        )}>
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center shadow-xs",
                                    draftDim > 0 ? "bg-emerald-500 text-white" : "bg-muted-foreground/20 text-muted-foreground"
                                )}>
                                    {draftDim > 0 ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                                </div>
                                <div>
                                    <div className="text-xs text-muted-foreground font-medium">{t("commandStatus")}</div>
                                    <div className="text-sm font-semibold">
                                        {draftDim > 0 ? t("statusOn") : t("statusOff")}
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs text-muted-foreground font-medium">{t("brightness")}</div>
                                <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
                                    {draftDim}<span className="text-sm text-muted-foreground font-sans ml-0.5">%</span>
                                </div>
                            </div>
                        </div>

                        {/* Slider Section */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-xs text-muted-foreground font-medium">
                                <span>{t("sliderMin")}</span>
                                <span>{t("brightnessLevel")}</span>
                                <span>{t("sliderMax")}</span>
                            </div>
                            <Slider
                                value={[draftDim]}
                                min={0}
                                max={100}
                                step={1}
                                onValueChange={(vals) => setDraftDim(vals[0])}
                                className="w-full cursor-pointer"
                            />
                        </div>

                        {/* Quick Presets */}
                        <div className="space-y-1.5">
                            <div className="text-xs text-muted-foreground font-medium">{t("quickBrightness")}</div>
                            <div className="grid grid-cols-5 gap-1.5">
                                {[0, 25, 50, 75, 100].map((preset) => (
                                    <Button
                                        key={preset}
                                        type="button"
                                        variant={draftDim === preset ? "default" : "outline"}
                                        size="sm"
                                        className="h-8 text-xs cursor-pointer"
                                        onClick={() => setDraftDim(preset)}
                                    >
                                        {preset === 0 ? t("offPreset") : `${preset}%`}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="px-6 py-3 border-t bg-muted/20 gap-2 sm:gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                            disabled={loading}
                            className="cursor-pointer"
                        >
                            {t("cancel")}
                        </Button>
                        <Button
                            type="button"
                            onClick={handleSend}
                            disabled={loading}
                            className="cursor-pointer font-medium"
                        >
                            {loading ? (
                                <>
                                    <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                                    {t("sendingCommand")}
                                </>
                            ) : (
                                <>
                                    <Send className="mr-2 h-4 w-4" />
                                    {t("sendCommand")}
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

// --- Power Cell Component ---
const PowerCell = ({
    lastPower,
    gatewayId,
    imei
}: {
    lastPower?: string,
    gatewayId?: string,
    imei: string
}) => {
    const t = useTranslations("StreetLight.table")
    const { getPermission } = usePermission();
    const permissions = getPermission("V_StreetLight");
    const canControl = permissions.control;

    const [power, setPower] = React.useState(lastPower || "0");
    const [loading, setLoading] = React.useState(false);

    const handleRefresh = async () => {
        setLoading(true);
        try {
            if (!gatewayId || !imei) {
                toast.error(t("errorConfigMissing"));
                return;
            }

            // Call Server Action
            const result = await refreshStreetLightPowerAction(gatewayId, imei);

            if (result.success) {
                setPower(result.power);
                toast.success(t("refreshSuccess"));
            } else {
                toast.error(t("refreshFailed"));
            }
        } catch {
            toast.error(t("refreshError"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center">
            <div className="inline-flex items-center gap-2 bg-amber-500/10 text-foreground border border-amber-500/30 pl-2.5 pr-1 py-1 rounded-lg shadow-2xs transition-all">
                <Lightbulb className="h-4 w-4 text-amber-500 shrink-0" />
                <span className="font-mono font-semibold text-sm tracking-tight">
                    {power} <span className="text-xs font-normal text-muted-foreground">W</span>
                </span>
                <button
                    type="button"
                    onClick={handleRefresh}
                    disabled={loading || !canControl}
                    title={!canControl ? t("permissionDenied") : t("refreshPower")}
                    className={cn(
                        "ml-0.5 p-1 rounded-md transition-colors",
                        canControl
                            ? "cursor-pointer hover:bg-amber-500/20 text-muted-foreground hover:text-foreground active:scale-95"
                            : "cursor-not-allowed opacity-30"
                    )}
                >
                    <RefreshCcw className={cn("h-3.5 w-3.5", loading && "animate-spin text-primary")} />
                </button>
            </div>
        </div>
    )
}

// --- History Cell Component ---
const HistoryCell = ({
    imei,
    deviceName
}: {
    imei: string,
    deviceName?: string
}) => {
    const { getPermission } = usePermission();
    const canRead = getPermission("V_StreetLight").readable;

    if (!canRead) {
        return (
            <div className="flex justify-center text-muted-foreground text-xs cursor-not-allowed">
                -
            </div>
        )
    }

    return (
        <div className="flex justify-center">
            <HistoryPowerDialog imei={imei} deviceName={deviceName} />
        </div>
    )
}

export const useStreetLightColumns = (onCommandSuccess?: (imei: string, command: [string, string]) => void) => {
    const t = useTranslations("StreetLight.table")

    const columns: ColumnDef<StreetLightDevice>[] = [
        {
            accessorKey: "imeI_Name", // IMEI
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="-ml-3 h-8 text-sm font-semibold hover:bg-muted/50 cursor-pointer"
                >
                    {t("deviceNo")}
                    <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 text-muted-foreground" />
                </Button>
            ),
            cell: ({ row }) => <span className="font-mono text-sm text-foreground">{row.original.imeI_Name || "-"}</span>,
        },
        {
            accessorKey: "streetLightName", // Name + Serial/Gov
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-3 h-8 text-sm font-semibold hover:bg-muted/50 cursor-pointer"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    {t("streetLightName")}
                    <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 text-muted-foreground" />
                </Button>
            ),
            cell: ({ row }) => (
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">{row.original.streetLightName || "-"}</span>
                    {row.original.streetLightSerial && row.original.streetLightSerial !== "-" && (
                        <span className="text-xs font-mono text-muted-foreground">{row.original.streetLightSerial}</span>
                    )}
                </div>
            )
        },
        {
            accessorKey: "streetLightGroups",
            header: () => <div className="text-center text-sm font-semibold">{t("groupName")}</div>,
            cell: ({ row }) => {
                const groups = row.original.streetLightGroups || []
                if (groups.length === 0) {
                    return <div className="text-center text-sm text-muted-foreground">-</div>
                }
                if (groups.length === 1) {
                    return (
                        <div className="flex justify-center">
                            <Badge variant="outline" className="text-xs font-normal max-w-[140px] truncate bg-muted/40 text-foreground">
                                {groups[0]}
                            </Badge>
                        </div>
                    )
                }
                return (
                    <div className="flex items-center justify-center gap-1">
                        <Badge variant="outline" className="text-xs font-normal max-w-[110px] truncate bg-muted/40 text-foreground">
                            {groups[0]}
                        </Badge>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="secondary" size="sm" className="h-5 px-1.5 text-xs font-medium rounded-full cursor-pointer">
                                    +{groups.length - 1}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-56 p-3 text-sm">
                                <div className="font-semibold mb-2 border-b pb-1">
                                    {t("groupName")} ({groups.length})
                                </div>
                                <div className="flex flex-col gap-1.5 max-h-[180px] overflow-y-auto">
                                    {groups.map((group, index) => (
                                        <div key={index} className="p-1.5 rounded-md bg-muted/50 text-foreground text-xs">
                                            {group}
                                        </div>
                                    ))}
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                )
            },
        },
        {
            accessorKey: "streetLightLastUpdate",
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    size="sm"
                    className="mx-auto flex h-8 text-sm font-semibold hover:bg-muted/50 cursor-pointer"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    {t("lastUpdate")}
                    <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 text-muted-foreground" />
                </Button>
            ),
            cell: ({ row }) => <div className="text-center text-sm text-muted-foreground">{row.original.streetLightLastUpdate || "-"}</div>
        },
        {
            accessorKey: "lifeTime",
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    size="sm"
                    className="mx-auto flex h-8 text-sm font-semibold hover:bg-muted/50 cursor-pointer"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    {t("lifeTime")}
                    <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 text-muted-foreground" />
                </Button>
            ),
            cell: ({ row }) => <div className="text-center text-sm font-mono">{row.original.lifeTime}</div>
        },
        {
            accessorKey: "lastPower",
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    size="sm"
                    className="mx-auto flex h-8 text-sm font-semibold hover:bg-muted/50 cursor-pointer"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    {t("lastPower")}
                    <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 text-muted-foreground" />
                </Button>
            ),
            cell: ({ row }) => (
                <PowerCell
                    lastPower={row.original.lastPower}
                    gatewayId={row.original.gatewayId}
                    imei={row.original.imeI_Name}
                />
            )
        },
        {
            id: "command",
            header: () => <div className="text-center text-sm font-semibold">{t("command")}</div>,
            cell: ({ row }) => (
                <CommandCell
                    initialCommand={row.original.streetLightCommand || ["0", "0"]}
                    imei={row.original.imeI_Name}
                    deviceName={row.original.streetLightName}
                    onCommandSuccess={onCommandSuccess}
                />
            )
        },
        {
            id: "logPower",
            header: () => <div className="text-center text-sm font-semibold">{t("logPower")}</div>,
            cell: ({ row }) => (
                <HistoryCell
                    imei={row.original.imeI_Name}
                    deviceName={row.original.streetLightName}
                />
            )
        },
    ]

    return columns
}
