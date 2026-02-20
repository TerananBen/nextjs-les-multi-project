"use server"

import { cookies } from "next/headers"

const API_URL = process.env.API_URL

export interface PersonalItem {
    personal_id: string
    project_id: string
    roles_id: string
    personal_username: string
    first_name: string
    last_name: string
    personal_password: string | null
    last_token: string
    projectName: string
    roleName: string
    last_login: string
    usable: string | null
}

export interface RoleItem {
    [key: string]: string
}

export interface PersonalListResponse {
    result: boolean
    apiName: string
    dateTime: string
    dataReturn: PersonalItem[]
    roleList: RoleItem[]
}

export interface PersonalDetailResponse {
    result: boolean
    apiName: string
    dateTime: string
    dataReturn: PersonalItem
}

export async function getPersonalList(): Promise<PersonalListResponse | null> {
    const cookieStore = await cookies()
    const token = cookieStore.get("jwt")?.value

    if (!API_URL) return null

    try {
        //console.log("Fetching personal list from:", `${API_URL}/StreetLight/getDataListPersonal`)
        const response = await fetch(`${API_URL}/StreetLight/getDataListPersonal`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({}),
        })

        //console.log("Response status:", response.status)
        if (!response.ok) {
            console.error("Response not ok:", await response.text())
            return null
        }
        const data = await response.json()
        //console.log("API Response Data:", JSON.stringify(data, null, 2))
        return data
    } catch (error) {
        console.error("Error fetching personal list:", error)
        return null
    }
}

export async function getPersonalDetail(personal_id: string): Promise<PersonalDetailResponse | null> {
    if (!API_URL) return null

    const cookieStore = await cookies()
    const token = cookieStore.get("jwt")?.value

    try {
        const response = await fetch(`${API_URL}/StreetLight/getDataPersonal`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ personal_id }),
        })

        if (!response.ok) return null
        return await response.json()
    } catch (error) {
        console.error("Error fetching personal detail:", error)
        return null
    }
}

export interface SavePersonalParams {
    personal_id?: string
    personal_firstname: string
    personal_lastname: string
    personal_username: string
    personal_password: string | null
    cmb_role?: string
    actionData: "ADD" | "EDIT"
}

export async function savePersonal(data: SavePersonalParams) {
    if (!API_URL) return { result: false, message: "API URL not configured" }

    const cookieStore = await cookies()
    const token = cookieStore.get("jwt")?.value

    try {
        const response = await fetch(`${API_URL}/StreetLight/saveDataPersonal`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(data),
        })

        return await response.json()
    } catch (error) {
        console.error("Error saving personal:", error)
        return { result: false, message: "Network error" }
    }
}

export async function setPersonalUsable(personal_id: string, status: "Y" | "N") {
    if (!API_URL) return { result: false, message: "API URL not configured" }

    const cookieStore = await cookies()
    const token = cookieStore.get("jwt")?.value

    try {
        const response = await fetch(`${API_URL}/StreetLight/setUsablePersonal`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ personal_id, status }),
        })

        return await response.json()
    } catch (error) {
        console.error("Error setting personal usable:", error)
        return { result: false, message: "Network error" }
    }
}

export async function deletePersonal(personal_id: string) {
    if (!API_URL) return { result: false, message: "API URL not configured" }

    const cookieStore = await cookies()
    const token = cookieStore.get("jwt")?.value

    try {
        const response = await fetch(`${API_URL}/StreetLight/removeDataPersonal`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ personal_id }),
        })

        return await response.json()
    } catch (error) {
        console.error("Error deleting personal:", error)
        return { result: false, message: "Network error" }
    }
}

export async function checkPersonalUsername(personal_username: string) {
    if (!API_URL) return { result: false, message: "API URL not configured" }

    const cookieStore = await cookies()
    const token = cookieStore.get("jwt")?.value

    try {
        const response = await fetch(`${API_URL}/StreetLight/checkDataPersonal`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ personal_username }),
        })

        return await response.json()
    } catch (error) {
        console.error("Error checking username:", error)
        return { result: false, message: "Network error" }
    }
}

export interface UpdatePersonalProfileParams {
    firstname: string
    lastname: string
    password_confirm: string
    password_new?: string
}

export interface EditPersonalResponse {
    result: boolean
    apiName: string
    dateTime: string
    dataReturn: boolean
    message?: string
}

export async function updatePersonalProfile(data: UpdatePersonalProfileParams): Promise<EditPersonalResponse | { result: false, message: string }> {
    if (!API_URL) return { result: false, message: "API URL not configured" }

    const cookieStore = await cookies()
    const token = cookieStore.get("jwt")?.value

    try {
        const response = await fetch(`${API_URL}/StreetLight/editPersonal`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(data),
        })

        return await response.json()
    } catch (error) {
        console.error("Error updating personal profile:", error)
        return { result: false, message: "Network error" }
    }
}
