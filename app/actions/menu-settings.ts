"use server"

import { cookies } from "next/headers"
import { GetMenuResponse, MenuData } from "@/types/menu-settings"

const API_URL = process.env.API_URL

export async function getDataMenuAction(roleId: string, userId: string = "8"): Promise<MenuData[]> {
    const cookieStore = await cookies()
    const token = cookieStore.get("jwt")?.value

    if (!API_URL || !token) {
        return []
    }

    try {
        const body = {
            user_id: userId, // Defaulting to 8 as per request if not provided, or logic could be improved to extract from token
            role_id: roleId
        }

        const response = await fetch(`${API_URL}/StreetLight/getDataMenu`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}` // Usually required, checking precedent
            },
            body: JSON.stringify(body)
        })

        if (!response.ok) {
            console.error(`API error: ${response.status} ${response.statusText}`)
            return []
        }

        const data: GetMenuResponse = await response.json()
        if (data.result) {
            return data.dataReturn
        }
        return []
    } catch (error) {
        console.error("Error fetching menu data:", error)
        return []
    }
}

import { SettingMenuResponse } from "@/types/menu-settings"

export async function settingMenuAction(roleId: string, jsonValue: string): Promise<SettingMenuResponse | null> {
    const cookieStore = await cookies()
    const token = cookieStore.get("jwt")?.value

    if (!API_URL || !token) {
        return null
    }

    try {
        const body = {
            role_id: roleId,
            json_value: jsonValue
        }

        const response = await fetch(`${API_URL}/StreetLight/settingMenu`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(body)
        })

        if (!response.ok) {
            console.error(`API error: ${response.status} ${response.statusText}`)
            return null
        }

        const data: SettingMenuResponse = await response.json()
        return data
    } catch (error) {
        console.error("Error setting menu:", error)
        return null
    }
}
