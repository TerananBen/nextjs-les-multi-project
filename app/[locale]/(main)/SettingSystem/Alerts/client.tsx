"use client"

import { useEffect, useState, useTransition } from "react"
import { useTranslations } from "next-intl"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
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
import { getDataAlertStreetLightAction, settingAlertStreetLightAction } from "@/app/actions/setting-system"
import { AlertSetting } from "@/types/setting-system"
import { Loader2, Save, MessageSquare, Mail, AlertTriangle, Clock, Battery, Zap, Activity } from "lucide-react"
import { toast } from "sonner"

export function AlertsClient() {
    const t = useTranslations("Alerts")
    const [data, setData] = useState<AlertSetting[]>([])
    const [loading, setLoading] = useState(true)
    const [isPending, startTransition] = useTransition()
    const [showConfirmation, setShowConfirmation] = useState(false)

    // Specific state helpers
    const [lineTokenParts, setLineTokenParts] = useState({ token: "", groupId: "" })
    const [hiddenTypes, setHiddenTypes] = useState<string[]>([])

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Get hidden types from env
                const hiddenConfig = process.env.HIDDEN_CONFIG_ALERTS || ""
                const hiddenList = hiddenConfig.split(",").map(t => t.trim())
                setHiddenTypes(hiddenList)

                const result = await getDataAlertStreetLightAction()
                // Filter out hidden types immediately or handle at render time? 
                // Render time is safer for preserving data if user saves, but here we just want to hide UI.
                // Let's filter at render helpers instead to keep original data intact.
                setData(result)

                // Initialize Line Token parts
                const lineToken = result.find(d => d.name === "lineToken")
                if (lineToken) {
                    const [token, groupId] = lineToken.value.split("channel_access_token_group_id")
                    setLineTokenParts({
                        token: token || "",
                        groupId: groupId || ""
                    })
                }
            } catch (error) {
                console.error("Failed to fetch data", error)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    const handleLineTokenChange = (part: "token" | "groupId", value: string) => {
        setLineTokenParts(prev => {
            const newParts = { ...prev, [part]: value }
            // Update the main data array
            setData(currentData =>
                currentData.map(item =>
                    item.name === "lineToken"
                        ? { ...item, value: `${newParts.token}channel_access_token_group_id${newParts.groupId}` }
                        : item
                )
            )
            return newParts
        })
    }

    const handleChange = (name: string, field: "value" | "check_box", newValue: string) => {
        setData(currentData =>
            currentData.map(item =>
                item.name === name ? { ...item, [field]: newValue } : item
            )
        )
    }

    const handleSave = () => {
        startTransition(async () => {
            const result = await settingAlertStreetLightAction(data)
            if (result.success) {
                toast.success(t("saveSuccess"))
            } else {
                toast.error(t("saveError"))
            }
        })
    }

    if (loading) {
        return (
            <div className="flex h-[50vh] w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    // Helper to find item by name, ensuring it's not hidden
    const getItem = (name: string) => {
        const item = data.find(item => item.name === name)
        if (!item) return undefined
        // Special check for timeControlAllSystem which isn't a single item name but a type
        if (hiddenTypes.includes(item.type)) return undefined
        return item
    }

    // Filter by types
    const emailItems = data.filter(item => item.type === "email" && !hiddenTypes.includes("email"))
    const wattOver = getItem("wattOver")
    const wattLess = getItem("wattLess")
    const voltOver = getItem("voltOver")
    const voltLess = getItem("voltLess")
    const timeAlert = getItem("timeAlert")
    const battery = getItem("minBattery")
    const lineToken = getItem("lineToken")

    // Group extra time controls if needed
    const onAllSystem = getItem("onAllSystem")
    const offAllSystem = getItem("offAllSystem")

    return (
        <div className="flex flex-col gap-6 p-0">

            <div className="grid items-start gap-6 xl:grid-cols-2">

                {/* Left Column: Communication Settings */}
                <div className="flex flex-col gap-6">
                    {/* Line Token Section */}
                    {lineToken && (
                        <Card className="h-fit">
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                                        <MessageSquare className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg">{t("lineToken")}</CardTitle>
                                        <CardDescription>{t("description")}</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-col gap-4">
                                    <div className="flex items-start gap-3">
                                        <Checkbox
                                            id="line-check"
                                            className="mt-3"
                                            checked={lineToken.check_box === "1"}
                                            onCheckedChange={(c) => handleChange("lineToken", "check_box", c ? "1" : "0")}
                                        />
                                        <div className="flex-1 space-y-4">
                                            <div className="space-y-1.5">
                                                <Label htmlFor="line-token" className="text-muted-foreground">{t("accessToken")}</Label>
                                                <Input
                                                    id="line-token"
                                                    placeholder={t("enterAccessToken")}
                                                    value={lineTokenParts.token}
                                                    onChange={(e) => handleLineTokenChange("token", e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="group-id" className="text-muted-foreground">{t("groupID")}</Label>
                                                <Input
                                                    id="group-id"
                                                    placeholder={t("enterGroupID")}
                                                    value={lineTokenParts.groupId}
                                                    onChange={(e) => handleLineTokenChange("groupId", e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Email Section */}
                    <Card className="flex-1">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                                    <Mail className="h-5 w-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg">{t("email")}</CardTitle>
                                    <CardDescription>{t("emailDescription")}</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
                                <span className="font-semibold text-primary">{t("emailNote")} </span>
                                {t("emailFormat")}
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                {emailItems.map((item, index) => (
                                    <div key={item.name} className="flex items-center gap-3 rounded-lg border p-3 shadow-sm transition-colors hover:bg-muted/50">
                                        <Checkbox
                                            checked={item.check_box === "1"}
                                            onCheckedChange={(c) => handleChange(item.name, "check_box", c ? "1" : "0")}
                                        />
                                        <Input
                                            className="border-0 bg-transparent shadow-none focus-visible:ring-0"
                                            placeholder={`${t("emailPlaceholder")} ${index + 1}`}
                                            value={item.value}
                                            onChange={(e) => handleChange(item.name, "value", e.target.value)}
                                        />
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Operational Settings */}
                <div className="flex flex-col gap-6 xl:sticky xl:top-6">
                    {/* Alert Conditions Section */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                                    <AlertTriangle className="h-5 w-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg">{t("alertCondition")}</CardTitle>
                                    <CardDescription>{t("alertConditionDescription")}</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">

                            {/* Energy Group */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                                    <Zap className="h-4 w-4" />
                                    {t("energyMonitor")}
                                </div>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    {wattOver && (
                                        <div className="flex flex-col space-y-2">
                                            <Label className="text-xs">{t("wattOver")}</Label>
                                            <div className="relative">
                                                <Input
                                                    type="number"
                                                    value={wattOver.value}
                                                    onChange={(e) => handleChange("wattOver", "value", e.target.value)}
                                                    className="pr-8"
                                                />
                                                <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">W</span>
                                            </div>
                                        </div>
                                    )}
                                    {wattLess && (
                                        <div className="flex flex-col space-y-2">
                                            <Label className="text-xs">{t("wattLess")}</Label>
                                            <div className="relative">
                                                <Input
                                                    type="number"
                                                    value={wattLess.value}
                                                    onChange={(e) => handleChange("wattLess", "value", e.target.value)}
                                                    className="pr-8"
                                                />
                                                <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">W</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <Separator />

                            {/* Voltage Group */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                                    <Activity className="h-4 w-4" />
                                    {t("voltageMonitor")}
                                </div>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    {voltOver && (
                                        <div className="flex flex-col space-y-2">
                                            <Label className="text-xs">{t("voltOver")}</Label>
                                            <div className="relative">
                                                <Input
                                                    type="number"
                                                    value={voltOver.value}
                                                    onChange={(e) => handleChange("voltOver", "value", e.target.value)}
                                                    className="pr-8"
                                                />
                                                <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">V</span>
                                            </div>
                                        </div>
                                    )}
                                    {voltLess && (
                                        <div className="flex flex-col space-y-2">
                                            <Label className="text-xs">{t("voltLess")}</Label>
                                            <div className="relative">
                                                <Input
                                                    type="number"
                                                    value={voltLess.value}
                                                    onChange={(e) => handleChange("voltLess", "value", e.target.value)}
                                                    className="pr-8"
                                                />
                                                <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">V</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <Separator />

                            {/* Battery & Time */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                                    <Clock className="h-4 w-4" />
                                    {t("otherSettings")}
                                </div>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    {battery && (
                                        <div className="flex flex-col space-y-2">
                                            <Label className="text-xs">{t("battery")}</Label>
                                            <div className="relative">
                                                <div className="absolute left-3 top-2.5">
                                                    <Battery className="h-4 w-4 text-muted-foreground" />
                                                </div>
                                                <Input
                                                    type="number"
                                                    value={battery.value}
                                                    onChange={(e) => handleChange("minBattery", "value", e.target.value)}
                                                    className="pl-9 pr-8"
                                                />
                                                <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">%</span>
                                            </div>
                                        </div>
                                    )}
                                    {timeAlert && (
                                        <div className="flex flex-col space-y-2">
                                            <Label className="text-xs">{t("timeAlert")}</Label>
                                            <Input
                                                type="time"
                                                value={timeAlert.value}
                                                onChange={(e) => handleChange("timeAlert", "value", e.target.value)}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* System Control Time (Extra) */}
                    {(onAllSystem || offAllSystem) && (
                        <Card>
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                                        <Clock className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg">{t("systemSchedule")}</CardTitle>
                                        <CardDescription>{t("systemScheduleDescription")}</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="grid gap-6 md:grid-cols-2">
                                {onAllSystem && (
                                    <div className="space-y-2">
                                        <Label className="text-xs font-medium text-muted-foreground">{t("onAllSystem")}</Label>
                                        <div className="flex items-center gap-2 rounded-lg border p-2">
                                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-600">
                                                <span className="text-xs font-bold">{t("on")}</span>
                                            </div>
                                            <Input
                                                className="border-0 p-0 shadow-none focus-visible:ring-0"
                                                type="time"
                                                value={onAllSystem.value}
                                                onChange={(e) => handleChange("onAllSystem", "value", e.target.value)}
                                            />
                                        </div>
                                    </div>
                                )}
                                {offAllSystem && (
                                    <div className="space-y-2">
                                        <Label className="text-xs font-medium text-muted-foreground">{t("offAllSystem")}</Label>
                                        <div className="flex items-center gap-2 rounded-lg border p-2">
                                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-red-600">
                                                <span className="text-xs font-bold">{t("off")}</span>
                                            </div>
                                            <Input
                                                className="border-0 p-0 shadow-none focus-visible:ring-0"
                                                type="time"
                                                value={offAllSystem.value}
                                                onChange={(e) => handleChange("offAllSystem", "value", e.target.value)}
                                            />
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    <div className="flex justify-end">
                        <Button disabled={isPending} onClick={() => setShowConfirmation(true)} size="lg" className="w-full xl:w-auto min-w-[150px]">
                            <Save className="mr-2 h-4 w-4" />
                            {t("save")}
                        </Button>
                    </div>

                    <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
                        <AlertDialogContent className="font-sarabun">
                            <AlertDialogHeader>
                                <AlertDialogTitle>{t("confirmSaveTitle")}</AlertDialogTitle>
                                <AlertDialogDescription>
                                    {t("confirmSaveDescription")}
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel disabled={isPending}>{t("cancel")}</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={(e) => {
                                        e.preventDefault()
                                        handleSave()
                                        setShowConfirmation(false)
                                    }}
                                    disabled={isPending}
                                >
                                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    {t("confirm")}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>
        </div>
    )
}
