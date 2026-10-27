"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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
    Info,
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
        <div className="flex flex-1 flex-col gap-6 w-full h-full pb-10">
            {/* Header Section: Standardized modern container */}
            <div className="rounded-xl border border-border/80 bg-muted/40 p-4 sm:p-5 shadow-xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <BellRing className="h-5 w-5" />
                            </div>
                            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                                {t("title")}
                            </h1>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                            {t("subtitle")}
                        </p>
                    </div>

                    {/* Quick Status Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                        {!hiddenTypes.includes("lineToken") && (
                            <Badge
                                variant="outline"
                                className={cn(
                                    "gap-1.5 py-1 px-3 text-xs font-medium bg-background",
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
                                    "gap-1.5 py-1 px-3 text-xs font-medium bg-background",
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
                            className="gap-1.5 py-1 px-3 text-xs font-medium bg-background border-amber-500/30 text-amber-600 dark:text-amber-400"
                        >
                            <span className="h-1.5 w-1.5 rounded-full shrink-0 bg-amber-500" />
                            Thresholds: {t("statusActive")}
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Main Settings Grid */}
            <div className="grid items-start gap-6 lg:grid-cols-2">
                {/* Column 1: Notification Channels */}
                <div className="space-y-6">
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

                {/* Column 2: Thresholds & Schedule */}
                <div className="space-y-6">
                    <AlertThresholdsCard
                        t={t}
                        wattOver={wattOver}
                        wattLess={wattLess}
                        voltOver={voltOver}
                        voltLess={voltLess}
                        timeAlert={timeAlert}
                        battery={battery}
                        onFieldChange={handleFieldChange}
                    />
                    {(onAllSystem || offAllSystem) && (
                        <SystemScheduleCard
                            t={t}
                            onAllSystem={onAllSystem}
                            offAllSystem={offAllSystem}
                            onFieldChange={handleFieldChange}
                        />
                    )}
                </div>
            </div>

            {/* Sticky Bottom Action Bar */}
            <div className="sticky bottom-4 z-20 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-border/80 bg-background/95 backdrop-blur-md p-4 shadow-lg transition-all">
                <div className="flex items-center gap-2.5 text-xs sm:text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>ระบบจะส่งการแจ้งเตือนตามช่องทางและเกณฑ์ที่เปิดใช้งานอัตโนมัติ</span>
                </div>
                <Button
                    disabled={isPending}
                    onClick={() => setShowConfirmation(true)}
                    className="cursor-pointer h-10 px-8 text-sm font-medium shadow-xs w-full sm:w-auto shrink-0"
                >
                    {isPending ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {t("save")}...
                        </>
                    ) : (
                        <>
                            <Save className="mr-2 h-4 w-4" />
                            {t("save")}
                        </>
                    )}
                </Button>
            </div>

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
// Component: Line Token Card
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
        <Card className="rounded-xl border border-border/80 bg-card text-card-foreground shadow-xs">
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <MessageSquare className="h-5 w-5" />
                        </div>
                        <div>
                            <CardTitle className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
                                {t("lineToken")}
                            </CardTitle>
                            <CardDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                                {t("description")}
                            </CardDescription>
                        </div>
                    </div>

                    {/* Master Switch */}
                    <div className="flex items-center gap-2.5">
                        <span className="text-xs font-medium text-muted-foreground hidden sm:inline">
                            {isLineActive ? t("statusActive") : t("statusInactive")}
                        </span>
                        <Switch
                            checked={isLineActive}
                            onCheckedChange={(checked) =>
                                onFieldChange("lineToken", "check_box", checked ? "1" : "0", "line")
                            }
                            className="cursor-pointer"
                        />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="line-token" className="text-xs font-medium text-muted-foreground">
                        {t("accessToken")}
                    </Label>
                    <div className="relative">
                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                            id="line-token"
                            placeholder={t("enterAccessToken")}
                            value={lineTokenParts.token}
                            onChange={(e) => onLineTokenChange("token", e.target.value)}
                            className="pl-9 h-10 bg-background text-sm shadow-xs"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="group-id" className="text-xs font-medium text-muted-foreground">
                        {t("groupID")}
                    </Label>
                    <div className="relative">
                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                            id="group-id"
                            placeholder={t("enterGroupID")}
                            value={lineTokenParts.groupId}
                            onChange={(e) => onLineTokenChange("groupId", e.target.value)}
                            className="pl-9 h-10 bg-background text-sm shadow-xs"
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

