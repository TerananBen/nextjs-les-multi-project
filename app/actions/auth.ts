"use server"

import { cookies, headers } from "next/headers"
import { getProjectConfig, fetchDbProjects } from "@/lib/project"
import { getProjectById, resolveProjectUuid, resolveProjectSlug, isIpAddress, DEFAULT_PROJECT } from "@/config/projects"
import {
    isKeycloakConfigured,
    loginKeycloakDirectGrant,
    decodeJwtPayload,
    logoutKeycloak,
    refreshKeycloakToken,
    updateUserActiveProject,
    extractAllProjectIdsFromPayload,
    extractProjectCodeFromPayload,
    extractRolesFromPayload,
    getKeycloakConfig,
    getKeycloakLogoutUrl,
} from "@/lib/keycloak"
import { fetchNestJs } from "@/lib/nestjs"

interface LoginState {
    success: boolean
    message?: string
    failedAttempts?: string | null
    errorKey?: string
    isLocked?: boolean
}

export async function login(prevState: LoginState, formData: FormData): Promise<LoginState> {
    const username = formData.get("username") as string
    const password = formData.get("password") as string
    const usingHttps = process.env.USING_HTTPS

    if (!username || !password) {
        return { success: false, message: "Username and password are required" }
    }

    // ── Keycloak Direct Access Grants Flow ────────────────
    if (isKeycloakConfigured()) {
        const keycloakResult = await loginKeycloakDirectGrant(username, password)

        if (!keycloakResult.success) {
            return {
                success: false,
                message: keycloakResult.message || "Authentication failed",
                errorKey: keycloakResult.errorKey || "usernameError",
                isLocked: keycloakResult.errorKey === "accountLocked",
            }
        }

        // Check project authorization for host subdomain where login occurred
        const headerList = await headers();
        const host = (headerList.get("x-forwarded-host") || headerList.get("host") || "").split(",")[0].trim();
        let hostProjectId: string | undefined;
        let hostSubdomain: string | undefined;
        const hostWithoutPort = host.split(":")[0].toLowerCase();
        if (hostWithoutPort && !isIpAddress(hostWithoutPort)) {
            const sub = hostWithoutPort.split(".")[0];
            if (sub && sub !== "localhost" && sub !== "www") {
                hostSubdomain = sub.toLowerCase();
                hostProjectId = resolveProjectUuid(hostSubdomain);
            }
        }

        const allowedProjects = extractAllProjectIdsFromPayload(keycloakResult.payload);
        const allowedUuids = allowedProjects.map((p) => resolveProjectUuid(p));
        const roles = extractRolesFromPayload(keycloakResult.payload);
        const isSuperAdmin = roles.some((r) => {
            const lower = r.toLowerCase();
            return lower.includes("superadmin") || lower.includes("super_admin") || lower.includes("super-admin");
        });

        // Reject login immediately if user attempts to log into an unauthorized subdomain project
        if (
            hostProjectId &&
            !isSuperAdmin &&
            allowedUuids.length > 0 &&
            !allowedUuids.includes(hostProjectId) &&
            (!hostSubdomain || !allowedProjects.includes(hostSubdomain))
        ) {
            return {
                success: false,
                message: "You do not have permission to access this project",
                errorKey: "unauthorizedProject",
            };
        }
        
        const tokenProjectCode = extractProjectCodeFromPayload(keycloakResult.payload);
        const cleanTokenProjectCode = tokenProjectCode && !tokenProjectCode.toLowerCase().includes("[object") ? tokenProjectCode : undefined;
        let activeProjectId: string | undefined =
            cleanTokenProjectCode ||
            (hostProjectId && (isSuperAdmin || allowedUuids.length === 0 || allowedUuids.includes(hostProjectId)) ? hostProjectId : undefined) ||
            hostSubdomain ||
            (allowedProjects.length > 0 && !allowedProjects[0].toLowerCase().includes("[object") ? allowedProjects[0] : undefined);

        if (!activeProjectId || activeProjectId.toLowerCase().includes("[object")) {
            const dbProjects = await fetchDbProjects();
            activeProjectId = dbProjects.length > 0 ? (dbProjects[0].code || dbProjects[0].id) : DEFAULT_PROJECT;
        }

        const projectSlug = resolveProjectSlug(activeProjectId) || "project-a";

        // Update active project attribute in Keycloak and refresh tokens
        if (keycloakResult.payload?.sub && projectSlug) {
            await updateUserActiveProject(keycloakResult.payload.sub, projectSlug);
            if (keycloakResult.tokenData?.refresh_token) {
                const refreshed = await refreshKeycloakToken(keycloakResult.tokenData.refresh_token);
                if (refreshed?.access_token) {
                    keycloakResult.tokenData.access_token = refreshed.access_token;
                    if (refreshed.refresh_token) {
                        keycloakResult.tokenData.refresh_token = refreshed.refresh_token;
                    }
                }
            }
        }

        const cookieStore = await cookies();
        const sessionMaxAge =
            keycloakResult.tokenData?.refresh_expires_in && keycloakResult.tokenData.refresh_expires_in > 0
                ? keycloakResult.tokenData.refresh_expires_in
                : 30 * 24 * 60 * 60; // 30 days default

        if (keycloakResult.tokenData?.access_token) {
            cookieStore.set("jwt", keycloakResult.tokenData.access_token, {
                httpOnly: true,
                secure: usingHttps === "true",
                sameSite: "lax",
                path: "/",
                maxAge: sessionMaxAge,
            });
        }

        if (keycloakResult.tokenData?.refresh_token) {
            cookieStore.set("refresh_token", keycloakResult.tokenData.refresh_token, {
                httpOnly: true,
                secure: usingHttps === "true",
                sameSite: "lax",
                path: "/",
                maxAge: sessionMaxAge,
            });
        }

        if (keycloakResult.tokenData?.id_token) {
            cookieStore.set("id_token", keycloakResult.tokenData.id_token, {
                httpOnly: true,
                secure: usingHttps === "true",
                sameSite: "lax",
                path: "/",
                maxAge: sessionMaxAge,
            });
        }

        if (activeProjectId) {
            cookieStore.set("current_project", activeProjectId, {
                httpOnly: false,
                secure: usingHttps === "true",
                sameSite: "lax",
                path: "/",
                maxAge: sessionMaxAge,
            });
        }

        // Record user last login timestamp in NestJS (Keycloak user_attribute)
        if (keycloakResult.payload?.sub) {
            fetchNestJs(`/api/users/${encodeURIComponent(keycloakResult.payload.sub)}/login`, {
                method: "POST",
                skipProject: true,
                skipAuth: true,
            }).catch((err) => console.error("Failed to record login:", err))
        }

        return { success: true }
    }

    // ── Legacy API Login Fallback ─────────────────────────
    const projectConfig = await getProjectConfig()
    const projectName = projectConfig.id || process.env.PROJECT_NAME
    const apiUrl = process.env.API_URL

    if (!apiUrl) {
        console.error("API_URL is not defined")
        return { success: false, message: "Server configuration error: API_URL is missing. Please restart the server.", errorKey: "connectionError" }
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
                secure: usingHttps === "true",
                sameSite: "lax",
                path: "/",
            })
            cookieStore.set("menuRole", data.dataMenuRole, {
                httpOnly: true,
                secure: usingHttps === "true",
                sameSite: "lax",
                path: "/",
            })
            return { success: true }
        } else {
            // Failure (including 401)
            const isLocked = data.dataContLogin === "10"
            return {
                success: false,
                message: data.dataReturn,
                failedAttempts: data.dataContLogin,
                errorKey: isLocked ? "accountLocked" : (data.dataReturn === "denied" ? "usernameError" : undefined),
                isLocked
            }
        }
    } catch (error) {
        console.error("Login error:", error)
        return { success: false, message: "An unexpected error occurred", errorKey: "connectionError" }
    }
}

