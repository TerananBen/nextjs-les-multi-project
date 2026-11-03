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

function toNumArray(val: unknown): number[] {
    if (Array.isArray(val)) {
        return val.map((v) => (typeof v === "number" ? v : parseFloat(String(v)) || 0))
    }
    return []
}

function toStrArray(val: unknown): string[] {
    if (Array.isArray(val)) {
        return val.map((v) => String(v ?? ""))
    }
    return []
}

function toUnknownArray(val: unknown): unknown[] {
    return Array.isArray(val) ? val : []
}

function normalizeDashboardData(raw: Record<string, unknown>): DashboardData {
    return {
        listUnitWattDay: toStrArray(raw.listUnitWattDay ?? raw.ListUnitWattDay),
        groupName: String(raw.groupName ?? raw.GroupName ?? ""),
        listImeiLostDateDetail: toStrArray(raw.listImeiLostDateDetail ?? raw.ListImeiLostDateDetail),
        listAvgUnit: toNumArray(raw.listAvgUnit ?? raw.ListAvgUnit),
        listTotalImeiLose: toNumArray(raw.listTotalImeiLose ?? raw.ListTotalImeiLose),
        listAvgWatt: toNumArray(raw.listAvgWatt ?? raw.ListAvgWatt),
        listAvgVolt: toNumArray(raw.listAvgVolt ?? raw.ListAvgVolt),
        listTotalImeiWattOver: toUnknownArray(raw.listTotalImeiWattOver ?? raw.ListTotalImeiWattOver),
        listTotalImeiWattLess: toUnknownArray(raw.listTotalImeiWattLess ?? raw.ListTotalImeiWattLess),
        listTotalImeiVoltOver: toUnknownArray(raw.listTotalImeiVoltOver ?? raw.ListTotalImeiVoltOver),
        listTotalImeiVoltLess: toUnknownArray(raw.listTotalImeiVoltLess ?? raw.ListTotalImeiVoltLess),
        listLostContact1Hr: toNumArray(raw.listLostContact1Hr ?? raw.ListLostContact1Hr),
        listLostContact3Hr: toNumArray(raw.listLostContact3Hr ?? raw.ListLostContact3Hr),
        listLostContact6Hr: toNumArray(raw.listLostContact6Hr ?? raw.ListLostContact6Hr),
        listLostContact12Hr: toNumArray(raw.listLostContact12Hr ?? raw.ListLostContact12Hr),
        listLostContact24Hr: toNumArray(raw.listLostContact24Hr ?? raw.ListLostContact24Hr),
        totalWattPerHour: toNumArray(raw.totalWattPerHour ?? raw.TotalWattPerHour),
        totalVoltPerHour: toNumArray(raw.totalVoltPerHour ?? raw.TotalVoltPerHour),
        totalUnitPerHour: toNumArray(raw.totalUnitPerHour ?? raw.TotalUnitPerHour),
        totalLostImei: String(raw.totalLostImei ?? raw.TotalLostImei ?? "0"),
        toTalAvgUnit: String(raw.toTalAvgUnit ?? raw.ToTalAvgUnit ?? "0"),
        toTalAvgWatt: String(raw.toTalAvgWatt ?? raw.ToTalAvgWatt ?? "0"),
        toTalAvgVolt: String(raw.toTalAvgVolt ?? raw.ToTalAvgVolt ?? "0"),
        toTalImei: String(raw.toTalImei ?? raw.ToTalImei ?? "0"),
        totalImeiWattOver: String(raw.totalImeiWattOver ?? raw.TotalImeiWattOver ?? "0"),
        totalImeiWattLess: String(raw.totalImeiWattLess ?? raw.TotalImeiWattLess ?? "0"),
        totalImeiVoltOver: String(raw.totalImeiVoltOver ?? raw.TotalImeiVoltOver ?? "0"),
        totalImeiVoltLess: String(raw.totalImeiVoltLess ?? raw.TotalImeiVoltLess ?? "0"),
        listTotalLampLose: toUnknownArray(raw.listTotalLampLose ?? raw.ListTotalLampLose),
        listTotalRTULose: toUnknownArray(raw.listTotalRTULose ?? raw.ListTotalRTULose),
        listTotalInternetLose: toUnknownArray(raw.listTotalInternetLose ?? raw.ListTotalInternetLose),
        totalLampLose: String(raw.totalLampLose ?? raw.TotalLampLose ?? "0"),
        totalVoltageWattLose: String(raw.totalVoltageWattLose ?? raw.TotalVoltageWattLose ?? "0"),
        totalRTULose: String(raw.totalRTULose ?? raw.TotalRTULose ?? "0"),
        totalInternetLose: String(raw.totalInternetLose ?? raw.TotalInternetLose ?? "0"),
        projectTotalLamp: String(raw.projectTotalLamp ?? raw.ProjectTotalLamp ?? raw.toTalImei ?? raw.ToTalImei ?? "0"),
        projectGroupCode: String(raw.projectGroupCode ?? raw.ProjectGroupCode ?? raw.group_code ?? raw.GroupCode ?? ""),
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
            let rawData: Record<string, unknown> | null = null
            if ("result" in data && data.result && data.dataReturn) {
                rawData = data.dataReturn as unknown as Record<string, unknown>
            } else if (typeof data === "object") {
                rawData = data as unknown as Record<string, unknown>
            }

            if (rawData) {
                return normalizeDashboardData(rawData)
            }
        }
        return null
    } catch (error) {
        console.error("Error fetching dashboard data:", error)
        return null
    }
}
