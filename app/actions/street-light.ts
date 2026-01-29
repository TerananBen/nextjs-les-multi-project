"use server"

import { cookies } from "next/headers"
import { GetListDataGroupResponse, SearchStreetLightResponse, DeviceGroup, StreetLightDevice, GetLogResponse, StreetLightLog } from "@/types/street-light"

const API_URL = process.env.API_URL

export async function getListDataGroupAction(): Promise<DeviceGroup[]> {
    const cookieStore = await cookies()
    const token = cookieStore.get("jwt")?.value

    if (!API_URL || !token) {
        console.error("API_URL or token missing")
        return []
    }

    try {
        const response = await fetch(`${API_URL}/StreetLight/getListDataGroup`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
            // Explicitly no body as requested
        })

        if (!response.ok) {
            console.error(`API error: ${response.status} ${response.statusText}`)
            return []
        }

        const data: GetListDataGroupResponse = await response.json()
        if (data.result) {
            return data.dataReturn
        }
        return []
    } catch (error) {
        console.error("Error fetching groups:", error)
        return []
    }
}

export async function searchStreetLightFromGroupAction(groupName: string): Promise<StreetLightDevice[]> {
    const cookieStore = await cookies()
    const token = cookieStore.get("jwt")?.value

    if (!API_URL || !token) return []

    try {
        const body = {
            list_group: `["${groupName}"]`,
            operator_select: "OR"
        }

        const response = await fetch(`${API_URL}/StreetLight/searchStreetLightFromGroup`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(body)
        })

        if (!response.ok) return []

        const data: SearchStreetLightResponse = await response.json()
        if (data.result) {
            return data.dataReturn
        }
        return []
    } catch (error) {
        console.error("Error searching street lights:", error)
        return []
    }
}

export async function refreshStreetLightPowerAction(gatewayId: string, imeI_Name: string): Promise<{ success: boolean; power: string; error?: string }> {
    const cookieStore = await cookies()
    const token = cookieStore.get("jwt")?.value
    const PROJECT_NAME = process.env.PROJECT_NAME
    const WAIT_TIME = process.env.WAIT_TIME || "30"

    if (!API_URL || !token || !PROJECT_NAME) {
        return { success: false, power: "0", error: "Configuration missing" }
    }

    try {

        const generatedToken = Array.from(Array(15), () => Math.floor(Math.random() * 36).toString(36)).join('');

        const message = JSON.stringify({
            Type: "GetPower",
            TOKEN: generatedToken
        });

        const body = {
            topic: `${gatewayId}/${imeI_Name}`,
            message: message,
            subscribe: `${PROJECT_NAME}/${imeI_Name}`,
            wait_time: WAIT_TIME
        }

        const response = await fetch(`${API_URL}/StreetLight/readDataMqtt`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(body)
        })

        if (!response.ok) {
            return { success: false, power: "0", error: "API Failed" }
        }

        // Response format:
        // Success: { result: true, dataReturn: "{\"W\":\"44\", ...}" }
        // Fail: { result: true, dataReturn: "" }
        const data = await response.json()

        if (data.result && data.dataReturn) {
            try {
                const parsedData = JSON.parse(data.dataReturn)
                if (parsedData.W) {
                    return { success: true, power: parsedData.W }
                }
            } catch (e) {
                console.error("JSON parse error", e)
            }
        }

        return { success: false, power: "0", error: "Read Failed" }

    } catch (error) {
        console.error("Refresh Power Error:", error)
        return { success: false, power: "0", error: "Exception" }
    }
}

export async function sendStreetLightCommandAction(
    imsi: string,
    commandType: "0" | "1", // 0: Close, 1: Open
    dimPercent: string // 0-100
): Promise<{ success: boolean; error?: string; dataReturn?: string }> {
    const cookieStore = await cookies()
    const token = cookieStore.get("jwt")?.value
    const PROJECT_NAME = process.env.PROJECT_NAME
    const WAIT_TIME = process.env.WAIT_TIME || "30"

    if (!API_URL || !token || !PROJECT_NAME) {
        return { success: false, error: "Configuration missing" }
    }

    try {
        const body = {
            type_open: "imsi",
            imsi: imsi,
            subscribe: `${PROJECT_NAME}/RESPONSE/${imsi}`,
            wait_time: WAIT_TIME,
            command_type: commandType,
            dim_percent: dimPercent
        }

        const response = await fetch(`${API_URL}/StreetLight/sendCommandMqtt`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(body)
        })

        if (!response.ok) {
            return { success: false, error: "API Failed" }
        }

        const data = await response.json()
        if (data.result) {
            // Check if dataReturn is present to determine true success
            // If dataReturn is empty string, it means device didn't respond (timeout?), but API call itself was "ok".
            // Client needs this info to decide whether to retry.
            return { success: !!data.dataReturn, dataReturn: data.dataReturn }
        }

        return { success: false, error: "Command Failed" }

    } catch (error) {
        console.error("Send Command Error:", error)
        return { success: false, error: "Exception" }
    }
}

export async function getDataLogStreetLightMongoAction(
    imsi: string,
    timestamp_start: string,
    timestamp_end: string
): Promise<Record<string, StreetLightLog>> {
    const cookieStore = await cookies()
    const token = cookieStore.get("jwt")?.value

    if (!API_URL || !token) {
        return {}
    }

    try {
        const body = {
            imsi,
            timestamp_start,
            timestamp_end
        }

        const response = await fetch(`${API_URL}/StreetLight/getDataLogStreetLightMongo`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(body)
        })

        if (!response.ok) {
            console.error(`API error: ${response.status} ${response.statusText}`)
            return {}
        }

        const data: GetLogResponse = await response.json()
        if (data.result) {
            return data.dataReturn
        }
        return {}

    } catch (error) {
        console.error("Get Log Error:", error)
        return {}
    }
}
