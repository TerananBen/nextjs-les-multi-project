"use client"

import { DashboardData } from "@/app/actions/dashboard"
import { Lightbulb, LightbulbOff, Zap, Activity } from "lucide-react"
import { useTranslations } from "next-intl"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface SummaryCardsProps {
    data: DashboardData | null
    loading?: boolean
}

export function SummaryCards({ data, loading }: SummaryCardsProps) {
    const t = useTranslations("GroupDashboard.summary")

    const totalLamp = data ? (parseInt(data.projectTotalLamp, 10) || 0) : 0
    const totalLampLose = data ? (parseInt(data.totalRTULose, 10) || 0) : 0
    const onlineLamp = Math.max(0, totalLamp - totalLampLose)

    const voltage = data ? Math.round(parseFloat(data.toTalAvgVolt) || 0) : 0
    const energy = data ? Math.round(parseFloat(data.toTalAvgUnit) || 0) : 0

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full">
            {/* Card 1: Online Status */}
            <div className="flex items-center gap-3.5 p-3.5 rounded-xl border border-border/80 bg-muted/40 shadow-xs">
                <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                    <Lightbulb className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                    <p className="text-xs text-muted-foreground font-medium truncate">{t("onlineTotal")}</p>
                    {loading ? (
                        <Skeleton className="h-7 w-24 mt-1" />
                    ) : (
                        <div className="flex items-baseline gap-1 mt-0.5">
                            <span className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">
                                {onlineLamp}
                            </span>
                            <span className="text-xs text-muted-foreground font-normal tabular-nums">
                                / {totalLamp} {t("lamp")}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Card 2: Lamp Failure */}
            <div className="flex items-center gap-3.5 p-3.5 rounded-xl border border-border/80 bg-muted/40 shadow-xs">
                <div className={cn(
                    "p-2.5 rounded-lg shrink-0",
                    totalLampLose > 0
                        ? "bg-destructive/10 text-destructive"
                        : "bg-muted text-muted-foreground"
                )}>
                    <LightbulbOff className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                    <p className="text-xs text-muted-foreground font-medium truncate">{t("lampFailure")}</p>
                    {loading ? (
                        <Skeleton className="h-7 w-16 mt-1" />
                    ) : (
                        <div className="flex items-baseline gap-1 mt-0.5">
                            <span className={cn(
                                "text-xl font-bold tracking-tight tabular-nums",
                                totalLampLose > 0 ? "text-destructive" : "text-foreground"
                            )}>
                                {totalLampLose}
                            </span>
                            <span className="text-xs text-muted-foreground font-normal">{t("lamp")}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Card 3: Voltage */}
            <div className="flex items-center gap-3.5 p-3.5 rounded-xl border border-border/80 bg-muted/40 shadow-xs">
                <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                    <Zap className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                    <p className="text-xs text-muted-foreground font-medium truncate">{t("voltage")}</p>
                    {loading ? (
                        <Skeleton className="h-7 w-16 mt-1" />
                    ) : (
                        <div className="flex items-baseline gap-1 mt-0.5">
                            <span className="text-xl font-bold tracking-tight text-foreground tabular-nums">
                                {voltage}
                            </span>
                            <span className="text-xs text-muted-foreground font-normal">{t("volt")}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Card 4: Energy Consumption */}
            <div className="flex items-center gap-3.5 p-3.5 rounded-xl border border-border/80 bg-muted/40 shadow-xs">
                <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">
                    <Activity className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                    <p className="text-xs text-muted-foreground font-medium truncate">{t("energyConsumption")}</p>
                    {loading ? (
                        <Skeleton className="h-7 w-20 mt-1" />
                    ) : (
                        <div className="flex items-baseline gap-1 mt-0.5">
                            <span className="text-xl font-bold tracking-tight text-foreground tabular-nums">
                                {energy.toLocaleString()}
                            </span>
                            <span className="text-xs text-muted-foreground font-normal">{t("kwh")}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
