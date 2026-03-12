"use server"

import { cookies } from "next/headers"

const API_URL = process.env.API_URL

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

export async function getListDataGroupAll(): Promise<GroupItem[]> {
    const cookieStore = await cookies()
    const token = cookieStore.get("jwt")?.value

    if (!API_URL || !token) return []

    try {
        const response = await fetch(`${API_URL}/StreetLight/getListDataGroupAll`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({}),
        })

        if (!response.ok) return []

        const data = await response.json()
        if (data.result) {
            return data.dataReturn
        }
        return []
    } catch (error) {
        console.error("Error fetching group list:", error)
        return []
    }
}

export async function getDataDashBoard(params: DashboardParams): Promise<DashboardData | null> {
    const cookieStore = await cookies()
    const token = cookieStore.get("jwt")?.value

    if (!API_URL || !token) return null

    try {
        const response = await fetch(`${API_URL}/StreetLight/getDataDashBoard`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(params),
        })

        if (!response.ok) return null

        const data = await response.json()
        if (data.result) {
            return data.dataReturn
        }
        return null
    } catch (error) {
        console.error("Error fetching dashboard data:", error)
        return null
    }
}
