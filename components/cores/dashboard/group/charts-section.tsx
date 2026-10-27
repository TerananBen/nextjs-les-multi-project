"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DashboardData } from "@/app/actions/dashboard"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { useTranslations, useLocale } from "next-intl"
import { Activity, Loader2 } from "lucide-react"

interface ChartsSectionProps {
    data: DashboardData | null
    loading?: boolean
}

export function ChartsSection({ data, loading }: ChartsSectionProps) {
    const t = useTranslations("GroupDashboard.charts")
    const locale = useLocale()

    // Determine if we have data for charts
    const listUnitWattDay = data?.listUnitWattDay || []
    const listAvgUnit = data?.listAvgUnit || []
    const listTotalImeiLose = data?.listTotalImeiLose || []
    const totalUnitPerHour = data?.totalUnitPerHour || []

    const hasEnergyData = listUnitWattDay.length > 0 && (listAvgUnit.length > 0 || totalUnitPerHour.length > 0)
    const hasFailureData = listUnitWattDay.length > 0 && listTotalImeiLose.length > 0

    const isHourly = listUnitWattDay.length <= 1 && totalUnitPerHour.length > 0

    // Prepare data for Energy Consumption Chart
    const energyDataDaily = listUnitWattDay.map((date, index) => ({
        date,
        value: listAvgUnit[index] || 0
    }))

    const energyDataHourly = totalUnitPerHour.map((value, index) => ({
        date: `${String(index).padStart(2, '0')}:00`,
        value: value || 0
    }))

    const energyData = isHourly ? energyDataHourly : energyDataDaily

    // Prepare data for Lamp Failure Chart
    const failureData = listUnitWattDay.map((date, index) => ({
        date,
        value: listTotalImeiLose[index] || 0
    }))

    // Function to render content, loading, or no data message
    const renderChartContent = (children: React.ReactElement, hasData: boolean) => {
        if (loading) {
            return (
                <div className="flex flex-col items-center justify-center h-[320px] text-muted-foreground/60">
                    <Loader2 className="size-8 animate-spin text-primary" />
                </div>
            )
        }

        if (!hasData) {
            return (
                <div className="flex flex-col items-center justify-center h-[320px] text-muted-foreground/50">
                    <Activity className="size-10 mb-2 opacity-30" />
                    <p className="text-sm font-medium">{t("noData")}</p>
                </div>
            )
        }

        return (
            <div className="h-[320px] w-full pdf-chart-export">
                <ResponsiveContainer width="100%" height="100%">
                    {children}
                </ResponsiveContainer>
            </div>
        )
    }

    const tooltipStyle = {
        backgroundColor: "var(--popover)",
        borderColor: "var(--border)",
        color: "var(--popover-foreground)",
        borderRadius: "8px",
        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
        fontSize: "12px",
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 w-full">
            {/* Chart 1: Energy Consumption */}
            <Card className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 py-3 border-b">
                    <CardTitle className="text-base font-semibold text-foreground">
                        {t("energyConsumption")}
                    </CardTitle>
                    {hasEnergyData && (
                        <Badge variant="secondary" className="font-mono text-xs font-normal">
                            {isHourly ? t("time") : "kWh"}
                        </Badge>
                    )}
                </CardHeader>
                <CardContent className="p-4 pl-0" id="energy-chart-container">
                    {renderChartContent(
                        <AreaChart data={energyData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorEnergy" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.05} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" strokeOpacity={0.6} />
                            <XAxis
                                dataKey="date"
                                tickLine={false}
                                axisLine={false}
                                tickMargin={10}
                                tickFormatter={(value) => {
                                    if (isHourly) return value
                                    const date = new Date(value)
                                    return date.toLocaleDateString(locale, {
                                        day: "numeric",
                                        month: "short",
                                    })
                                }}
                                fontSize={12}
                                tick={{ fill: "var(--muted-foreground)" }}
                            />
                            <YAxis
                                tickLine={false}
                                axisLine={false}
                                fontSize={12}
                                tick={{ fill: "var(--muted-foreground)" }}
                            />
                            <Tooltip
                                contentStyle={tooltipStyle}
                                itemStyle={{ color: "var(--popover-foreground)" }}
                                labelStyle={{ color: "var(--popover-foreground)", fontWeight: 600, marginBottom: "4px" }}
                                separator=""
                                formatter={(value: unknown) => [t("energyTooltip", { value: Number(value) }), ""]}
                                labelFormatter={(value) => {
                                    if (isHourly) return `${t("time")}: ${value}`
                                    return new Date(value).toLocaleDateString(locale, {
                                        day: "numeric",
                                        month: "short",
                                        year: "numeric"
                                    })
                                }}
                            />
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke="var(--chart-1)"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorEnergy)"
                            />
                        </AreaChart>,
                        hasEnergyData
                    )}
                </CardContent>
            </Card>

            {/* Chart 2: Lamp Failure */}
            <Card className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 py-3 border-b">
                    <CardTitle className="text-base font-semibold text-foreground">
                        {t("lampFailure")}
                    </CardTitle>
                    {hasFailureData && (
                        <Badge variant="outline" className="font-mono text-xs font-normal">
                            {failureData.length > 0
                                ? `${Math.max(...failureData.map(d => Number(d.value) || 0))} max`
                                : ""}
                        </Badge>
                    )}
                </CardHeader>
                <CardContent className="p-4 pl-0" id="failure-chart-container">
                    {renderChartContent(
                        <BarChart data={failureData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" strokeOpacity={0.6} />
                            <XAxis
                                dataKey="date"
                                tickLine={false}
                                axisLine={false}
                                tickMargin={10}
                                tickFormatter={(value) => {
                                    const date = new Date(value)
                                    return date.toLocaleDateString(locale, {
                                        day: "numeric",
                                        month: "short",
                                    })
                                }}
                                fontSize={12}
                                tick={{ fill: "var(--muted-foreground)" }}
                            />
                            <YAxis
                                tickLine={false}
                                axisLine={false}
                                fontSize={12}
                                allowDecimals={false}
                                tick={{ fill: "var(--muted-foreground)" }}
                            />
                            <Tooltip
                                cursor={{ fill: 'var(--muted)', opacity: 0.3 }}
                                contentStyle={tooltipStyle}
                                itemStyle={{ color: "var(--popover-foreground)" }}
                                labelStyle={{ color: "var(--popover-foreground)", fontWeight: 600, marginBottom: "4px" }}
                                separator=""
                                formatter={(value: unknown) => [t("lampFailureTooltip", { value: Number(value) }), ""]}
                                labelFormatter={(value) => {
                                    return new Date(value).toLocaleDateString(locale, {
                                        day: "numeric",
                                        month: "short",
                                        year: "numeric"
                                    })
                                }}
                            />
                            <Bar
                                dataKey="value"
                                fill="var(--chart-2)"
                                radius={[4, 4, 0, 0]}
                                barSize={32}
                            />
                        </BarChart>,
                        hasFailureData
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
