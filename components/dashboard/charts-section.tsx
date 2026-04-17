"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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

    // Function to render content, loading, or no data message
    const renderChartContent = (children: React.ReactElement, hasData: boolean) => {
        if (loading) {
            return (
                <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground/50">
                    <Loader2 className="size-8 animate-spin text-primary" />
                </div>
            )
        }

        if (!hasData) {
            return (
                <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground/50">
                    <Activity className="size-12 mb-4 opacity-20" />
                    <p className="text-sm font-medium">{t("noData")}</p>
                </div>
            )
        }
        return (
            <div className="h-[360px] w-full pdf-chart-export">
                <ResponsiveContainer width="100%" height="100%">
                    {children}
                </ResponsiveContainer>
            </div>
        )
    }

    // Determine if we have data for charts
    // Note: API returns dataReturn: null if no data, or potentially empty arrays
    const listUnitWattDay = data?.listUnitWattDay || []
    const listAvgUnit = data?.listAvgUnit || []
    const listTotalImeiLose = data?.listTotalImeiLose || []
    const totalUnitPerHour = data?.totalUnitPerHour || []

    const hasEnergyData = listUnitWattDay.length > 0 && (listAvgUnit.length > 0 || totalUnitPerHour.length > 0)
    const hasFailureData = listUnitWattDay.length > 0 && listTotalImeiLose.length > 0

    // Check if we should show Hourly (Single Day) or Daily (Range)
    // User requested: Select 1 day -> show totalUnitPerHour (Hourly)
    // Select multiple days -> show listAvgUnit (Daily)
    const isHourly = listUnitWattDay.length <= 1 && totalUnitPerHour.length > 0

    // Prepare data for Energy Consumption Chart
    const energyDataDaily = listUnitWattDay.map((date, index) => ({
        date: date,
        value: listAvgUnit[index] || 0
    }))

    const energyDataHourly = totalUnitPerHour.map((value, index) => ({
        date: `${String(index).padStart(2, '0')}:00`,
        value: value || 0
    }))

    const energyData = isHourly ? energyDataHourly : energyDataDaily

    // Prepare data for Lamp Failure Chart
    const failureData = listUnitWattDay.map((date, index) => ({
        date: date,
        value: listTotalImeiLose[index] || 0
    }))

    return (
        <div className="grid gap-4 grid-cols-1">
            <Card className="chart-card">
                <CardHeader>
                    <CardTitle>{t("energyConsumption")}</CardTitle>
                </CardHeader>
                <CardContent className="pl-2" id="energy-chart-container">
                    {renderChartContent(
                        <AreaChart data={energyData}>
                            <defs>
                                <linearGradient id="colorEnergy" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis
                                dataKey="date"
                                tickLine={false}
                                axisLine={false}
                                tickMargin={10}
                                tickFormatter={(value) => {
                                    if (isHourly) return value // "00:00"
                                    const date = new Date(value)
                                    return date.toLocaleDateString(locale, {
                                        day: "numeric",
                                        month: "short",
                                        year: "numeric"
                                    })
                                }}
                                fontSize={12}
                            />
                            <YAxis
                                tickLine={false}
                                axisLine={false}
                                fontSize={12}
                            />
                            <Tooltip
                                contentStyle={{ borderRadius: "8px" }}
                                labelFormatter={(value) => {
                                    if (isHourly) return `${t("time")}: ${value}`
                                    return new Date(value).toLocaleDateString(locale)
                                }}
                            />
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke="var(--chart-1)"
                                fillOpacity={1}
                                fill="url(#colorEnergy)"
                            />
                        </AreaChart>,
                        hasEnergyData
                    )}
                </CardContent>
            </Card>

            <Card className="chart-card">
                <CardHeader>
                    <CardTitle>{t("lampFailure")}</CardTitle>
                </CardHeader>
                <CardContent className="pl-2" id="failure-chart-container">
                    {renderChartContent(
                        <BarChart data={failureData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
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
                                        year: "numeric"
                                    })
                                }}
                                fontSize={12}
                            />
                            <YAxis
                                tickLine={false}
                                axisLine={false}
                                fontSize={12}
                                allowDecimals={false}
                            />
                            <Tooltip
                                cursor={{ fill: 'transparent' }}
                                contentStyle={{ borderRadius: "8px" }}
                                labelFormatter={(value) => new Date(value).toLocaleDateString(locale)}
                            />
                            <Bar
                                dataKey="value"
                                fill="var(--chart-2)"
                                radius={[4, 4, 0, 0]}
                                barSize={40}
                            />
                        </BarChart>,
                        hasFailureData
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
