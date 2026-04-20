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

export interface MaintenanceDetailRecord {
    imsi_befor: string
    imsi_after: string
    lat: string
    lng: string
    time_stamp: string
    street_light_name: string
    lamp_case: string
    lamp_status: string
    maintenance_case: string
}

export interface MaintenanceImageRecord {
    id_list: string
    id_img: string
    path_img: string
}

export interface MaintenanceConfigRecord {
    list_name: string
    name_operator: string
    repair_all: string
    wait_repair: string
    count_lamp_all: string
    detail: string
    confrime: string
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

export async function getListDataOperator(): Promise<UserOption[]> {
    const cookieStore = await cookies()
    const token = cookieStore.get("jwt")?.value

    if (!API_URL || !token) return []

    try {
        const response = await fetch(`${API_URL}/StreetLight/getListDataOperator`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({}),
        })

        if (!response.ok) return []

        const data = await response.json()
        if (data.result && data.dataReturn) {
            return data.dataReturn
        }
        return []
    } catch (error) {
        console.error("Error fetching operator list:", error)
        return []
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

export async function getDetailDataMaintenance(id: string): Promise<MaintenanceDetailRecord[] | null> {
    const cookieStore = await cookies()
    const token = cookieStore.get("jwt")?.value

    if (!API_URL || !token) return null

    try {
        const response = await fetch(`${API_URL}/StreetLight/getDetailDataMaintenance`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ id }),
        })

        if (!response.ok) return null

        const data = await response.json()
        if (data.result) {
            return data.dataReturn
        }
        return null
    } catch (error) {
        console.error("Error fetching detail data maintenance:", error)
        return null
    }
}

export async function getLoadImage(id: string): Promise<MaintenanceImageRecord[] | null> {
    const cookieStore = await cookies()
    const token = cookieStore.get("jwt")?.value

    if (!API_URL || !token) return null

    try {
        const response = await fetch(`${API_URL}/StreetLight/getLoadImage`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ id }),
        })

        if (!response.ok) return null

        const data = await response.json()
        if (data.result) {
            return data.dataReturn
        }
        return null
    } catch (error) {
        console.error("Error fetching load image:", error)
        return null
    }
}

export async function getDataListMaintenanceTotal(): Promise<MaintenanceConfigRecord[] | null> {
    const cookieStore = await cookies()
    const token = cookieStore.get("jwt")?.value

    if (!API_URL || !token) return null

    try {
        const response = await fetch(`${API_URL}/StreetLight/getDataListMaintenanceTotal`, {
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
        console.error("Error fetching maintenance config list:", error)
        return null
    }
}

export interface MaintenanceDetailListRecord {
    list_name: string
    name_operator: string
    repair_all: string
    wait_repair: string
    count_lamp_all: string
    detail: string
    confrime: string
}

export async function getDataListMaintenanceDetail(): Promise<MaintenanceDetailListRecord[] | null> {
    const cookieStore = await cookies()
    const token = cookieStore.get("jwt")?.value

    if (!API_URL || !token) return null

    try {
        const response = await fetch(`${API_URL}/StreetLight/getDataListMaintenanceDetail`, {
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
        console.error("Error fetching maintenance detail list:", error)
        return null
    }
}

export interface SaveDataMaintenancePayload {
    list_name: string
    id_operator: string
    id_admin: string
    list_imsi: string
}

export async function saveAddDataMaintenanceAction(payload: SaveDataMaintenancePayload): Promise<{ success: boolean; message?: string }> {
    const cookieStore = await cookies()
    const token = cookieStore.get("jwt")?.value

    if (!API_URL || !token) return { success: false, message: "Authentication required" }

    try {
        const response = await fetch(`${API_URL}/StreetLight/saveAddDataMaintenance`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(payload),
        })

        if (!response.ok) return { success: false, message: `Server error: ${response.status}` }

        const data = await response.json()
        if (data.result && data.dataReturn === true) {
            return { success: true }
        }
        return { success: false, message: "Failed to save maintenance data" }
    } catch (error) {
        console.error("Error saving maintenance data:", error)
        return { success: false, message: "Network error occurred" }
    }
}

export async function deleteDetailDataMaintenanceAction(id: string): Promise<{ success: boolean; message?: string }> {
    const cookieStore = await cookies()
    const token = cookieStore.get("jwt")?.value

    if (!API_URL || !token) return { success: false, message: "Authentication required" }

    try {
        const response = await fetch(`${API_URL}/StreetLight/deleteDetailDataMaintenance`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ id }),
        })

        if (!response.ok) return { success: false, message: `Server error: ${response.status}` }

        const data = await response.json()
        if (data.result && data.dataReturn === true) {
            return { success: true }
        }
        return { success: false, message: "Failed to delete maintenance data" }
    } catch (error) {
        console.error("Error deleting maintenance data:", error)
        return { success: false, message: "Network error occurred" }
    }
}

