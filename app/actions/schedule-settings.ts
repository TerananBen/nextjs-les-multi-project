"use server"

import { cookies } from "next/headers"
import { ScheduleResponse, ScheduleItem } from "@/types/schedule-settings"

const API_URL = process.env.API_URL

export async function getDataScheduleAction(): Promise<ScheduleItem[]> {
    const cookieStore = await cookies()
    const token = cookieStore.get("jwt")?.value

    if (!API_URL || !token) {
        console.error("API_URL or token missing")
        return []
    }

    try {
        const response = await fetch(`${API_URL}/StreetLight/getDataScheduleMultiSensor`, {
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

        const data: any = await response.json()
        if (data.result && Array.isArray(data.dataReturn)) {
            // Map raw API data to ScheduleItem structure
            return data.dataReturn.map((item: any) => {
                // 1. Parse Group Names from "list_group_name_code" (JSON String of ["Name$Code"])
                let groupNames: string[] = []
                if (item.list_group_name_code) {
                    try {
                        const parsed = typeof item.list_group_name_code === 'string'
                            ? JSON.parse(item.list_group_name_code)
                            : item.list_group_name_code

                        if (Array.isArray(parsed)) {
                            // Expecting "Name$Code" strings
                            groupNames = parsed.map((s: string) => {
                                if (typeof s === 'string' && s.includes('$')) {
                                    return s.split('$')[0].trim()
                                }
                                return s // Fallback if just name or unexpected format
                            })
                        }
                    } catch (e) {
                        console.error("Error parsing list_group_name_code", e)
                    }
                }

                // 2. Parse Scenes from "list_scenes_light" (JSON String)
                let scenes: any[] = []
                if (item.list_scenes_light) {
                    try {
                        const parsed = typeof item.list_scenes_light === 'string'
                            ? JSON.parse(item.list_scenes_light)
                            : item.list_scenes_light

                        // Handle both Array (Time) and Object (Light - single object)
                        if (Array.isArray(parsed)) {
                            scenes = parsed
                        } else if (parsed && typeof parsed === 'object') {
                            scenes = [parsed]
                        }
                    } catch (e) {
                        console.error("Error parsing list_scenes_light", e)
                    }
                }

                return {
                    scheduleName: item.name_schedule || item.scheduleName || "",
                    typeSchedule: item.type_schedule || item.typeSchedule || "time",
                    groupCode: item.code_name || item.groupCode || "",
                    dataGroupName: groupNames.length > 0 ? groupNames : (item.dataGroupName || []),
                    listScenes: scenes.length > 0 ? scenes : (item.listScenes || []),
                    // Other fields as fallback
                    dataGroupCode: item.dataGroupCode || [],
                    listDays: item.listDays || []
                } as ScheduleItem
            })
        }
        return []
    } catch (error) {
        console.error("Error fetching schedule data:", error)
        return []
    }
}

export async function saveScheduleSettingsAction(payload: any): Promise<{ success: boolean; message?: string }> {
    const cookieStore = await cookies()
    const token = cookieStore.get("jwt")?.value

    if (!API_URL || !token) {
        return { success: false, message: "Server configuration error" }
    }

    // Default fields requested by user
    // Note: User specified payload structure doesn't include project_name/user_id anymore.
    // We pass payload directly as everything is expected to be in it.
    const requestBody = payload;

    try {
        const response = await fetch(`${API_URL}/StreetLight/settingScheduleMultiSensorLocal`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(requestBody)
        })

        if (!response.ok) {
            console.error(`API error: ${response.status} ${response.statusText}`)
            return { success: false, message: `API Error: ${response.status}` }
        }

        const data = await response.json()
        if (data.result) {
            return { success: true }
        }
        return { success: false, message: "API returned false result" }
    } catch (error) {
        console.error("Error saving schedule:", error)
        return { success: false, message: "Network error" }
    }
}

export async function deleteScheduleAction(groupCode: string): Promise<{ success: boolean; message?: string }> {
    const cookieStore = await cookies()
    const token = cookieStore.get("jwt")?.value

    if (!API_URL || !token) {
        return { success: false, message: "Server configuration error" }
    }

    try {
        // Payload format: { "json_value": "{\"groupCode\":\"...\"}" }
        const payload = {
            json_value: JSON.stringify({ groupCode })
        }

        const response = await fetch(`${API_URL}/StreetLight/deleteSettingSchedule`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        })

        if (!response.ok) {
            console.error(`API error: ${response.status} ${response.statusText}`)
            return { success: false, message: `API Error: ${response.status}` }
        }

        const data = await response.json()
        if (data.result) {
            return { success: true }
        }
        return { success: false, message: "API returned false result" }
    } catch (error) {
        console.error("Error deleting schedule:", error)
        return { success: false, message: "Network error" }
    }
}

export async function getScheduleResponseAction(codeName: string): Promise<{ result: boolean; dataReturn: any[] }> {
    const cookieStore = await cookies()
    const token = cookieStore.get("jwt")?.value

    if (!API_URL || !token) {
        return { result: false, dataReturn: [] }
    }

    try {
        const response = await fetch(`${API_URL}/StreetLightSmartSolar/getDataResponseSettingSchedule`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ code_name: codeName })
        })

        if (!response.ok) {
            console.error(`API error: ${response.status} ${response.statusText}`)
            return { result: false, dataReturn: [] }
        }

        const data = await response.json()
        return data
    } catch (error) {
        console.error("Error fetching schedule response:", error)
        return { result: false, dataReturn: [] }
    }
}

export async function setModeResendAction(payload: any): Promise<{ success: boolean; message?: string; data?: any }> {
    const cookieStore = await cookies()
    const token = cookieStore.get("jwt")?.value
    const WAIT_TIME = process.env.WAIT_TIME || "30"

    if (!API_URL || !token) {
        return { success: false, message: "Server configuration error" }
    }

    const requestBody = {
        ...payload,
        wait_time: WAIT_TIME
    }

    try {
        const response = await fetch(`${API_URL}/StreetLight/setModeResend`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(requestBody)
        })

        if (!response.ok) {
            console.error(`API error: ${response.status} ${response.statusText}`)
            return { success: false, message: `API Error: ${response.status}` }
        }

        const data = await response.json()

        if (data.result) {
            if (data.dataReturn && data.dataReturn !== "") {
                return { success: true, data: data }
            } else {
                return { success: false, message: "Timeout or No Data Return" }
            }
        }

        return { success: false, message: "API returned false result" }
    } catch (error) {
        console.error("Error resending command:", error)
        return { success: false, message: "Network error" }
    }
}
