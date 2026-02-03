"use server"

import { cookies } from "next/headers"

const API_URL = process.env.API_URL

export interface GetListDataGroupResponse {
    result: boolean
    apiName: string
    dateTime: string
    dataReturn: {
        groupCode: string
        groupName: string
    }[]
}

export async function getListDataGroupAction(): Promise<{ groupCode: string; groupName: string }[]> {
    const cookieStore = await cookies()
    const token = cookieStore.get("jwt")?.value

    if (!API_URL || !token) {
        return []
    }

    try {
        const response = await fetch(`${API_URL}/StreetLight/getListDataGroup`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({})
        })

        if (!response.ok) {
            console.error(`API error: ${response.status}`)
            return []
        }

        const data: GetListDataGroupResponse = await response.json()
        if (data.result && Array.isArray(data.dataReturn)) {
            return data.dataReturn
        }
        return []
    } catch (error) {
        console.error("Error fetching group data:", error)
        return []
    }
}

export interface GetListDataIMSIResponse {
    result: boolean
    apiName: string
    dateTime: string
    dataReturn: string[]
}

export async function getListDataIMSIAction(): Promise<string[]> {
    const cookieStore = await cookies()
    const token = cookieStore.get("jwt")?.value

    if (!API_URL || !token) {
        return []
    }

    try {
        const response = await fetch(`${API_URL}/StreetLight/getListDataIMSI`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({})
        })

        if (!response.ok) {
            console.error(`API error: ${response.status}`)
            return []
        }

        const data: GetListDataIMSIResponse = await response.json()
        if (data.result && Array.isArray(data.dataReturn)) {
            return data.dataReturn
        }
        return []
    } catch (error) {
        console.error("Error fetching IMSI data:", error)
        return []
    }
}

export interface GetListDataStreetLightNameResponse {
    result: boolean
    apiName: string
    dateTime: string
    dataReturn: string[]
}

export async function getListDataStreetLightNameAction(): Promise<string[]> {
    const cookieStore = await cookies()
    const token = cookieStore.get("jwt")?.value

    if (!API_URL || !token) {
        return []
    }

    try {
        const response = await fetch(`${API_URL}/StreetLight/getListDataStreetLightName`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({})
        })

        if (!response.ok) {
            console.error(`API error: ${response.status}`)
            return []
        }

        const data: GetListDataStreetLightNameResponse = await response.json()
        if (data.result && Array.isArray(data.dataReturn)) {
            return data.dataReturn
        }
        return []
    } catch (error) {
        console.error("Error fetching Street Light Name data:", error)
        return []
    }
}

export interface LatLongData {
    id: string
    imsi: string
    lat: string
    lng: string
    using_sensor: string
    last_power: string
    type_schedule: string
    gateway_id: string | null
    status: string
    name_pole: string
    name_gov: string
    street_light_name?: string
    group_name?: string
}

export interface GetDataLatLongResponse {
    result: boolean
    apiName: string
    dateTime: string
    dataReturn: LatLongData[]
}

export async function getDataLatLongSearchAction(
    typeSearch: "group" | "imsi" | "street_light_name",
    listValue: string[], // Will be stringified
    statusLamp: string = "all", // "all", "3" (yellow), "4" (fail), "5" (comm error)
    typeGps: string = "rtu" // "rtu", "pole", "mobile"
): Promise<LatLongData[]> {
    const cookieStore = await cookies()
    const token = cookieStore.get("jwt")?.value

    // Use environment variable for default GPS type if not provided or if we want to enforce it from env?
    // User request: "อันนี้จะต้องดึงตั้งค่ามาจาก .env" for type_gps default.
    // However, the action allows overriding. Let's stick to the argument or env.
    const finalTypeGps = typeGps || process.env.NEXT_PUBLIC_GPS_TYPE || "rtu"

    if (!API_URL || !token) {
        return []
    }

    try {
        const response = await fetch(`${API_URL}/StreetLight/getDataLatLong`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                type_search: typeSearch,
                list_value: JSON.stringify(listValue),
                status_lamp: statusLamp,
                type_gps: finalTypeGps
            })
        })

        if (!response.ok) {
            console.error(`API error: ${response.status}`)
            return []
        }

        const data: GetDataLatLongResponse = await response.json()
        if (data.result && Array.isArray(data.dataReturn)) {
            return data.dataReturn
        }
        return []
    } catch (error) {
        console.error("Error fetching LatLong search data:", error)
        return []
    }
}

export interface ImsiDetail {
    imsi: string
    group_name: string
    last_update: string
    last_command: string
    last_status: string
    number_gov: string
    street_light_name: string
    gateway_id: string
}

export interface GetDataDetailIMSIResponse {
    result: boolean
    apiName: string
    dateTime: string
    dataReturn: ImsiDetail
}

export async function getDataDetailIMSIAction(imsi: string): Promise<ImsiDetail | null> {
    const cookieStore = await cookies()
    const token = cookieStore.get("jwt")?.value

    if (!API_URL || !token) {
        return null
    }

    try {
        const response = await fetch(`${API_URL}/StreetLight/getDataDetailIMSI`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ imsi })
        })

        if (!response.ok) {
            console.error(`API error: ${response.status}`)
            return null
        }

        const data: GetDataDetailIMSIResponse = await response.json()
        if (data.result && data.dataReturn) {
            return data.dataReturn
        }
        return null
    } catch (error) {
        console.error("Error fetching IMSI detail:", error)
        return null
    }
}

export interface SendCommandMqttResponse {
    result: boolean
    apiName: string
    dateTime: string
    dataReturn: string // JSON string that needs parsing or empty string on failure
}

export async function sendCommandMqttAction(imsi: string, commandType: "0" | "1", dimPercent: string): Promise<{ success: boolean, message?: string }> {
    const cookieStore = await cookies()
    const token = cookieStore.get("jwt")?.value
    const projectName = process.env.PROJECT_NAME
    const waitTime = process.env.WAIT_TIME || "20"

    if (!API_URL || !token || !projectName) {
        console.error("Missing configuration for sendCommandMqttAction")
        return { success: false, message: "Configuration error" }
    }

    try {
        const body = {
            type_open: "imsi",
            imsi: imsi,
            subscribe: `${projectName}/RESPONSE/${imsi}`,
            wait_time: waitTime,
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
            console.error(`API error: ${response.status}`)
            return { success: false, message: `API Error: ${response.status}` }
        }

        const data: SendCommandMqttResponse = await response.json()

        // Check result
        if (data.result && data.dataReturn) {
            // Data return is a JSON string, ensuring it's not empty means success usually?
            // "{\"Type\":\"Response\",\"SN\":\"IMEI000010\",\"TOKEN\":\"g65C6MepSknqMIvkjCRw\"}"
            try {
                // If it parses JSON successfully, it's likely a success response as per user example
                const parsed = JSON.parse(data.dataReturn);
                if (parsed && (parsed.Type === "Response" || parsed.result === "true")) {
                    return { success: true }
                }
                return { success: true } // Assuming any non-empty return is success based on user input
            } catch (e) {
                return { success: true } // Even purely string return might indicate success if not empty
            }
        } else {
            // If dataReturn is empty, it failed (timeout)
            return { success: false, message: "Timeout or No Response" }
        }
    } catch (error) {
        console.error("Error sending MQTT command:", error)
        return { success: false, message: "Network Error" }
    }
}
