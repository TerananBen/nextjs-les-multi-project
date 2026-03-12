"use server"

import { cookies } from "next/headers"
import {
    GetListDataGroupAllResponse,
    GroupConfigData,
    ControlGroupResponse,
    ResendCommandResponse,
    GetDataLatLongResponseControlResponse,
    GetListDataIMSIAllResponse
} from "@/types/group-config"

const API_URL = process.env.API_URL

export async function getListDataGroupAllAction(): Promise<GroupConfigData[]> {
    const cookieStore = await cookies()
    const token = cookieStore.get("jwt")?.value

    if (!API_URL || !token) {
        console.error("API_URL or token missing")
        return []
    }

    try {
        const response = await fetch(`${API_URL}/StreetLight/getListDataGroupAll`, {
            method: "POST", // Assumption: typical pattern in this project is POST for list retrieval
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

        const data: GetListDataGroupAllResponse = await response.json()
        if (data.result) {
            return data.dataReturn
        }
        return []
    } catch (error) {
        console.error("Error fetching group all data:", error)
        return []
    }
}

export async function addNewGroupNameAction(groupName: string): Promise<{ result: boolean; message?: string }> {
    const cookieStore = await cookies()
    const token = cookieStore.get("jwt")?.value

    if (!API_URL || !token) {
        return { result: false, message: "Server configuration error" }
    }

    try {
        const response = await fetch(`${API_URL}/StreetLight/addNewGroupName`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                group_name: groupName
            })
        })

        if (!response.ok) {
            return { result: false, message: `API error: ${response.status}` }
        }

        const data = await response.json()

        // The user request says: 
        // { "result": true, "apiName": "StreetLight/addNewGroupName", "dateTime": "...", "dataReturn": true }
        // "ถ้านอกกเหนื่อจากนั้นคือ เพิ่มไม่สำเร็จ" (If other than that, it's failed)

        if (data.result && data.dataReturn === true) {
            return { result: true }
        }

        return { result: false, message: "API returned failure" }

    } catch (error) {
        console.error("Error adding group:", error)
        return { result: false, message: "Network error" }
    }
}

export async function deleteGroupConfigAction(groupCode: string, groupName: string): Promise<{ result: boolean; message?: string }> {
    const cookieStore = await cookies()
    const token = cookieStore.get("jwt")?.value

    if (!API_URL || !token) {
        return { result: false, message: "Server configuration error" }
    }

    try {
        const response = await fetch(`${API_URL}/StreetLight/deleteGroupConfig`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                group_code: groupCode,
                group_name: groupName
            })
        })

        if (!response.ok) {
            return { result: false, message: `API error: ${response.status}` }
        }

        const data = await response.json()

        // User specified response:
        // { "result": true, "apiName": "StreetLight/deleteGroupConfig", "dateTime": "...", "dataReturn": true }

        if (data.result && data.dataReturn === true) {
            return { result: true }
        }

        return { result: false, message: "API returned failure" }

    } catch (error) {
        console.error("Error deleting group:", error)
        return { result: false, message: "Network error" }
    }
}

import { GetListDataGroupDetailResponse, GroupDetailData } from "@/types/group-config"

export async function getListDataGroupDetailAction(searchGroupName: string = "ALL"): Promise<GroupDetailData[]> {
    const cookieStore = await cookies()
    const token = cookieStore.get("jwt")?.value

    if (!API_URL || !token) {
        return []
    }

    try {
        const response = await fetch(`${API_URL}/StreetLight/getListDataGroupDetail`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                group_name: searchGroupName, // Using the argument, defaulting to "ALL"
                type_search: "OR"
            })
        })

        if (!response.ok) {
            console.error(`API error: ${response.status}`)
            return []
        }

        const data: GetListDataGroupDetailResponse = await response.json()
        if (data.result && Array.isArray(data.dataReturn)) {
            return data.dataReturn
        }
        return []

    } catch (error) {
        console.error("Error fetching group detail:", error)
        return []
    }
}

import { GetDataLatLongResponse, LatLongData } from "@/types/group-config"

export async function getDataLatLongAction(groupName: string): Promise<LatLongData[]> {
    const cookieStore = await cookies()
    const token = cookieStore.get("jwt")?.value

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
                type_search: "group",
                list_value: JSON.stringify([groupName]),
                status_lamp: "all",
                type_gps: "rtu"
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
        console.error("Error fetching lat long data:", error)
        return []
    }
}

export async function configLatLongLampAndPoleAction(data: {
    imsi: string;
    lat_lamp: string;
    long_lamp: string;
    name_pole: string;
    name_gov: string;
}): Promise<{ result: boolean; message?: string }> {
    const cookieStore = await cookies()
    const token = cookieStore.get("jwt")?.value

    if (!API_URL || !token) {
        return { result: false, message: "Server configuration error" }
    }

    try {
        const response = await fetch(`${API_URL}/StreetLight/configLatLongLampAndPole`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(data)
        })

        if (!response.ok) {
            return { result: false, message: `API error: ${response.status}` }
        }

        const resData = await response.json()

        if (resData.result && resData.dataReturn === true) {
            return { result: true }
        }

        return { result: false, message: "API returned failure" }

    } catch (error) {
        console.error("Error configuring device:", error)
        return { result: false, message: "Network error" }
    }
}