export interface MenuItem {
    role_menu_id?: string
    role_id?: string
    menu_id: string
    menu_name: string
    readable: string
    writable?: string
    control: string
    label?: string
    path?: string
    api_version?: number
}

const SUPERADMIN_FULL_MENUS: MenuItem[] = [
    { menu_id: "1", menu_name: "dashboard_group", label: "Dashboard", path: "/dashboard", readable: "1", writable: "1", control: "1", api_version: 1 },
    { menu_id: "2", menu_name: "smart_pole", label: "Smart Pole", path: "/smart-pole", readable: "1", writable: "1", control: "1", api_version: 1 },
    { menu_id: "3", menu_name: "street_light", label: "Street Light", path: "/street-light", readable: "1", writable: "1", control: "1", api_version: 1 },
    { menu_id: "4", menu_name: "building_light", label: "Building Light", path: "/building-light", readable: "1", writable: "1", control: "1", api_version: 1 },
    { menu_id: "5", menu_name: "solar_cell", label: "Solar Cell", path: "/solar-cell", readable: "1", writable: "1", control: "1", api_version: 1 },
    { menu_id: "6", menu_name: "cctv", label: "CCTV", path: "/cctv", readable: "1", writable: "1", control: "1", api_version: 1 },
    { menu_id: "7", menu_name: "emergency_call", label: "Emergency Call", path: "/emergency-call", readable: "1", writable: "1", control: "1", api_version: 1 },
    { menu_id: "8", menu_name: "schedule", label: "Schedule", path: "/schedule", readable: "1", writable: "1", control: "1", api_version: 1 },
    { menu_id: "9", menu_name: "history", label: "History", path: "/history", readable: "1", writable: "1", control: "1", api_version: 1 },
    { menu_id: "10", menu_name: "report", label: "Report", path: "/report", readable: "1", writable: "1", control: "1", api_version: 1 },
    { menu_id: "11", menu_name: "alarm", label: "Alarm", path: "/alarm", readable: "1", writable: "1", control: "1", api_version: 1 },
    { menu_id: "12", menu_name: "map", label: "Map", path: "/map", readable: "1", writable: "1", control: "1", api_version: 1 },
    { menu_id: "13", menu_name: "setting_group", label: "Device Setting", path: "/setting-device", readable: "1", writable: "1", control: "1", api_version: 1 },
    { menu_id: "14", menu_name: "maintenance_group", label: "Maintenance", path: "/maintenance", readable: "1", writable: "1", control: "1", api_version: 1 },
    { menu_id: "15", menu_name: "user_management", label: "User Management", path: "/user-management", readable: "1", writable: "1", control: "1", api_version: 1 },
    { menu_id: "16", menu_name: "setting_system", label: "Setting System", path: "/setting-system", readable: "1", writable: "1", control: "1", api_version: 1 },
    { menu_id: "17", menu_name: "system_api_setting", label: "API Settings", path: "/setting-system/api-settings", readable: "1", writable: "1", control: "1", api_version: 1 },
    { menu_id: "18", menu_name: "system_project", label: "Project Settings", path: "/setting-system/project", readable: "1", writable: "1", control: "1", api_version: 1 },
]

