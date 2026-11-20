"use client"

import { useState, useEffect, useCallback } from "react"
import { FilterBar } from "./filter-bar"
import { SummaryCards } from "./summary-cards"
import { ChartsSection } from "./charts-section"
import { GroupItem, DashboardData, getDataDashBoard } from "@/app/actions/dashboard"
import { toPng } from "html-to-image"
import { toast } from "sonner"
import { IoTReportPDF } from "./pdf-report"
import { pdf } from "@react-pdf/renderer"
import { useTranslations, useLocale } from "next-intl"

interface GroupDashboardClientProps {
    groups: GroupItem[],
    startDate?: string,
    defaultGroupCode?: string
}

function aggregateDashboardResponses(
    validResponses: DashboardData[],
    labelArray: string[]
): DashboardData {
    const firstData = validResponses[0]
    const allRtu = validResponses.flatMap(r => r.listTotalRTULose || [])
    const seenRtu = new Set<string>()
    const dedupedRtu = allRtu.filter(d => {
        const id = d.SN || d.imei
        if (!id || seenRtu.has(id)) return false
        seenRtu.add(id)
        return true
    })

    const allInternet = validResponses.flatMap(r => r.listTotalInternetLose || [])
    const seenInternet = new Set<string>()
    const dedupedInternet = allInternet.filter(d => {
        const id = d.SN || d.imei
        if (!id || seenInternet.has(id)) return false
        seenInternet.add(id)
        return true
    })

    return {
        ...firstData,
        listUnitWattDay: labelArray,
        listAvgUnit: validResponses.map(r => parseFloat(r.toTalAvgUnit || "0")),
        listTotalImeiLose: validResponses.map(r => parseFloat(r.totalRTULose || "0")),
        toTalAvgUnit: validResponses.reduce((sum, r) => sum + parseFloat(r.toTalAvgUnit || "0"), 0).toFixed(2),
        toTalAvgVolt: (validResponses.reduce((sum, r) => sum + parseFloat(r.toTalAvgVolt || "0"), 0) / validResponses.length).toFixed(2),
        totalRTULose: Math.round(validResponses.reduce((sum, r) => sum + parseFloat(r.totalRTULose || "0"), 0) / validResponses.length).toString(),
        totalInternetLose: Math.round(validResponses.reduce((sum, r) => sum + parseFloat(r.totalInternetLose || "0"), 0) / validResponses.length).toString(),
        listTotalRTULose: dedupedRtu,
        listTotalInternetLose: dedupedInternet,
        totalUnitPerHour: [],
        totalWattPerHour: [],
        totalVoltPerHour: []
    }
}

