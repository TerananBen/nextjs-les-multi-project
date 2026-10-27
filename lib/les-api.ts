import { cookies } from "next/headers"

const API_URL = process.env.API_URL || "http://localhost:5000"

export interface LesApiRequestOptions extends RequestInit {
    skipAuth?: boolean
    skipProject?: boolean
}

export async function fetchLesApi<T>(
    endpoint: string,
    options: LesApiRequestOptions = {}
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

        const currentProject = cookieStore.get("current_project")?.value
        if (currentProject) {
            headers["X-Project-Name"] = currentProject
            headers["x-project-id"] = currentProject
            headers["x-project-code"] = currentProject
        }

        const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`
        const url = `${API_URL}${normalizedEndpoint}`

        const response = await fetch(url, {
            cache: "no-store",
            ...options,
            headers,
        })

        if (!response.ok) {
            const errorText = await response.text().catch(() => "")
            console.error(`LES API error [${response.status}]: ${response.statusText} (${url}) -> ${errorText}`)
            return null
        }

        return (await response.json()) as T
    } catch (error) {
        console.error(`LES API fetch exception (${endpoint}):`, error)
        return null
    }
}

export async function fetchMenuApi<T>(
    menuName: string,
    endpoint: string,
    options: LesApiRequestOptions & { apiVersion?: number } = {}
): Promise<T | null> {
    let version = options.apiVersion
    if (!version) {
        try {
            const { getAuthorizedMenu } = await import("@/app/actions/auth")
            const menus = await getAuthorizedMenu()
            const found = menus.find(m => m.menu_name === menuName)
            version = found?.api_version || 1
        } catch {
            version = 1
        }
    }

    const clean = endpoint.startsWith("/") ? endpoint : `/${endpoint}`
    let versionedEndpoint: string

    if (clean.startsWith(`/api/v`) || clean.includes(`/v${version}/`)) {
        versionedEndpoint = clean
    } else if (clean.startsWith("/api/")) {
        versionedEndpoint = `/api/v${version}${clean.substring(4)}`
    } else {
        versionedEndpoint = `/api/v${version}${clean}`
    }

    return fetchLesApi<T>(versionedEndpoint, options)
}