export async function getAuthorizedMenu(): Promise<MenuItem[]> {
    const cookieStore = await cookies()
    const jwtToken = cookieStore.get("jwt")?.value

    // 1. Fetch from NestJS Backend Service if Keycloak JWT is present
    if (jwtToken) {
        try {
            const nestMenus = await fetchNestJs<MenuItem[]>("/api/permissions/my-menus")
            if (nestMenus && Array.isArray(nestMenus) && nestMenus.length > 0) {
                const payload = decodeJwtPayload(jwtToken)
                const roles = extractRolesFromPayload(payload)
                const isSuperAdmin = roles.some((r) => {
                    const lower = r.toLowerCase()
                    return lower.includes("superadmin") || lower.includes("super_admin") || lower.includes("super-admin")
                })
                if (isSuperAdmin && !nestMenus.some((m) => m.menu_name === "system_api_setting" || m.menu_name === "V_SettingApi")) {
                    return [
                        ...nestMenus,
                        { menu_id: "17", menu_name: "system_api_setting", label: "API Settings", path: "/setting-system/api-settings", readable: "1", writable: "1", control: "1" }
                    ]
                }
                return nestMenus
            }
        } catch (e) {
            console.error("Failed to fetch permissions from NestJS:", e)
        }

        // Fallback safeguard: If role is SuperAdmin, return full system menus
        const payload = decodeJwtPayload(jwtToken)
        const roles = extractRolesFromPayload(payload)
        const isSuperAdmin = roles.some((r) => {
            const lower = r.toLowerCase()
            return lower.includes("superadmin") || lower.includes("super_admin") || lower.includes("super-admin")
        })

        if (isSuperAdmin) {
            return SUPERADMIN_FULL_MENUS
        }
        return []
    }

    return []
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

    if (!token) {
        return null
    }

    // 1. Check if token is a Keycloak JWT
    const payload = decodeJwtPayload(token)
    if (payload?.sub) {
        let currentClientId: string | undefined
        const currentProjId = cookieStore.get("current_project")?.value
        if (currentProjId) {
            const proj = getProjectById(currentProjId)
            if (proj?.domain) {
                currentClientId = proj.domain.split(".")[0].replace(/_/g, "-")
            }
        }
        const extractedRoles = extractRolesFromPayload(payload, currentClientId)
        const roles = extractedRoles.join(", ") || "User"

        return {
            userId: payload.sub,
            firstName: payload.given_name || payload.name || payload.preferred_username || "User",
            lastName: payload.family_name || "",
            userRoleId: String(payload.project_id || payload.tenant_id || currentProjId || "default"),
            userRole: roles,
            userName: payload.preferred_username || payload.email || "user",
        }
    }

    // 2. Fallback to legacy API
    const apiUrl = process.env.API_URL
    if (!apiUrl) {
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
    const headerList = await headers()
    const refreshToken = cookieStore.get("refresh_token")?.value
    const idToken = cookieStore.get("id_token")?.value
    const currentProject = cookieStore.get("current_project")?.value

    // Determine host and protocol
    const forwardedHost = headerList.get("x-forwarded-host")
    const hostHeader = headerList.get("host")
    const host = (forwardedHost || hostHeader || "").split(",")[0].trim()
    const isLocal = host.includes("localhost") || host.includes("127.0.0.1")
    const proto = headerList.get("x-forwarded-proto") || (isLocal ? "http" : (process.env.USING_HTTPS === "true" ? "https" : "http"))

    // Resolve client ID for Keycloak
    let resolvedClientId: string | undefined
    const hostWithoutPort = host.split(":")[0].toLowerCase()
    if (hostWithoutPort && !isIpAddress(hostWithoutPort)) {
        const sub = hostWithoutPort.split(".")[0]
        if (sub && sub !== "localhost" && sub !== "www") {
            resolvedClientId = sub.toLowerCase()
        }
    }
    if (!resolvedClientId && currentProject) {
        resolvedClientId = currentProject
    }
    if (!resolvedClientId) {
        resolvedClientId = process.env.KEYCLOAK_CLIENT_ID || "project-a"
    }

    const appUrl = host ? `${proto}://${host}` : (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3008")
    const loginUrl = `${appUrl}/api/auth/login?prompt=login`

    if (refreshToken) {
        try {
            await logoutKeycloak(refreshToken, resolvedClientId)
        } catch (e) {
            console.warn("[Logout] Backchannel logout failed:", e)
        }
    }

    let keycloakLogoutUrl: string | undefined = loginUrl
    if (idToken) {
        const url = getKeycloakLogoutUrl(loginUrl, idToken, resolvedClientId)
        if (url) {
            keycloakLogoutUrl = url
        }
    }

    // Force clear all auth cookies
    cookieStore.set("jwt", "", { path: "/", maxAge: 0 })
    cookieStore.set("refresh_token", "", { path: "/", maxAge: 0 })
    cookieStore.set("id_token", "", { path: "/", maxAge: 0 })
    cookieStore.set("menuRole", "", { path: "/", maxAge: 0 })
    cookieStore.set("current_project", "", { path: "/", maxAge: 0 })
    cookieStore.delete("jwt")
    cookieStore.delete("refresh_token")
    cookieStore.delete("id_token")
    cookieStore.delete("menuRole")
    cookieStore.delete("current_project")
    cookieStore.delete("current_tenant")

    return { success: true, keycloakLogoutUrl }
}

export async function refreshTokenAction(): Promise<{ success: boolean }> {
    const cookieStore = await cookies()
    const refreshToken = cookieStore.get("refresh_token")?.value
    const token = cookieStore.get("jwt")?.value

    if (!refreshToken) {
        return { success: false }
    }

    // Only refresh if token is missing or expiring within 2 minutes
    let activeClientId: string | undefined
    if (token) {
        const payload = decodeJwtPayload(token)
        if (payload?.azp) {
            activeClientId = String(payload.azp)
        }
        if (payload?.exp && payload.exp * 1000 > Date.now() + 120000) {
            return { success: true }
        }
    }

    if (!activeClientId) {
        const cookieProject = cookieStore.get("current_project")?.value
        if (cookieProject) {
            activeClientId = cookieProject
        }
    }

    const newTokens = await refreshKeycloakToken(refreshToken, activeClientId)
    if (!newTokens) {
        return { success: false }
    }

    const usingHttps = process.env.USING_HTTPS === "true"
    cookieStore.set("jwt", newTokens.access_token, {
        httpOnly: true,
        secure: usingHttps,
        sameSite: "lax",
        path: "/",
    })

    if (newTokens.refresh_token) {
        cookieStore.set("refresh_token", newTokens.refresh_token, {
            httpOnly: true,
            secure: usingHttps,
            sameSite: "lax",
            path: "/",
        })
    }

    return { success: true }
}