export interface ConfirmDataMaintenancePayload {
    type: "T" | "F"
    id: string
}

export async function confirmDataMaintenanceAction(payload: ConfirmDataMaintenancePayload): Promise<{ success: boolean; message?: string }> {
    const cookieStore = await cookies()
    const token = cookieStore.get("jwt")?.value

    if (!API_URL || !token) return { success: false, message: "Authentication required" }

    try {
        const response = await fetch(`${API_URL}/StreetLight/confrimeDataMaintenance`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(payload),
        })

        if (!response.ok) return { success: false, message: `Server error: ${response.status}` }

        const data = await response.json()
        if (data.result && data.dataReturn === true) {
            return { success: true }
        }
        return { success: false, message: "Failed to update maintenance status" }
    } catch (error) {
        console.error("Error updating maintenance status:", error)
        return { success: false, message: "Network error occurred" }
    }
}

export interface UploadImageReq {
    id: string
    img_base64_string: string
}

export interface UploadImageRes {
    result: boolean
    apiName: string
    dateTime: string
    dataReturn: {
        id_list: string
        id_img: string
        path_img: string | null
    }
}

export async function uploadImageAction(payload: UploadImageReq): Promise<{ success: boolean; data?: UploadImageRes["dataReturn"]; message?: string }> {
    const cookieStore = await cookies()
    const token = cookieStore.get("jwt")?.value

    if (!API_URL || !token) return { success: false, message: "Authentication required" }

    try {
        const response = await fetch(`${API_URL}/StreetLight/uploadImage`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(payload),
        })

        if (!response.ok) return { success: false, message: `Server error: ${response.status}` }

        const data: UploadImageRes = await response.json()
        if (data.result) {
            return { success: true, data: data.dataReturn }
        }
        return { success: false, message: "Failed to upload image" }
    } catch (error) {
        console.error("Error uploading image:", error)
        return { success: false, message: "Network error occurred" }
    }
}

export interface DeleteImageReq {
    id_list: string
    id_img: string
}

export interface DeleteImageRes {
    result: boolean
    apiName: string
    dateTime: string
    dataReturn: boolean
}

export async function deleteImageAction(payload: DeleteImageReq): Promise<{ success: boolean; message?: string }> {
    const cookieStore = await cookies()
    const token = cookieStore.get("jwt")?.value

    if (!API_URL || !token) return { success: false, message: "Authentication required" }

    try {
        const response = await fetch(`${API_URL}/StreetLight/deleteImage`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(payload),
        })

        if (!response.ok) return { success: false, message: `Server error: ${response.status}` }

        const data: DeleteImageRes = await response.json()
        if (data.result && data.dataReturn === true) {
            return { success: true }
        }
        return { success: false, message: "Failed to delete image" }
    } catch (error) {
        console.error("Error deleting image:", error)
        return { success: false, message: "Network error occurred" }
    }
}

export interface ConfirmDataMaintenanceDetailPayload {
    type: "T" | "F"
    id: string
    street_light_name: string
    rtu_new: string
}

export async function confirmDataMaintenanceDetailAction(payload: ConfirmDataMaintenanceDetailPayload): Promise<{ success: boolean; message?: string }> {
    const cookieStore = await cookies()
    const token = cookieStore.get("jwt")?.value

    if (!API_URL || !token) return { success: false, message: "Authentication required" }

    try {
        const response = await fetch(`${API_URL}/StreetLight/confrimeDataMaintenanceDetail`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(payload),
        })

        if (!response.ok) return { success: false, message: `Server error: ${response.status}` }

        const data = await response.json()
        if (data.result && data.dataReturn === true) {
            return { success: true }
        }
        return { success: false, message: "Failed to update detail status" }
    } catch (error) {
        console.error("Error updating detail status:", error)
        return { success: false, message: "Network error occurred" }
    }
}

export interface MaintenanceCaseSavePayload {
    id: string
    maintenance_case_id: string
    street_light_name: string
}

export async function maintenanceCaseSaveAction(payload: MaintenanceCaseSavePayload): Promise<{ success: boolean; message?: string }> {
    const cookieStore = await cookies()
    const token = cookieStore.get("jwt")?.value

    if (!API_URL || !token) return { success: false, message: "Authentication required" }

    try {
        const response = await fetch(`${API_URL}/StreetLight/maintenanceCaseSave`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(payload),
        })

        if (!response.ok) return { success: false, message: `Server error: ${response.status}` }

        const data = await response.json()
        if (data.result && data.dataReturn === true) {
            return { success: true }
        }
        return { success: false, message: "Failed to update maintenance case" }
    } catch (error) {
        console.error("Error updating maintenance case:", error)
        return { success: false, message: "Network error occurred" }
    }
}
