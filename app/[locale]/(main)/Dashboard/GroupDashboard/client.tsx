"use client"

import { useState, useEffect } from "react"
import { FilterBar } from "@/components/dashboard/filter-bar"
import { SummaryCards } from "@/components/dashboard/summary-cards"
import { ChartsSection } from "@/components/dashboard/charts-section"
import { GroupItem, DashboardData, getDataDashBoard } from "@/app/actions/dashboard"
import { Loader2 } from "lucide-react"

interface GroupDashboardClientProps {
    groups: GroupItem[]
    defaultGroupCode?: string
}

export function GroupDashboardClient({ groups, defaultGroupCode }: GroupDashboardClientProps) {
    const [data, setData] = useState<DashboardData | null>(null)
    const [loading, setLoading] = useState(false)

    // Initial state
    const currentDate = new Date()
    const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`

    // We need to pass these initial values to FilterBar if we want them controlled there,
    // but FilterBar manages its own state. We might need to lift state up or use refs.
    // For now, let's just trigger the fetch.

    useEffect(() => {
        if (defaultGroupCode) {
            handleSearch(defaultGroupCode, "Now", currentMonth)
        }
    }, [defaultGroupCode])

    const handleSearch = async (groupCode: string, type: string, date: string) => {
        setLoading(true)
        try {
            // Map the type to the API expected values if needed, 
            // but the FilterBar already sends "Month", "Now", etc. which matches the API.
            const result = await getDataDashBoard({
                group_code: groupCode,
                select_type: type as any,
                select_date: date
            })
            setData(result)
        } catch (error) {
            console.error("Failed to fetch dashboard data", error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <FilterBar groups={groups} onSearch={handleSearch} />

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <>
                    <SummaryCards data={data} />
                    <ChartsSection data={data} />
                </>
            )}
        </div>
    )
}
