"use server"

import { fetchLesApi } from "@/lib/les-api"
import { GetDataAlertStreetLightResponse, AlertSetting, SettingAlertStreetLightResponse } from "@/types/setting-system"

export async function getDataAlertStreetLightAction(): Promise<AlertSetting[]> {
    try {
        // 1. Modern versioned endpoint
        const modernData = await fetchLesApi<GetDataAlertStreetLightResponse>(
            "/api/v1/streetlights/settings/alert",
            {
                method: "POST",
                body: JSON.stringify({}),
            }
        )

        if (modernData?.result && Array.isArray(modernData.dataReturn)) {
            return modernData.dataReturn
        }

        // 2. Fallback to legacy route
        const legacyData = await fetchLesApi<GetDataAlertStreetLightResponse>(
            "/StreetLight/getDataAlertStreetLight",
            {
                method: "POST",
                body: JSON.stringify({}),
            }
        )

        if (legacyData?.result && Array.isArray(legacyData.dataReturn)) {
            return legacyData.dataReturn
        }

        return []
    } catch (error) {
        console.error("Error fetching alert settings:", error)
        return []
    }
}

export async function settingAlertStreetLightAction(settings: AlertSetting[]): Promise<{ success: boolean; error?: string }> {
    try {
        // Generate timestamp: YYYY-M-D H:m:s (No padding as per legacy format)
        const today = new Date()
        const date = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`
        const time = `${today.getHours()}:${today.getMinutes()}:${today.getSeconds()}`
        const dateTime = `${date} ${time}`

        const updatedSettings = settings.map((item) => ({
            ...item,
            last_update: dateTime,
        }))

        const body = {
            list_value: JSON.stringify(updatedSettings),
        }

        // 1. Modern versioned endpoint
        const modernRes = await fetchLesApi<SettingAlertStreetLightResponse>(
            "/api/v1/streetlights/settings/setting-alert",
            {
                method: "POST",
                body: JSON.stringify(body),
            }
        )

        if (modernRes?.result && modernRes.dataReturn === true) {
            return { success: true }
        }

        // 2. Fallback to legacy endpoint
        const legacyRes = await fetchLesApi<SettingAlertStreetLightResponse>(
            "/StreetLight/settingAlertStreetLight",
            {
                method: "POST",
                body: JSON.stringify(body),
            }
        )

        if (legacyRes?.result && legacyRes.dataReturn === true) {
            return { success: true }
        }

        return { success: false, error: "Operation failed (dataReturn false)" }
    } catch (error) {
        console.error("Error saving alert settings:", error)
        return { success: false, error: "Exception occurred" }
    }
}
