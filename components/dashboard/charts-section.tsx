"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DashboardData } from "@/app/actions/dashboard"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { useTranslations, useLocale } from "next-intl"

interface ChartsSectionProps {
    data: DashboardData | null
}

export function ChartsSection({ data }: ChartsSectionProps) {
    const t = useTranslations("GroupDashboard.charts")
    const locale = useLocale()
    if (!data) return null

    // Prepare data for Energy Consumption Chart
    const listUnitWattDay = data.listUnitWattDay || []
    const listAvgUnit = data.listAvgUnit || []
    const listTotalImeiLose = data.listTotalImeiLose || []

    const energyData = listUnitWattDay.map((date, index) => ({
        date: date,
        value: listAvgUnit[index] || 0
    }))

    // Prepare data for Lamp Failure Chart
    const failureData = listUnitWattDay.map((date, index) => ({
        date: date,
        value: listTotalImeiLose[index] || 0
    }))

    return (
        <div className="grid gap-4 grid-cols-1">
            <Card>
                <CardHeader>
                    <CardTitle>{t("energyConsumption")}</CardTitle>
                </CardHeader>
                <CardContent className="pl-2">
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
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
                                    labelFormatter={(value) => new Date(value).toLocaleDateString(locale)}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke="var(--chart-1)"
                                    fillOpacity={1}
                                    fill="url(#colorEnergy)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>{t("lampFailure")}</CardTitle>
                </CardHeader>
                <CardContent className="pl-2">
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
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
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
