import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { DashboardData } from "@/app/actions/dashboard"
import { Lightbulb, LightbulbOff, Zap } from "lucide-react"
import { useTranslations } from "next-intl"
import { Skeleton } from "@/components/ui/skeleton"

interface SummaryCardsProps {
    data: DashboardData | null
    loading?: boolean
}

export function SummaryCards({ data, loading }: SummaryCardsProps) {
    const t = useTranslations("GroupDashboard.summary")

    const totalLamp = data ? (parseInt(data.projectTotalLamp) || 0) : 0
    // Use totalRTULose for lamp failure count as per user request
    const totalLampLose = data ? (parseInt(data.totalRTULose) || 0) : 0
    const onlineLamp = totalLamp - totalLampLose

    const voltage = data ? (Math.round(parseFloat(data.toTalAvgVolt) || 0)) : 0
    const energy = data ? (Math.round(parseFloat(data.toTalAvgUnit) || 0)) : 0

    return (
        <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-sm lg:grid-cols-4">
            <Card className="@container/card">
                <CardHeader>
                    <CardDescription>{t("onlineTotal")}</CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums">
                        {loading ? (
                            <Skeleton className="h-8 w-24" />
                        ) : (
                            <>
                                <span className="text-[var(--chart-2)]">{onlineLamp}</span>
                                <span className="text-muted-foreground text-lg font-normal"> / {totalLamp} {t("lamp")}</span>
                            </>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardFooter className="flex-col items-start gap-1.5 text-sm">
                    <div className="line-clamp-1 flex gap-2 font-medium">
                        {t("onlineStatus")} <Lightbulb className="size-4 text-[var(--chart-4)]" />
                    </div>
                </CardFooter>
            </Card>

            <Card className="@container/card">
                <CardHeader>
                    <CardDescription>{t("lampFailure")}</CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums">
                        {loading ? (
                            <Skeleton className="h-8 w-16" />
                        ) : (
                            <>
                                {totalLampLose} <span className="text-muted-foreground text-lg font-normal">{t("lamp")}</span>
                            </>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardFooter className="flex-col items-start gap-1.5 text-sm">
                    <div className="line-clamp-1 flex gap-2 font-medium">
                        {t("failureCount")} <LightbulbOff className="size-4 text-muted-foreground" />
                    </div>
                </CardFooter>
            </Card>

            <Card className="@container/card">
                <CardHeader>
                    <CardDescription>{t("voltage")}</CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums">
                        {loading ? (
                            <Skeleton className="h-8 w-16" />
                        ) : (
                            <>
                                {voltage} <span className="text-muted-foreground text-lg font-normal">{t("volt")}</span>
                            </>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardFooter className="flex-col items-start gap-1.5 text-sm">
                    <div className="line-clamp-1 flex gap-2 font-medium">
                        {t("averageVoltage")} <Zap className="size-4 text-[var(--chart-1)]" />
                    </div>
                </CardFooter>
            </Card>

            <Card className="@container/card">
                <CardHeader>
                    <CardDescription>{t("energyConsumption")}</CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums flex items-baseline gap-1">
                        {loading ? (
                            <Skeleton className="h-8 w-20" />
                        ) : (
                            <>
                                {energy}
                                <span className="text-lg font-normal text-muted-foreground">{t("kwh")}</span>
                            </>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardFooter className="flex-col items-start gap-1.5 text-sm">
                    <div className="line-clamp-1 flex gap-2 font-medium">
                        {t("perMonth")} <Zap className="size-4 text-[var(--chart-1)]" />
                    </div>
                </CardFooter>
            </Card>
        </div>
    )
}