export function GroupDashboardClient({ groups, startDate, defaultGroupCode }: GroupDashboardClientProps) {
    const [data, setData] = useState<DashboardData | null>(null)
    const [loading, setLoading] = useState(false)

    // Initial state
    const currentDate = new Date()
    const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`

    const t = useTranslations("GroupDashboard")
    const locale = useLocale()
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
    const [currentGroupCode, setCurrentGroupCode] = useState<string>(defaultGroupCode || "")
    const [currentDateRange, setCurrentDateRange] = useState<string>(currentMonth)

    const handleSearch = useCallback(async (groupCode: string, type: string, date: string) => {
        setLoading(true)
        setData(null)
        setCurrentDateRange(date)
        setCurrentGroupCode(groupCode)
        try {
            // Case 1: Multi-Day range or Week range -> Daily bars
            if ((type === "Day" && (date.includes(",") || date.includes("_"))) || type === "Week") {
                const [startStr, endStr] = date.includes(",") ? date.split(",") : date.split("_")
                const startDate = new Date(startStr)
                const endDate = new Date(endStr)
                const dateArray: string[] = []

                const curr = new Date(startDate)
                while (curr <= endDate) {
                    dateArray.push(curr.toISOString().split('T')[0])
                    curr.setDate(curr.getDate() + 1)
                }

                const responses = await Promise.all(
                    dateArray.map(dayStr =>
                        getDataDashBoard({
                            group_code: groupCode,
                            select_type: "Day",
                            select_date: dayStr
                        })
                    )
                )

                const validResponses = responses.filter(r => r !== null) as DashboardData[]
                if (validResponses.length === 0) {
                    setData(null)
                    return
                }

                setData(aggregateDashboardResponses(validResponses, dateArray))

            // Case 2: Multi-Month range -> Monthly bars
            } else if (type === "Month" && date.includes("_")) {
                const [startStr, endStr] = date.split("_")
                const [startY, startM] = startStr.split("-").map(Number)
                const [endY, endM] = endStr.split("-").map(Number)

                const monthArray: string[] = []
                let y = startY, m = startM
                while (y < endY || (y === endY && m <= endM)) {
                    monthArray.push(`${y}-${String(m).padStart(2, '0')}`)
                    m++
                    if (m > 12) { m = 1; y++ }
                }

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

                setData(aggregateDashboardResponses(validResponses, monthArray))

            // Case 3: Quarter
            } else if (type === "Quarter") {
                if (date.includes("_")) {
                    // Multi-Quarter range -> Quarterly bars
                    const [startStr, endStr] = date.split("_")
                    const [startY, startQ] = startStr.split("-Q").map(Number)
                    const [endY, endQ] = endStr.split("-Q").map(Number)

                    const quarterList: string[] = []
                    let y = startY, q = startQ
                    while (y < endY || (y === endY && q <= endQ)) {
                        quarterList.push(`${y}-Q${q}`)
                        q++
                        if (q > 4) { q = 1; y++ }
                    }

                    // For each quarter, fetch its 3 months in parallel and aggregate
                    const quarterResponses = await Promise.all(
                        quarterList.map(async (qStr) => {
                            const [qY, qVal] = qStr.split("-Q").map(Number)
                            const mStart = (qVal - 1) * 3 + 1
                            const qMonths = [mStart, mStart + 1, mStart + 2].map(
                                (m) => `${qY}-${String(m).padStart(2, "0")}`
                            )
                            const mResponses = await Promise.all(
                                qMonths.map((mStr) =>
                                    getDataDashBoard({
                                        group_code: groupCode,
                                        select_type: "Month",
                                        select_date: mStr,
                                    })
                                )
                            )
                            const validMonthRes = mResponses.filter((r) => r !== null) as DashboardData[]
                            if (validMonthRes.length === 0) return null
                            return aggregateDashboardResponses(validMonthRes, [qStr])
                        })
                    )

                    const validQuarterRes = quarterResponses.filter((r) => r !== null) as DashboardData[]
                    if (validQuarterRes.length === 0) {
                        setData(null)
                        return
                    }

                    setData(aggregateDashboardResponses(validQuarterRes, quarterList))
                } else {
                    // Single Quarter -> 3 Monthly bars for months within that quarter
                    const [qYear, qQuarter] = date.split("-Q").map(Number)
                    const mStart = (qQuarter - 1) * 3 + 1
                    const qMonths = [mStart, mStart + 1, mStart + 2].map(
                        (m) => `${qYear}-${String(m).padStart(2, "0")}`
                    )

                    const responses = await Promise.all(
                        qMonths.map((mStr) =>
                            getDataDashBoard({
                                group_code: groupCode,
                                select_type: "Month",
                                select_date: mStr,
                            })
                        )
                    )

                    const validResponses = responses.filter((r) => r !== null) as DashboardData[]
                    if (validResponses.length === 0) {
                        setData(null)
                        return
                    }

                    setData(aggregateDashboardResponses(validResponses, qMonths))
                }

            // Case 4: Year
            } else if (type === "Year") {
                if (date.includes("_")) {
                    // Multi-Year range -> Yearly bars
                    const [startY, endY] = date.split("_").map(Number)
                    const yearArray: string[] = []
                    for (let y = startY; y <= endY; y++) {
                        yearArray.push(String(y))
                    }

                    const responses = await Promise.all(
                        yearArray.map((yearStr) =>
                            getDataDashBoard({
                                group_code: groupCode,
                                select_type: "Year",
                                select_date: yearStr,
                            })
                        )
                    )

                    const validResponses = responses.filter((r) => r !== null) as DashboardData[]
                    if (validResponses.length === 0) {
                        setData(null)
                        return
                    }

                    setData(aggregateDashboardResponses(validResponses, yearArray))
                } else {
                    // Single Year -> 12 Monthly bars within that year
                    const yearNum = parseInt(date, 10)
                    const monthArray = Array.from({ length: 12 }, (_, i) =>
                        `${yearNum}-${String(i + 1).padStart(2, "0")}`
                    )

                    const responses = await Promise.all(
                        monthArray.map((monthStr) =>
                            getDataDashBoard({
                                group_code: groupCode,
                                select_type: "Month",
                                select_date: monthStr,
                            })
                        )
                    )

                    const validResponses = responses.filter((r) => r !== null) as DashboardData[]
                    if (validResponses.length === 0) {
                        setData(null)
                        return
                    }

                    setData(aggregateDashboardResponses(validResponses, monthArray))
                }

            // Case 5: Single request (Single Day, Single Month, or "Now")
            } else {
                const result = await getDataDashBoard({
                    group_code: groupCode,
                    select_type: type as Parameters<typeof getDataDashBoard>[0]["select_type"],
                    select_date: date
                })

                if (result) {
                    const totalRTULose = parseInt(result.totalRTULose || "0")
                    if (result.listUnitWattDay && result.listUnitWattDay.length > 1) {
                        // Single Month with daily array: ensure failure array matches days of month
                        if (!result.listTotalImeiLose || result.listTotalImeiLose.length !== result.listUnitWattDay.length) {
                            result.listTotalImeiLose = result.listUnitWattDay.map(() => totalRTULose)
                        }
                    } else {
                        result.listTotalImeiLose = [totalRTULose]
                    }
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

    const handlePrint = async () => {
        if (!data) {
            toast.error(t("charts.noData"))
            return
        }

        try {
            setIsGeneratingPdf(true)
            toast.info(t("pdf.preparing"))

            let energyChartImage
            let failureChartImage

            // Capture charts
            const energyNode = document.getElementById("energy-chart-container")
            if (energyNode) {
                energyChartImage = await toPng(energyNode, { pixelRatio: 2 })
            }

            const failureNode = document.getElementById("failure-chart-container")
            if (failureNode) {
                failureChartImage = await toPng(failureNode, { pixelRatio: 2 })
            }

            const activeGroupProps = groups.find(g => g.group_code === currentGroupCode)
            const isAllProject = !currentGroupCode || currentGroupCode === defaultGroupCode
            const title = isAllProject
                ? t("pdf.titleAll")
                : t("pdf.title", { groupName: activeGroupProps?.group_name || "-" })

            const blob = await pdf(
                <IoTReportPDF
                    data={data}
                    reportTitle={title}
                    dateRange={t("pdf.dateRange", { dateRange: currentDateRange })}
                    energyChartImage={energyChartImage}
                    failureChartImage={failureChartImage}
                    t={{
                        summaryOnlineTotal: t("summary.onlineTotal"),
                        summaryLamp: t("summary.lamp"),
                        summaryLampFailure: t("summary.lampFailure"),
                        summaryInternetFailure: t("summary.internetFailure"),
                        summaryOnlineStatus: t("summary.onlineStatus"),
                        summaryFailureCount: t("summary.failureCount"),
                        summaryVoltage: t("summary.voltage"),
                        summaryVolt: t("summary.volt"),
                        summaryAverageVoltage: t("summary.averageVoltage"),
                        summaryEnergyConsumption: t("summary.energyConsumption"),
                        summaryKwh: t("summary.kwh"),
                        summaryPerMonth: t("summary.perMonth"),
                        footerSystem: t("pdf.footerSystem"),
                        printDate: t("pdf.printDate", { date: new Date().toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' }) }),
                        pageStr: t("pdf.page", { pageNumber: "{pageNumber}", totalPages: "{totalPages}" })
                    }}
                />
            ).toBlob()

            const url = URL.createObjectURL(blob)

            // Trigger download
            const link = document.createElement('a')
            link.href = url
            link.download = `iot_dashboard_report_${new Date().getTime()}.pdf`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(url)

            toast.success(t("pdf.success"))
        } catch (error) {
            console.error("PDF generation failed:", error)
            toast.error(t("pdf.error"))
        } finally {
            setIsGeneratingPdf(false)
        }
    }

    return (
        <div className="flex flex-col gap-3.5 w-full">
            <FilterBar
                defaultGroupCode={defaultGroupCode}
                groups={groups}
                startDate={startDate}
                onSearch={handleSearch}
                onPrint={handlePrint}
                isGeneratingPdf={isGeneratingPdf}
            />

            <SummaryCards data={data} loading={loading} />
            <ChartsSection data={data} loading={loading} />
        </div>
    )
}
