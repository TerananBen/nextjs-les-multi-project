"use client"

import { useState, useEffect, useCallback } from "react"
import { FilterBar } from "@/components/dashboard/filter-bar"
import { SummaryCards } from "@/components/dashboard/summary-cards"
import { ChartsSection } from "@/components/dashboard/charts-section"
import { GroupItem, DashboardData, getDataDashBoard } from "@/app/actions/dashboard"

interface GroupDashboardClientProps {
    groups: GroupItem[],
    startDate?: string,
    defaultGroupCode?: string
}

export function GroupDashboardClient({ groups, startDate, defaultGroupCode }: GroupDashboardClientProps) {
    const [data, setData] = useState<DashboardData | null>(null)
    const [loading, setLoading] = useState(false)

    // Initial state
    const currentDate = new Date()
    const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`

    // We need to pass these initial values to FilterBar if we want them controlled there,
    // but FilterBar manages its own state. We might need to lift state up or use refs.
    // For now, let's just trigger the fetch.


    const handleSearch = useCallback(async (groupCode: string, type: string, date: string) => {
        setLoading(true)
        setData(null)
        try {
            if (type === "Day" && date.includes(",")) {
                // Handle Multi-Day Range
                const [startStr, endStr] = date.split(",")
                const startDate = new Date(startStr)
                const endDate = new Date(endStr)
                const dateArray: string[] = []

                // Generate array of dates
                const curr = new Date(startDate)
                while (curr <= endDate) {
                    dateArray.push(curr.toISOString().split('T')[0])
                    curr.setDate(curr.getDate() + 1)
                }

                // Fetch data for all dates in parallel
                const responses = await Promise.all(
                    dateArray.map(dayStr =>
                        getDataDashBoard({
                            group_code: groupCode,
                            select_type: "Day",
                            select_date: dayStr
                        })
                    )
                )

                // Aggregate Data
                const validResponses = responses.filter(r => r !== null) as DashboardData[]

                if (validResponses.length === 0) {
                    setData(null)
                    return
                }

                // Create aggregated data structure
                // We use the first response for static fields (like projectTotalLamp)
                // And build lists for charts
                const firstData = validResponses[0]

                const aggregatedData: DashboardData = {
                    ...firstData,
                    listUnitWattDay: dateArray,
                    // Map daily totals to the lists expected by ChartsSection
                    // ChartsSection uses listAvgUnit for daily energy in "Range" view
                    listAvgUnit: validResponses.map(r => parseFloat(r.toTalAvgUnit || "0")),
                    // ChartsSection uses listTotalImeiLose for daily failures in "Range" view
                    listTotalImeiLose: validResponses.map(r => parseFloat(r.totalRTULose || "0")),

                    // Recalculate Summary Card Totals
                    // Energy: Sum of all days
                    toTalAvgUnit: validResponses.reduce((sum, r) => sum + parseFloat(r.toTalAvgUnit || "0"), 0).toFixed(2),
                    // Voltage: Average of all days
                    toTalAvgVolt: (validResponses.reduce((sum, r) => sum + parseFloat(r.toTalAvgVolt || "0"), 0) / validResponses.length).toFixed(2),
                    // Lamp Failure: Average of all days - formatting as int string
                    // This ensures the summary matches the daily bars in the chart and keeps the "Online" calculation valid.
                    totalRTULose: Math.round(validResponses.reduce((sum, r) => sum + parseFloat(r.totalRTULose || "0"), 0) / validResponses.length).toString(),

                    // Clear hourly data to force "Daily" view in ChartsSection
                    totalUnitPerHour: [],
                    totalWattPerHour: [],
                    totalVoltPerHour: []
                }

                setData(aggregatedData)

            } else if (type === "Month" && date.includes("_")) {
                // Handle Multi-Month Range (format: YYYY-MM_YYYY-MM)
                const [startStr, endStr] = date.split("_")
                const [startY, startM] = startStr.split("-").map(Number)
                const [endY, endM] = endStr.split("-").map(Number)

                // Generate array of YYYY-MM strings
                const monthArray: string[] = []
                let y = startY, m = startM
                while (y < endY || (y === endY && m <= endM)) {
                    monthArray.push(`${y}-${String(m).padStart(2, '0')}`)
                    m++
                    if (m > 12) { m = 1; y++ }
                }

                // Fetch data for all months in parallel
                const responses = await Promise.all(
                    monthArray.map(monthStr =>
                        getDataDashBoard({
                            group_code: groupCode,
                            select_type: "Month",
                            select_date: monthStr
                        })
                    )
                )

                const validResponses = responses.filter(r => r !== null) as DashboardData[]

                if (validResponses.length === 0) {
                    setData(null)
                    return
                }

                const firstData = validResponses[0]

                const aggregatedData: DashboardData = {
                    ...firstData,
                    listUnitWattDay: monthArray,
                    listAvgUnit: validResponses.map(r => parseFloat(r.toTalAvgUnit || "0")),
                    listTotalImeiLose: validResponses.map(r => parseFloat(r.totalRTULose || "0")),

                    // Summary Card Totals
                    toTalAvgUnit: validResponses.reduce((sum, r) => sum + parseFloat(r.toTalAvgUnit || "0"), 0).toFixed(2),
                    toTalAvgVolt: (validResponses.reduce((sum, r) => sum + parseFloat(r.toTalAvgVolt || "0"), 0) / validResponses.length).toFixed(2),
                    totalRTULose: Math.round(validResponses.reduce((sum, r) => sum + parseFloat(r.totalRTULose || "0"), 0) / validResponses.length).toString(),

                    // Clear hourly data to force "monthly" view in ChartsSection
                    totalUnitPerHour: [],
                    totalWattPerHour: [],
                    totalVoltPerHour: []
                }

                setData(aggregatedData)

            } else {
                // Single request (Original Logic)
                const result = await getDataDashBoard({
                    group_code: groupCode,
                    select_type: type as Parameters<typeof getDataDashBoard>[0]["select_type"],
                    select_date: date
                })

                // PATCH: User requested to use projectTotalLamp - totalRTULose for listTotalImeiLose calculation
                if (result) {

                    const totalRTULose = parseInt(result.totalRTULose || "0")
                    // This calculates "Online Lamps" if totalRTULose is failures, or "Failures" if totalRTULose is Online.
                    // Following explicit user instruction to replace listTotalImeiLose with this value.
                    const newValue = totalRTULose
                    result.listTotalImeiLose = [newValue]
                }

                setData(result)
            }
        } catch (error) {
            console.error("Failed to fetch dashboard data", error)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        if (defaultGroupCode) {
            handleSearch(defaultGroupCode, "Now", currentMonth)
        }
    }, [defaultGroupCode, currentMonth, handleSearch])

    return (
        <div className="space-y-6">
            <FilterBar groups={groups} startDate={startDate} onSearch={handleSearch} />

            <SummaryCards data={data} loading={loading} />
            <ChartsSection data={data} loading={loading} />
        </div>
    )
}
