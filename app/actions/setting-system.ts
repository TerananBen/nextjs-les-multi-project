"use server"

import { cookies } from "next/headers"
import { GetDataAlertStreetLightResponse, AlertSetting, SettingAlertStreetLightResponse } from "@/types/setting-system"

const API_URL = process.env.API_URL

export async function getDataAlertStreetLightAction(): Promise<AlertSetting[]> {
    const cookieStore = await cookies()
    const token = cookieStore.get("jwt")?.value

    if (!API_URL || !token) {
        console.error("API_URL or token missing")
        return []
    }

    try {
        const response = await fetch(`${API_URL}/StreetLight/getDataAlertStreetLight`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({})
        })

        if (!response.ok) {
            console.error(`API error: ${response.status} ${response.statusText}`)
            return []
        }

        const data: GetDataAlertStreetLightResponse = await response.json()
        if (data.result) {
            return data.dataReturn
        }
        return []
    } catch (error) {
        console.error("Error fetching alert settings:", error)
        return []
    }
}

export async function settingAlertStreetLightAction(settings: AlertSetting[]): Promise<{ success: boolean; error?: string }> {
    const cookieStore = await cookies()
    const token = cookieStore.get("jwt")?.value

    if (!API_URL || !token) {
        return { success: false, error: "Configuration missing" }
    }

    try {
        // Generate timestamp: YYYY-M-D H:m:s (No padding as per request/example)
        const today = new Date();
        const date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
        const time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
        const dateTime = date + ' ' + time;

        const updatedSettings = settings.map(item => ({
            ...item,
            last_update: dateTime
        }));

        const body = {
            list_value: JSON.stringify(updatedSettings)
        }

        const response = await fetch(`${API_URL}/StreetLight/settingAlertStreetLight`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(body)
        })

        if (!response.ok) {
            return { success: false, error: `API error: ${response.status}` }
        }

        const data: SettingAlertStreetLightResponse = await response.json()

        // Check dataReturn specifically as requested (true = success, false = fail)
        if (data.result && data.dataReturn === true) {
            return { success: true }
        }
        return { success: false, error: "Operation failed (dataReturn false)" }

    } catch (error) {
        console.error("Error saving alert settings:", error)
        return { success: false, error: "Exception occurred" }
    }
}