// -----------------------------------------------------------------------------
// Component: Email Settings Card
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
        <Card className="rounded-xl border border-border/80 bg-card text-card-foreground shadow-xs">
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            <Mail className="h-5 w-5" />
                        </div>
                        <div>
                            <CardTitle className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
                                {t("email")}
                            </CardTitle>
                            <CardDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                                {t("emailDescription")}
                            </CardDescription>
                        </div>
                    </div>

                    <Badge variant="secondary" className="text-xs font-medium py-1 px-2.5">
                        {t("activeCount", { count: activeEmailCount, total: 10 })}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Format Notice Banner */}
                <div className="flex items-center gap-2.5 rounded-lg border border-primary/20 bg-primary/5 px-3.5 py-2.5 text-xs text-primary font-medium">
                    <Info className="h-4 w-4 shrink-0 text-primary" />
                    <div className="flex flex-wrap gap-1">
                        <span>{t("emailNote")}</span>
                        <span>{t("emailFormat")}</span>
                    </div>
                </div>

                {/* 10 Email Inputs Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {emailSlots.map((item, index) => {
                        const isChecked = item.check_box === "1"
                        return (
                            <div
                                key={item.name}
                                className={cn(
                                    "flex items-center gap-2.5 rounded-lg border px-3 py-1.5 shadow-xs transition-all",
                                    isChecked
                                        ? "border-border/80 bg-background hover:border-primary/40 focus-within:border-ring focus-within:ring-1 focus-within:ring-ring"
                                        : "border-border/40 bg-muted/20 opacity-75"
                                )}
                            >
                                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-muted text-[10px] font-mono font-medium text-muted-foreground shrink-0">
                                    {String(index + 1).padStart(2, "0")}
                                </span>
                                <Input
                                    type="email"
                                    placeholder={`${t("emailPlaceholder")} ${index + 1}`}
                                    value={item.value}
                                    onChange={(e) => onFieldChange(item.name, "value", e.target.value, "email")}
                                    className="h-8 border-0 bg-transparent p-0 text-xs sm:text-sm shadow-none focus-visible:ring-0 placeholder:text-muted-foreground flex-1 min-w-0"
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
            </CardContent>
        </Card>
    )
}

// -----------------------------------------------------------------------------
// Component: Alert Thresholds Card
// -----------------------------------------------------------------------------
interface AlertThresholdsCardProps {
    t: ReturnType<typeof useTranslations>
    wattOver: AlertSetting
    wattLess: AlertSetting
    voltOver: AlertSetting
    voltLess: AlertSetting
    timeAlert: AlertSetting
    battery: AlertSetting | null
    onFieldChange: (name: string, field: "value" | "check_box", value: string, type?: string) => void
}

function AlertThresholdsCard({
    t,
    wattOver,
    wattLess,
    voltOver,
    voltLess,
    timeAlert,
    battery,
    onFieldChange,
}: AlertThresholdsCardProps) {
    return (
        <Card className="rounded-xl border border-border/80 bg-card text-card-foreground shadow-xs">
            <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div>
                        <CardTitle className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
                            {t("alertCondition")}
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                            {t("alertConditionDescription")}
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Section 1: Power Monitoring (Watt) */}
                <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                            <Zap className="h-4 w-4" />
                        </div>
                        <span>{t("energyMonitor")}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground font-medium">
                                {t("wattOver")}
                            </Label>
                            <div className="relative">
                                <Input
                                    type="number"
                                    step="any"
                                    placeholder="0"
                                    value={wattOver.value}
                                    onChange={(e) => onFieldChange("wattOver", "value", e.target.value)}
                                    className="pr-9 h-10 text-sm bg-background shadow-xs font-mono"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-semibold pointer-events-none">
                                    W
                                </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-tight">
                                {t("powerOverDesc")}
                            </p>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground font-medium">
                                {t("wattLess")}
                            </Label>
                            <div className="relative">
                                <Input
                                    type="number"
                                    step="any"
                                    placeholder="0"
                                    value={wattLess.value}
                                    onChange={(e) => onFieldChange("wattLess", "value", e.target.value)}
                                    className="pr-9 h-10 text-sm bg-background shadow-xs font-mono"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-semibold pointer-events-none">
                                    W
                                </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-tight">
                                {t("powerLessDesc")}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Section 2: Voltage Monitoring (Volt) */}
                <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            <Activity className="h-4 w-4" />
                        </div>
                        <span>{t("voltageMonitor")}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground font-medium">
                                {t("voltOver")}
                            </Label>
                            <div className="relative">
                                <Input
                                    type="number"
                                    step="any"
                                    placeholder="0"
                                    value={voltOver.value}
                                    onChange={(e) => onFieldChange("voltOver", "value", e.target.value)}
                                    className="pr-9 h-10 text-sm bg-background shadow-xs font-mono"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-semibold pointer-events-none">
                                    V
                                </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-tight">
                                {t("voltOverDesc")}
                            </p>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground font-medium">
                                {t("voltLess")}
                            </Label>
                            <div className="relative">
                                <Input
                                    type="number"
                                    step="any"
                                    placeholder="0"
                                    value={voltLess.value}
                                    onChange={(e) => onFieldChange("voltLess", "value", e.target.value)}
                                    className="pr-9 h-10 text-sm bg-background shadow-xs font-mono"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-semibold pointer-events-none">
                                    V
                                </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-tight">
                                {t("voltLessDesc")}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Section 3: Daily Alert Time & Other Settings */}
                <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                            <Clock className="h-4 w-4" />
                        </div>
                        <span>{t("otherSettings")}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground font-medium">
                                {t("timeAlert")}
                            </Label>
                            <Input
                                type="time"
                                value={timeAlert.value}
                                onChange={(e) => onFieldChange("timeAlert", "value", e.target.value, "time")}
                                className="h-10 text-sm bg-background cursor-pointer shadow-xs font-mono"
                            />
                            <p className="text-[11px] text-muted-foreground leading-tight">
                                {t("dailyReportDesc")}
                            </p>
                        </div>

                        {battery && (
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground font-medium">
                                    {t("battery")}
                                </Label>
                                <div className="relative">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                        <Battery className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <Input
                                        type="number"
                                        step="any"
                                        value={battery.value}
                                        onChange={(e) => onFieldChange("minBattery", "value", e.target.value)}
                                        className="pl-9 pr-9 h-10 text-sm bg-background shadow-xs font-mono"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-semibold pointer-events-none">
                                        %
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

// -----------------------------------------------------------------------------
// Component: System Schedule Card (Optional)
// -----------------------------------------------------------------------------
interface SystemScheduleCardProps {
    t: ReturnType<typeof useTranslations>
    onAllSystem: AlertSetting | null
    offAllSystem: AlertSetting | null
    onFieldChange: (name: string, field: "value" | "check_box", value: string, type?: string) => void
}

function SystemScheduleCard({
    t,
    onAllSystem,
    offAllSystem,
    onFieldChange,
}: SystemScheduleCardProps) {
    return (
        <Card className="rounded-xl border border-border/80 bg-card text-card-foreground shadow-xs">
            <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                        <Clock className="h-5 w-5" />
                    </div>
                    <div>
                        <CardTitle className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
                            {t("systemSchedule")}
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                            {t("systemScheduleDescription")}
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
                {onAllSystem && (
                    <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground font-medium">
                            {t("onAllSystem")}
                        </Label>
                        <Input
                            type="time"
                            value={onAllSystem.value}
                            onChange={(e) => onFieldChange("onAllSystem", "value", e.target.value, "time")}
                            className="h-10 text-sm bg-background shadow-xs cursor-pointer font-mono"
                        />
                    </div>
                )}
                {offAllSystem && (
                    <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground font-medium">
                            {t("offAllSystem")}
                        </Label>
                        <Input
                            type="time"
                            value={offAllSystem.value}
                            onChange={(e) => onFieldChange("offAllSystem", "value", e.target.value, "time")}
                            className="h-10 text-sm bg-background shadow-xs cursor-pointer font-mono"
                        />
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
