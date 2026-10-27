import { cookies } from "next/headers"

const LIGHTING_INDOOR_BASE_URL = process.env.LIGHTING_INDOOR_API_URL || "http://localhost:4002"

export interface LightingIndoorRequestOptions extends RequestInit {
    skipAuth?: boolean
    skipProject?: boolean
}

export async function fetchLightingIndoor<T>(
    endpoint: string,
    options: LightingIndoorRequestOptions = {}
): Promise<T | null> {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get("jwt")?.value

        const headers: Record<string, string> = {
            "Content-Type": "application/json",
            ...(options.headers as Record<string, string> || {}),
        }

        if (!options.skipAuth && token) {
            headers["Authorization"] = `Bearer ${token}`
        }

        const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`
        const url = `${LIGHTING_INDOOR_BASE_URL}${normalizedEndpoint}`

        const response = await fetch(url, {
            cache: "no-store",
            ...options,
            headers,
        })

        if (!response.ok) {
            const errorText = await response.text().catch(() => "")
            console.error(`Lighting Indoor API error [${response.status}]: ${response.statusText} (${url}) -> ${errorText}`)
            return null
        }

        return (await response.json()) as T
    } catch (error) {
        console.error(`Lighting Indoor API fetch exception (${endpoint}):`, error)
        return null
    }
}
