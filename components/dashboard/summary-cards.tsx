import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { DashboardData } from "@/app/actions/dashboard"
import { Lightbulb, LightbulbOff, Zap } from "lucide-react"
import { useTranslations } from "next-intl"

interface SummaryCardsProps {
    data: DashboardData | null
}

export function SummaryCards({ data }: SummaryCardsProps) {
    const t = useTranslations("GroupDashboard.summary")
    if (!data) return null

    const totalLamp = parseInt(data.projectTotalLamp) || 0
    const totalLampLose = parseInt(data.totalLampLose) || 0
    const onlineLamp = totalLamp - totalLampLose

    return (
        <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:grid-cols-4">
            <Card className="@container/card">
                <CardHeader>
                    <CardDescription>{t("onlineTotal")}</CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums">
                        <span className="text-green-500">{onlineLamp}</span>
                        <span className="text-muted-foreground text-lg font-normal"> / {totalLamp} {t("lamp")}</span>
                    </CardTitle>
                </CardHeader>
                <CardFooter className="flex-col items-start gap-1.5 text-sm">
                    <div className="line-clamp-1 flex gap-2 font-medium">
                        {t("onlineStatus")} <Lightbulb className="size-4 text-yellow-500" />
                    </div>
                </CardFooter>
            </Card>

            <Card className="@container/card">
                <CardHeader>
                    <CardDescription>{t("lampFailure")}</CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums">
                        {totalLampLose} <span className="text-muted-foreground text-lg font-normal">{t("lamp")}</span>
                    </CardTitle>
                </CardHeader>
                <CardFooter className="flex-col items-start gap-1.5 text-sm">
                    <div className="line-clamp-1 flex gap-2 font-medium">
                        {t("failureCount")} <LightbulbOff className="size-4 text-gray-500" />
                    </div>
                </CardFooter>
            </Card>

            <Card className="@container/card">
                <CardHeader>
                    <CardDescription>{t("voltage")}</CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums">
                        {Math.round(parseFloat(data.toTalAvgVolt) || 0)} <span className="text-muted-foreground text-lg font-normal">{t("volt")}</span>
                    </CardTitle>
                </CardHeader>
                <CardFooter className="flex-col items-start gap-1.5 text-sm">
                    <div className="line-clamp-1 flex gap-2 font-medium">
                        {t("averageVoltage")} <Zap className="size-4 text-orange-500" />
                    </div>
                </CardFooter>
            </Card>

            <Card className="@container/card">
                <CardHeader>
                    <CardDescription>{t("energyConsumption")}</CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums">
                        {Math.round(parseFloat(data.toTalAvgUnit) || 0)}
                        <span className="text-lg font-normal text-muted-foreground ml-1">{t("kwh")}</span>
                    </CardTitle>
                </CardHeader>
                <CardFooter className="flex-col items-start gap-1.5 text-sm">
                    <div className="line-clamp-1 flex gap-2 font-medium">
                        {t("perMonth")} <Zap className="size-4 text-orange-500" />
                    </div>
                </CardFooter>
            </Card>
        </div>
    )
}
