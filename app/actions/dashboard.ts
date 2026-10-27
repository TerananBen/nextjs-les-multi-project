"use server"

export interface GroupItem {
    group_name: string
    group_code: string
    sub_district: string
    total_rtu: string
}

export interface DashboardParams {
    group_code: string
    select_type: "Month" | "Now" | "Day" | "Week" | "Quarter" | "Year"
    select_date: string
}

export interface DashboardData {
    listUnitWattDay: string[]
    groupName: string
    listImeiLostDateDetail: string[]
    listAvgUnit: number[]
    listTotalImeiLose: number[]
    listAvgWatt: number[]
    listAvgVolt: number[]
    listTotalImeiWattOver: unknown[]
    listTotalImeiWattLess: unknown[]
    listTotalImeiVoltOver: unknown[]
    listTotalImeiVoltLess: unknown[]
    listLostContact1Hr: number[]
    listLostContact3Hr: number[]
    listLostContact6Hr: number[]
    listLostContact12Hr: number[]
    listLostContact24Hr: number[]
    totalWattPerHour: number[]
    totalVoltPerHour: number[]
    totalUnitPerHour: number[]
    totalLostImei: string
    toTalAvgUnit: string
    toTalAvgWatt: string
    toTalAvgVolt: string
    toTalImei: string
    totalImeiWattOver: string
    totalImeiWattLess: string
    totalImeiVoltOver: string
    totalImeiVoltLess: string
    listTotalLampLose: unknown[]
    listTotalRTULose: unknown[]
    listTotalInternetLose: unknown[]
    totalLampLose: string
    totalVoltageWattLose: string
    totalRTULose: string
    totalInternetLose: string
    projectTotalLamp: string
    projectGroupCode: string
}

import { fetchLesApi } from "@/lib/les-api"
import { getProjectId } from "@/lib/project"
import { resolveProjectSlug } from "@/config/projects"
import { getDashboardApiVersion } from "@/app/actions/api-settings"

export async function getListDataGroupAll(): Promise<GroupItem[]> {
    try {
        const version = await getDashboardApiVersion()

        const data = await fetchLesApi<GroupItem[] | { result?: boolean; dataReturn?: GroupItem[] }>(
            `/api/v${version}/streetlights/groups/all`,
            {
                method: "GET",
                skipProject: true,
            }
        )

        let rawList: unknown[] = []
        if (Array.isArray(data)) {
            rawList = data
        } else if (data && "dataReturn" in data && Array.isArray(data.dataReturn)) {
            rawList = data.dataReturn
        }

        if (rawList.length > 0) {
            return rawList.map((item) => {
                const g = item as Record<string, unknown>
                return {
                    group_code: String(g.group_code ?? g.GroupCode ?? ""),
                    group_name: String(g.group_name ?? g.GroupName ?? ""),
                    sub_district: String(g.sub_district ?? g.SubDistrict ?? "-"),
                    total_rtu: String(g.total_rtu ?? g.TotalRtu ?? "0"),
                }
            })
        }
        return []
    } catch (error) {
        console.error("Error fetching group list:", error)
        return []
    }
}

export async function getDataDashBoard(params: DashboardParams): Promise<DashboardData | null> {
    try {
        const rawProjectId = await getProjectId()
        const projectSlug = resolveProjectSlug(rawProjectId)
        const version = await getDashboardApiVersion()

        const payload = {
            project_name: projectSlug,
            projectName: projectSlug,
            group_code: params.group_code,
            select_type: params.select_type,
            select_date: params.select_date,
        }

        const data = await fetchLesApi<DashboardData | { result?: boolean; dataReturn?: DashboardData }>(
            `/api/v${version}/streetlights/dashboard`,
            {
                method: "POST",
                body: JSON.stringify(payload),
                skipProject: true,
            }
        )

        if (data) {
            if ("result" in data && data.result && data.dataReturn) {
                return data.dataReturn
            }
            if ("groupName" in data || "totalLostImei" in data || "listAvgWatt" in data) {
                return data as DashboardData
            }
        }
        return null
    } catch (error) {
        console.error("Error fetching dashboard data:", error)
        return null
    }
}
