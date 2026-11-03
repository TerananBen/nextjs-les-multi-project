import { cookies } from "next/headers"
import { getActiveProjectCode } from "@/lib/project"

const BACKEND_BASE_URL = process.env.API_URL || "http://localhost:5000"

export interface NestJsRequestOptions extends RequestInit {
    skipAuth?: boolean
    skipProject?: boolean
}

export async function fetchNestJs<T>(
    endpoint: string,
    options: NestJsRequestOptions = {}
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

        if (!options.skipProject) {
            const projectCode = (options.headers as Record<string, string>)?.[
                "X-Project-Name"
            ] || (await getActiveProjectCode())
            if (projectCode) {
                headers["X-Project-Name"] = projectCode
            }
        }

        let cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`
        if (!cleanEndpoint.startsWith("/api/iam")) {
            if (cleanEndpoint.startsWith("/api/")) {
                cleanEndpoint = `/api/iam${cleanEndpoint.substring(4)}`
            } else {
                cleanEndpoint = `/api/iam${cleanEndpoint}`
            }
        }
        const url = `${BACKEND_BASE_URL}${cleanEndpoint}`

        const response = await fetch(url, {
            cache: "no-store",
            ...options,
            headers,
        })

        if (!response.ok) {
            const errorText = await response.text().catch(() => "")
            console.error(`NestJS API error [${response.status}]: ${response.statusText} (${url}) -> ${errorText}`)
            return null
        }

        return (await response.json()) as T
    } catch (error) {
        console.error(`NestJS API fetch exception (${endpoint}):`, error)
        return null
    }
}

export async function fetchMenuNestJs<T>(
    menuName: string,
    endpoint: string,
    options: NestJsRequestOptions & { apiVersion?: number } = {}
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

    return fetchNestJs<T>(versionedEndpoint, options)
}

