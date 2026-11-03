"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import {
    Loader2,
    Save,
    MessageSquare,
    Mail,
    AlertTriangle,
    Clock,
    Battery,
    Zap,
    Activity,
    BellRing,
    Key,
    Users,
    CheckCircle2,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface Props {
    hiddenConfigAlerts: string
}

export function AlertsClient({ hiddenConfigAlerts }: Props) {
    const t = useTranslations("Alerts")
    const [data, setData] = React.useState<AlertSetting[]>([])
    const [loading, setLoading] = React.useState(true)
    const [isPending, startTransition] = React.useTransition()
    const [showConfirmation, setShowConfirmation] = React.useState(false)

    // Line Token split state
    const [lineTokenParts, setLineTokenParts] = React.useState({ token: "", groupId: "" })
    const [hiddenTypes, setHiddenTypes] = React.useState<string[]>([])

    React.useEffect(() => {
        const fetchData = async () => {
            try {
                const hiddenConfig = hiddenConfigAlerts || ""
                const hiddenList = hiddenConfig.split(",").map(item => item.trim()).filter(Boolean)
                setHiddenTypes(hiddenList)

                const result = await getDataAlertStreetLightAction()
                setData(result || [])

                const lineToken = (result || []).find(d => d.name === "lineToken")
                if (lineToken) {
                    const [token, groupId] = lineToken.value.split("channel_access_token_group_id")
                    setLineTokenParts({
                        token: token || "",
                        groupId: groupId || ""
                    })
                }
            } catch (error) {
                console.error("Failed to fetch alert settings", error)
                toast.error(t("saveError"))
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [hiddenConfigAlerts, t])

    const getFieldItem = React.useCallback((name: string, defaultType: string = "system"): AlertSetting => {
        const found = data.find(item => item.name === name)
        if (found) return found
        return {
            name,
            value: "",
            check_box: "0",
            last_update: "",
            type: defaultType
        }
    }, [data])

    const handleFieldChange = React.useCallback((name: string, field: "value" | "check_box", newValue: string, defaultType: string = "system") => {
        setData(currentData => {
            const exists = currentData.some(item => item.name === name)
            if (exists) {
                return currentData.map(item =>
                    item.name === name ? { ...item, [field]: newValue } : item
                )
            }
            return [
                ...currentData,
                {
                    name,
                    value: field === "value" ? newValue : "",
                    check_box: field === "check_box" ? newValue : "0",
                    last_update: "",
                    type: defaultType
                }
            ]
        })
    }, [])

    const handleLineTokenChange = (part: "token" | "groupId", value: string) => {
        setLineTokenParts(prev => {
            const newParts = { ...prev, [part]: value }
            const combined = `${newParts.token}channel_access_token_group_id${newParts.groupId}`
            handleFieldChange("lineToken", "value", combined, "line")
            return newParts
        })
    }

    // Ensure 10 email slots are always available
    const emailSlots = React.useMemo(() => {
        const existingEmails = data.filter(item => item.type === "email" && !hiddenTypes.includes("email"))
        const slots: AlertSetting[] = []
        for (let i = 0; i < 10; i++) {
            const slotName = `email${i + 1}`
            const found = existingEmails.find(e => e.name === slotName) || existingEmails[i]
            if (found) {
                slots.push(found)
            } else {
                slots.push({
                    name: slotName,
                    value: "",
                    check_box: "0",
                    last_update: "",
                    type: "email"
                })
            }
        }
        return slots
    }, [data, hiddenTypes])

    const activeEmailCount = React.useMemo(() => {
        return emailSlots.filter(e => e.check_box === "1").length
    }, [emailSlots])

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

    // Main alert threshold items
    const lineToken = getFieldItem("lineToken", "line")
    const wattOver = getFieldItem("wattOver", "system")
    const wattLess = getFieldItem("wattLess", "system")
    const voltOver = getFieldItem("voltOver", "system")
    const voltLess = getFieldItem("voltLess", "system")
    const timeAlert = getFieldItem("timeAlert", "time")

    // Optional legacy items if not hidden
    const showBattery = !hiddenTypes.includes("batt") && data.some(d => d.name === "minBattery")
    const battery = showBattery ? getFieldItem("minBattery", "system") : null

    const showSchedule = !hiddenTypes.includes("timeControlAllSystem") && (data.some(d => d.name === "onAllSystem") || data.some(d => d.name === "offAllSystem"))
    const onAllSystem = showSchedule ? getFieldItem("onAllSystem", "time") : null
    const offAllSystem = showSchedule ? getFieldItem("offAllSystem", "time") : null

    return (
        <div className="flex flex-1 flex-col gap-2.5 w-full h-full">
            {/* Header Toolbar: Standard Compact Container */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-2 rounded-lg border bg-card text-card-foreground shadow-2xs">
                {/* Left: Title + Quick Badges */}
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2 mr-1">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                            <BellRing className="h-4 w-4" />
                        </div>
                        <span className="font-semibold text-sm sm:text-base tracking-tight text-foreground">
                            {t("title")}
                        </span>
                    </div>

                    {!hiddenTypes.includes("lineToken") && (
                        <Badge
                            variant="outline"
                            className={cn(
                                "gap-1.5 py-0.5 px-2.5 text-xs font-medium bg-background shrink-0",
                                lineToken.check_box === "1"
                                    ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                                    : "text-muted-foreground"
                            )}
                        >
                            <span
                                className={cn(
                                    "h-1.5 w-1.5 rounded-full shrink-0",
                                    lineToken.check_box === "1" ? "bg-emerald-500" : "bg-muted-foreground/40"
                                )}
                            />
                            LINE: {lineToken.check_box === "1" ? t("statusActive") : t("statusInactive")}
                        </Badge>
                    )}

                    {!hiddenTypes.includes("email") && (
                        <Badge
                            variant="outline"
                            className={cn(
                                "gap-1.5 py-0.5 px-2.5 text-xs font-medium bg-background shrink-0",
                                activeEmailCount > 0
                                    ? "border-blue-500/30 text-blue-600 dark:text-blue-400"
                                    : "text-muted-foreground"
                            )}
                        >
                            <span
                                className={cn(
                                    "h-1.5 w-1.5 rounded-full shrink-0",
                                    activeEmailCount > 0 ? "bg-blue-500" : "bg-muted-foreground/40"
                                )}
                            />
                            Email: {activeEmailCount}/10
                        </Badge>
                    )}

                    <Badge
                        variant="outline"
                        className="gap-1.5 py-0.5 px-2.5 text-xs font-medium bg-background border-amber-500/30 text-amber-600 dark:text-amber-400 shrink-0"
                    >
                        <span className="h-1.5 w-1.5 rounded-full shrink-0 bg-amber-500" />
                        Thresholds: {t("statusActive")}
                    </Badge>
                </div>

                {/* Right: Info notice & Save button */}
                <div className="flex items-center justify-end gap-2.5 shrink-0">
                    <span className="hidden xl:flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        {t("autoNotice")}
                    </span>
                    <Button
                        size="sm"
                        disabled={isPending}
                        onClick={() => setShowConfirmation(true)}
                        className="cursor-pointer h-9 px-4 text-xs sm:text-sm font-medium shadow-xs"
                    >
                        {isPending ? (
                            <>
                                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                {t("save")}...
                            </>
                        ) : (
                            <>
                                <Save className="mr-1.5 h-3.5 w-3.5" />
                                {t("save")}
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* Main Tabs Navigation & Views */}
            <Tabs defaultValue="all" className="w-full flex-1 flex flex-col gap-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                    <TabsList className="h-8.5 p-0.5 bg-muted/60 self-start">
                        <TabsTrigger value="all" className="h-7.5 text-xs sm:text-sm px-3 cursor-pointer">
                            {t("tabs.all")}
                        </TabsTrigger>
                        <TabsTrigger value="channels" className="h-7.5 text-xs sm:text-sm px-3 cursor-pointer">
                            {t("tabs.channels")}
                        </TabsTrigger>
                        <TabsTrigger value="thresholds" className="h-7.5 text-xs sm:text-sm px-3 cursor-pointer">
                            {t("tabs.thresholds")}
                        </TabsTrigger>
                    </TabsList>
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                        {t("subtitle")}
                    </span>
                </div>

                {/* Tab: All Settings */}
                <TabsContent value="all" className="mt-0">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 items-stretch">
                        <div className="flex flex-col gap-2.5">
                            <LineTokenCard
                                t={t}
                                lineToken={lineToken}
                                lineTokenParts={lineTokenParts}
                                onLineTokenChange={handleLineTokenChange}
                                onFieldChange={handleFieldChange}
                                hiddenTypes={hiddenTypes}
                            />
                            <EmailSettingsCard
                                t={t}
                                emailSlots={emailSlots}
                                activeEmailCount={activeEmailCount}
                                onFieldChange={handleFieldChange}
                                hiddenTypes={hiddenTypes}
                            />
                        </div>
                        <div className="flex flex-col gap-2.5 h-full">
                            <AlertThresholdsCard
                                t={t}
                                wattOver={wattOver}
                                wattLess={wattLess}
                                voltOver={voltOver}
                                voltLess={voltLess}
                                timeAlert={timeAlert}
                                battery={battery}
                                onAllSystem={onAllSystem}
                                offAllSystem={offAllSystem}
                                onFieldChange={handleFieldChange}
                                className="h-full"
                            />
                        </div>
                    </div>
                </TabsContent>

                {/* Tab: Notification Channels Only */}
                <TabsContent value="channels" className="mt-0">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 items-start">
                        <LineTokenCard
                            t={t}
                            lineToken={lineToken}
                            lineTokenParts={lineTokenParts}
                            onLineTokenChange={handleLineTokenChange}
                            onFieldChange={handleFieldChange}
                            hiddenTypes={hiddenTypes}
                        />
                        <EmailSettingsCard
                            t={t}
                            emailSlots={emailSlots}
                            activeEmailCount={activeEmailCount}
                            onFieldChange={handleFieldChange}
                            hiddenTypes={hiddenTypes}
                        />
                    </div>
                </TabsContent>

                {/* Tab: Thresholds Only */}
                <TabsContent value="thresholds" className="mt-0">
                    <div className="max-w-3xl">
                        <AlertThresholdsCard
                            t={t}
                            wattOver={wattOver}
                            wattLess={wattLess}
                            voltOver={voltOver}
                            voltLess={voltLess}
                            timeAlert={timeAlert}
                            battery={battery}
                            onAllSystem={onAllSystem}
                            offAllSystem={offAllSystem}
                            onFieldChange={handleFieldChange}
                        />
                    </div>
                </TabsContent>
            </Tabs>

            {/* Confirmation Dialog */}
            <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("confirmSaveTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("confirmSaveDescription")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="cursor-pointer" disabled={isPending}>
                            {t("cancel")}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            className="cursor-pointer"
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
    )
}

// -----------------------------------------------------------------------------
// Component: Line Token Card (Compact)
// -----------------------------------------------------------------------------
interface LineTokenCardProps {
    t: ReturnType<typeof useTranslations>
    lineToken: AlertSetting
    lineTokenParts: { token: string; groupId: string }
    onLineTokenChange: (part: "token" | "groupId", value: string) => void
    onFieldChange: (name: string, field: "value" | "check_box", value: string, type?: string) => void
    hiddenTypes: string[]
}

function LineTokenCard({
    t,
    lineToken,
    lineTokenParts,
    onLineTokenChange,
    onFieldChange,
    hiddenTypes,
}: LineTokenCardProps) {
    if (hiddenTypes.includes("lineToken")) return null
    const isLineActive = lineToken.check_box === "1"

    return (
        <Card className="rounded-lg border border-border/80 bg-card text-card-foreground shadow-2xs py-2 px-3">
            <div className="flex items-center justify-between pb-2 border-b border-border/50">
                <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <MessageSquare className="h-4 w-4" />
                    </div>
                    <div>
                        <span className="text-sm sm:text-base font-semibold text-foreground">
                            {t("lineToken")}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2 hidden sm:inline">
                            {t("description")}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-medium text-muted-foreground">
                        {isLineActive ? t("statusActive") : t("statusInactive")}
                    </span>
                    <Switch
                        size="sm"
                        checked={isLineActive}
                        onCheckedChange={(checked) =>
                            onFieldChange("lineToken", "check_box", checked ? "1" : "0", "line")
                        }
                        className="cursor-pointer"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                <div className="space-y-1">
                    <Label htmlFor="line-token" className="text-xs sm:text-sm font-medium text-muted-foreground">
                        {t("accessToken")}
                    </Label>
                    <div className="relative">
                        <Key className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                            id="line-token"
                            placeholder={t("enterAccessToken")}
                            value={lineTokenParts.token}
                            onChange={(e) => onLineTokenChange("token", e.target.value)}
                            className="pl-8.5 h-9 bg-background text-sm shadow-none"
                        />
                    </div>
                </div>

                <div className="space-y-1">
                    <Label htmlFor="group-id" className="text-xs sm:text-sm font-medium text-muted-foreground">
                        {t("groupID")}
                    </Label>
                    <div className="relative">
                        <Users className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                            id="group-id"
                            placeholder={t("enterGroupID")}
                            value={lineTokenParts.groupId}
                            onChange={(e) => onLineTokenChange("groupId", e.target.value)}
                            className="pl-8.5 h-9 bg-background text-sm shadow-none"
                        />
                    </div>
                </div>
            </div>
        </Card>
    )
}

// -----------------------------------------------------------------------------
// Component: Email Settings Card (Compact)
// -----------------------------------------------------------------------------
interface EmailSettingsCardProps {
    t: ReturnType<typeof useTranslations>
    emailSlots: AlertSetting[]
    activeEmailCount: number
    onFieldChange: (name: string, field: "value" | "check_box", value: string, type?: string) => void
    hiddenTypes: string[]
}

function EmailSettingsCard({
    t,
    emailSlots,
    activeEmailCount,
    onFieldChange,
    hiddenTypes,
}: EmailSettingsCardProps) {
    if (hiddenTypes.includes("email")) return null

    return (
        <Card className="rounded-lg border border-border/80 bg-card text-card-foreground shadow-2xs py-2 px-3">
            <div className="flex items-center justify-between pb-2 border-b border-border/50">
                <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
                        <Mail className="h-4 w-4" />
                    </div>
                    <div>
                        <span className="text-sm sm:text-base font-semibold text-foreground">
                            {t("email")}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2 hidden sm:inline">
                            {t("emailFormat")}
                        </span>
                    </div>
                </div>

                <Badge variant="secondary" className="text-xs font-medium py-0.5 px-2.5">
                    {t("activeCount", { count: activeEmailCount, total: 10 })}
                </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-2">
                {emailSlots.map((item, index) => {
                    const isChecked = item.check_box === "1"
                    return (
                        <div
                            key={item.name}
                            className={cn(
                                "flex items-center gap-2 rounded-md border px-2.5 py-1.5 shadow-2xs transition-all",
                                isChecked
                                    ? "border-border/80 bg-background"
                                    : "border-border/40 bg-muted/20 opacity-70"
                            )}
                        >
                            <span className="flex h-5 w-5 items-center justify-center rounded bg-muted text-xs font-mono font-medium text-muted-foreground shrink-0">
                                {String(index + 1).padStart(2, "0")}
                            </span>
                            <Input
                                type="email"
                                placeholder={`${t("emailPlaceholder")} ${index + 1}`}
                                value={item.value}
                                onChange={(e) => onFieldChange(item.name, "value", e.target.value, "email")}
                                className="h-7 border-0 bg-transparent p-0 text-xs sm:text-sm shadow-none focus-visible:ring-0 placeholder:text-muted-foreground flex-1 min-w-0"
                            />
                            <Switch
                                size="sm"
                                checked={isChecked}
                                onCheckedChange={(checked) =>
                                    onFieldChange(item.name, "check_box", checked ? "1" : "0", "email")
                                }
                                className="cursor-pointer shrink-0"
                                aria-label={`Toggle ${item.name}`}
                            />
                        </div>
                    )
                })}
            </div>
        </Card>
    )
}

// -----------------------------------------------------------------------------
// Component: Alert Thresholds & Schedule Card (Compact)
// -----------------------------------------------------------------------------
interface AlertThresholdsCardProps {
    t: ReturnType<typeof useTranslations>
    wattOver: AlertSetting
    wattLess: AlertSetting
    voltOver: AlertSetting
    voltLess: AlertSetting
    timeAlert: AlertSetting
    battery: AlertSetting | null
    onAllSystem: AlertSetting | null
    offAllSystem: AlertSetting | null
    onFieldChange: (name: string, field: "value" | "check_box", value: string, type?: string) => void
    className?: string
}

function AlertThresholdsCard({
    t,
    wattOver,
    wattLess,
    voltOver,
    voltLess,
    timeAlert,
    battery,
    onAllSystem,
    offAllSystem,
    onFieldChange,
    className,
}: AlertThresholdsCardProps) {
    return (
        <Card className={cn(
            "rounded-lg border border-border/80 bg-card text-card-foreground shadow-2xs py-2.5 px-3 flex flex-col justify-between gap-2.5",
            className
        )}>
            <div className="flex items-center justify-between pb-1.5 border-b border-border/50 shrink-0">
                <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div>
                        <span className="text-sm sm:text-base font-semibold text-foreground">
                            {t("alertCondition")}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2 hidden sm:inline">
                            {t("alertConditionDescription")}
                        </span>
                    </div>
                </div>
            </div>

            {/* Section 1: Power Monitoring (Watt) */}
            <div className="rounded-md border border-border/60 bg-muted/20 p-2.5 space-y-1.5 flex-1 flex flex-col justify-center">
                <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-foreground">
                    <Zap className="h-4 w-4 text-amber-500" />
                    <span>{t("energyMonitor")}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-0.5">
                        <Label className="text-xs sm:text-sm text-muted-foreground font-medium">
                            {t("wattOver")}
                        </Label>
                        <div className="relative">
                            <Input
                                type="number"
                                step="any"
                                placeholder="0"
                                value={wattOver.value}
                                onChange={(e) => onFieldChange("wattOver", "value", e.target.value)}
                                className="pr-8 h-9 text-sm bg-background shadow-none font-mono"
                            />
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-semibold pointer-events-none">
                                W
                            </span>
                        </div>
                    </div>
                    <div className="space-y-0.5">
                        <Label className="text-xs sm:text-sm text-muted-foreground font-medium">
                            {t("wattLess")}
                        </Label>
                        <div className="relative">
                            <Input
                                type="number"
                                step="any"
                                placeholder="0"
                                value={wattLess.value}
                                onChange={(e) => onFieldChange("wattLess", "value", e.target.value)}
                                className="pr-8 h-9 text-sm bg-background shadow-none font-mono"
                            />
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-semibold pointer-events-none">
                                W
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Section 2: Voltage Monitoring (Volt) */}
            <div className="rounded-md border border-border/60 bg-muted/20 p-2.5 space-y-1.5 flex-1 flex flex-col justify-center">
                <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-foreground">
                    <Activity className="h-4 w-4 text-blue-500" />
                    <span>{t("voltageMonitor")}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-0.5">
                        <Label className="text-xs sm:text-sm text-muted-foreground font-medium">
                            {t("voltOver")}
                        </Label>
                        <div className="relative">
                            <Input
                                type="number"
                                step="any"
                                placeholder="0"
                                value={voltOver.value}
                                onChange={(e) => onFieldChange("voltOver", "value", e.target.value)}
                                className="pr-8 h-9 text-sm bg-background shadow-none font-mono"
                            />
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-semibold pointer-events-none">
                                V
                            </span>
                        </div>
                    </div>
                    <div className="space-y-0.5">
                        <Label className="text-xs sm:text-sm text-muted-foreground font-medium">
                            {t("voltLess")}
                        </Label>
                        <div className="relative">
                            <Input
                                type="number"
                                step="any"
                                placeholder="0"
                                value={voltLess.value}
                                onChange={(e) => onFieldChange("voltLess", "value", e.target.value)}
                                className="pr-8 h-9 text-sm bg-background shadow-none font-mono"
                            />
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-semibold pointer-events-none">
                                V
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Section 3: Time, Battery & System Schedule */}
            <div className="rounded-md border border-border/60 bg-muted/20 p-2.5 space-y-1.5 flex-1 flex flex-col justify-center">
                <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-foreground">
                    <Clock className="h-4 w-4 text-purple-500" />
                    <span>{t("otherSettings")}</span>
                </div>
                <div className={cn(
                    "grid gap-2",
                    battery || onAllSystem || offAllSystem ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-1 sm:grid-cols-2"
                )}>
                    <div className="space-y-0.5">
                        <Label className="text-xs sm:text-sm text-muted-foreground font-medium">
                            {t("timeAlert")}
                        </Label>
                        <Input
                            type="time"
                            value={timeAlert.value}
                            onChange={(e) => onFieldChange("timeAlert", "value", e.target.value, "time")}
                            className="h-9 text-sm bg-background cursor-pointer shadow-none font-mono"
                        />
                    </div>

                    {battery && (
                        <div className="space-y-0.5">
                            <Label className="text-xs sm:text-sm text-muted-foreground font-medium">
                                {t("battery")}
                            </Label>
                            <div className="relative">
                                <Battery className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                <Input
                                    type="number"
                                    step="any"
                                    value={battery.value}
                                    onChange={(e) => onFieldChange("minBattery", "value", e.target.value)}
                                    className="pl-8.5 pr-8 h-9 text-sm bg-background shadow-none font-mono"
                                />
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-semibold pointer-events-none">
                                    %
                                </span>
                            </div>
                        </div>
                    )}

                    {onAllSystem && (
                        <div className="space-y-0.5">
                            <Label className="text-xs sm:text-sm text-muted-foreground font-medium">
                                {t("onAllSystem")}
                            </Label>
                            <Input
                                type="time"
                                value={onAllSystem.value}
                                onChange={(e) => onFieldChange("onAllSystem", "value", e.target.value, "time")}
                                className="h-9 text-sm bg-background shadow-none cursor-pointer font-mono"
                            />
                        </div>
                    )}

                    {offAllSystem && (
                        <div className="space-y-0.5">
                            <Label className="text-xs sm:text-sm text-muted-foreground font-medium">
                                {t("offAllSystem")}
                            </Label>
                            <Input
                                type="time"
                                value={offAllSystem.value}
                                onChange={(e) => onFieldChange("offAllSystem", "value", e.target.value, "time")}
                                className="h-9 text-sm bg-background shadow-none cursor-pointer font-mono"
                            />
                        </div>
                    )}
                </div>
            </div>
        </Card>
    )
}
