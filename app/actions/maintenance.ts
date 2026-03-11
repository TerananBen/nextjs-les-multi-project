"use server"

import { cookies } from "next/headers"

const API_URL = process.env.API_URL

export interface UserOption {
    id: string
    full_name: string
}

export interface OperatorAndAdminData {
    name_operator: UserOption[]
    name_admin: UserOption[]
}

export interface MaintenanceDashboardParams {
    id_admin: string
    id_operator: string
    date_start: string
    date_end: string
}

export interface MaintenanceRecord {
    list_name: string
    name_operator: string
    name_admin: string
    repair_all: string
    wait_repair: string
    count_lamp_all: string
    detail: string
    confrime: string
}

export interface MaintenanceDashboardData {
    total_lamp: string
    total_lamp_waste: string
    total_wait_repair: string
    total_repair_all: string
    list_imsi_all: MaintenanceRecord[]
}

export async function getListDataOperatorAndAdmin(): Promise<OperatorAndAdminData | null> {
    const cookieStore = await cookies()
    const token = cookieStore.get("jwt")?.value

    if (!API_URL || !token) return null

    try {
        const response = await fetch(`${API_URL}/StreetLight/getListDataOperatorAndAdmin`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({}),
        })

        if (!response.ok) return null

        const data = await response.json()
        if (data.result) {
            return data.dataReturn
        }
        return null
    } catch (error) {
        console.error("Error fetching operator and admin list:", error)
        return null
    }
}

export async function getDataListAllMaintenanceDashboard(params: MaintenanceDashboardParams): Promise<MaintenanceDashboardData | null> {
    const cookieStore = await cookies()
    const token = cookieStore.get("jwt")?.value

    if (!API_URL || !token) return null

    try {
        const response = await fetch(`${API_URL}/StreetLight/getDataListAllMaintenanceDashboard`, {
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
        console.error("Error fetching maintenance dashboard data:", error)
        return null
    }
}
