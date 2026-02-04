"use server"

import { cookies } from "next/headers"

interface LoginState {
    success: boolean
    message?: string
    failedAttempts?: string | null
    errorKey?: string
}

export async function login(prevState: LoginState, formData: FormData): Promise<LoginState> {
    const username = formData.get("username") as string
    const password = formData.get("password") as string
    const projectName = process.env.PROJECT_NAME
    const apiUrl = process.env.API_URL

    if (!apiUrl) {
        console.error("API_URL is not defined")
        return { success: false, message: "Server configuration error: API_URL is missing. Please restart the server.", errorKey: "connectionError" }
    }

    if (!username || !password) {
        return { success: false, message: "Username and password are required" }
    }

    try {
        const response = await fetch(`${apiUrl}/StreetLight/accountLogin`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                username,
                password,
                projectName,
            }),
        })

        let data
        try {
            data = await response.json()
        } catch (e) {
            console.error("Failed to parse response JSON", e)
            return { success: false, message: "Failed to connect to the server", errorKey: "connectionError" }
        }

        if (data.result) {
            // Success
            const cookieStore = await cookies()
            cookieStore.set("jwt", data.dataReturn, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                path: "/",
            })
            cookieStore.set("menuRole", data.dataMenuRole, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                path: "/",
            })
            return { success: true }
        } else {
            // Failure (including 401)
            // The API returns { result: false, dataReturn: "denied", dataContLogin: "1", ... }
            return {
                success: false,
                message: data.dataReturn, // "denied" or other error message
                failedAttempts: data.dataContLogin, // "1", "2", etc.
                errorKey: data.dataReturn === "denied" ? "usernameError" : undefined // Map "denied" to a specific error key if needed, or just use the message
            }
        }
    } catch (error) {
        console.error("Login error:", error)
        return { success: false, message: "An unexpected error occurred", errorKey: "connectionError" }
    }
}

export interface MenuItem {
    role_menu_id: string
    role_id: string
    menu_id: string
    menu_name: string
    readable: string
    writable: string
    control: string
}

export async function getAuthorizedMenu(): Promise<MenuItem[]> {
    const cookieStore = await cookies()
    const token = cookieStore.get("menuRole")?.value
    const apiUrl = process.env.API_URL

    if (!token || !apiUrl) {
        return []
    }

    try {
        const response = await fetch(`${apiUrl}/StreetLight/getMenuAuth`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
        })

        if (!response.ok) {
            console.error("Failed to fetch menu auth", response.status)
            return []
        }

        const data = await response.json()

        if (data.result && data.dataReturn) {
            try {
                // The API returns dataReturn as a JSON string, so we need to parse it again
                return JSON.parse(data.dataReturn) as MenuItem[]
            } catch (e) {
                console.error("Failed to parse menu items", e)
                return []
            }
        }

        return []
    } catch (error) {
        console.error("Error fetching menu:", error)
        return []
    }
}

export interface User {
    userId: string
    firstName: string
    lastName: string
    userRoleId: string
    userRole: string
    userName: string
}

export async function getCurrentUser(): Promise<User | null> {
    const cookieStore = await cookies()
    const token = cookieStore.get("jwt")?.value
    const apiUrl = process.env.API_URL

    if (!token || !apiUrl) {
        return null
    }

    try {
        const response = await fetch(`${apiUrl}/StreetLight/getDataUserPersonal`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({}),
        })

        if (!response.ok) {
            return null
        }

        const data = await response.json()
        if (data.result && data.dataReturn) {
            return data.dataReturn as User
        }

        return null
    } catch (error) {
        console.error("Error fetching user:", error)
        return null
    }
}


export async function logout() {
    const cookieStore = await cookies()
    cookieStore.delete("jwt")
    cookieStore.delete("menuRole")
    return { success: true }
}