export async function deleteImsiGroupConfigAction(data: {
    group_code: string;
    group_name: string;
    imsi: string;
}): Promise<{ result: boolean; message?: string }> {
    const cookieStore = await cookies()
    const token = cookieStore.get("jwt")?.value

    if (!API_URL || !token) {
        return { result: false, message: "Server configuration error" }
    }

    try {
        const response = await fetch(`${API_URL}/StreetLight/deleteImsiGroupConfig`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(data)
        })

        if (!response.ok) {
            return { result: false, message: `API error: ${response.status}` }
        }

        const resData = await response.json()

        if (resData.result && resData.dataReturn === true) {
            return { result: true }
        }

        return { result: false, message: "API returned failure" }

    } catch (error) {
        console.error("Error deleting device from group:", error)
        return { result: false, message: "Network error" }
    }
}

export async function addRtuToGroupAction(data: {
    group_code: string;
    group_name: string;
    imsi: string;
}): Promise<{ result: boolean; message?: string }> {
    const cookieStore = await cookies()
    const token = cookieStore.get("jwt")?.value

    if (!API_URL || !token) {
        return { result: false, message: "Server configuration error" }
    }

    try {
        const response = await fetch(`${API_URL}/StreetLight/addRtuToGroup`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(data)
        })

        if (!response.ok) {
            return { result: false, message: `API error: ${response.status}` }
        }

        const resData = await response.json()

        if (resData.result && resData.dataReturn === true) {
            return { result: true }
        }

        return { result: false, message: "API returned failure" }

    } catch (error) {
        console.error("Error adding device to group:", error)
        return { result: false, message: "Network error" }
    }
}

export async function sendCommandMqttMultiGroupV2Action(data: {
    group_code: string;
    command_type: string;
    dim_percent: string;
}): Promise<{ result: boolean; dataReturn?: string; message?: string }> {
    const cookieStore = await cookies()
    const token = cookieStore.get("jwt")?.value

    if (!API_URL || !token) {
        return { result: false, message: "Server configuration error" }
    }

    try {
        const payload = {
            type_open: "group",
            group_code: JSON.stringify([data.group_code]),
            command_type: data.command_type,
            dim_percent: data.dim_percent
        }

        const response = await fetch(`${API_URL}/StreetLight/sendCommandMqttMultiGroupV2`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        })

        const resData: ControlGroupResponse = await response.json()

        if (response.ok && resData.result) {
            return { result: true, dataReturn: resData.dataReturn }
        }

        return { result: false, message: "API failure" }
    } catch (error) {
        console.error("Error sending group command:", error)
        return { result: false, message: "Network error" }
    }
}

export async function sendCommandMqttMultiRtuV2Action(data: {
    list_imsi: string[];
    command_type: string;
    dim_percent: string;
}): Promise<{ result: boolean; dataReturn?: string; message?: string }> {
    const cookieStore = await cookies()
    const token = cookieStore.get("jwt")?.value

    if (!API_URL || !token) {
        return { result: false, message: "Server configuration error" }
    }

    try {
        const payload = {
            type_open: "4",
            list_imsi: JSON.stringify(data.list_imsi),
            command_type: data.command_type,
            dim_percent: data.dim_percent
        }

        const response = await fetch(`${API_URL}/StreetLight/sendCommandMqttMultiRtuV2`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        })

        const resData: ControlGroupResponse = await response.json()

        if (response.ok && resData.result) {
            return { result: true, dataReturn: resData.dataReturn }
        }

        return { result: false, message: "API failure" }
    } catch (error) {
        console.error("Error sending RTU command:", error)
        return { result: false, message: "Network error" }
    }
}

export async function resendCommandOnOffAction(tokenStr: string): Promise<{ result: boolean; message?: string }> {
    const cookieStore = await cookies()
    const token = cookieStore.get("jwt")?.value

    if (!API_URL || !token) {
        return { result: false, message: "Server configuration error" }
    }

    try {
        const response = await fetch(`${API_URL}/StreetLight/resendCommandOnOff`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ token: tokenStr })
        })

        const resData: ResendCommandResponse = await response.json()

        if (response.ok && resData.result) {
            return { result: true }
        }

        return { result: false, message: "API failure" }
    } catch (error) {
        console.error("Error resending command:", error)
        return { result: false, message: "Network error" }
    }
}

export async function getDataLatLongResponseControlAction(tokenStr: string, groupCode: string): Promise<{ result: boolean; dataReturn?: unknown[]; message?: string }> {
    const cookieStore = await cookies()
    const token = cookieStore.get("jwt")?.value

    if (!API_URL || !token) {
        return { result: false, message: "Server configuration error" }
    }

    try {
        const response = await fetch(`${API_URL}/StreetLightSmartSolar/getDataLatLongResponseControl`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                token: tokenStr,
                group_code: JSON.stringify([groupCode])
            })
        })

        const resData: GetDataLatLongResponseControlResponse = await response.json()

        if (response.ok && resData.result) {
            return { result: true, dataReturn: resData.dataReturn }
        }

        return { result: false, message: "API failure" }
    } catch (error) {
        console.error("Error checking command status:", error)
        return { result: false, message: "Network error" }
    }
}

export async function getListDataIMSIAllAction(): Promise<string[]> {
    const cookieStore = await cookies()
    const token = cookieStore.get("jwt")?.value

    if (!API_URL || !token) {
        return []
    }

    try {
        const response = await fetch(`${API_URL}/StreetLight/getListDataIMSIAll`, {
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

        const data: GetListDataIMSIAllResponse = await response.json()
        if (data.result && Array.isArray(data.dataReturn)) {
            return data.dataReturn
        }
        return []
    } catch (error) {
        console.error("Error fetching IMSI list:", error)
        return []
    }
}



