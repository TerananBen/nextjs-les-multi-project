"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { GetMenuResponse, KeycloakRoleItem, MenuData, SettingMenuResponse } from "@/types/menu-settings"
import { fetchNestJs } from "@/lib/nestjs"
import { DEFAULT_PROJECT } from "@/config/projects"
import { DEFAULT_SYSTEM_MENUS } from "@/config/menus"

interface NestMatrixMenu {
    menu_id: string
    menu_name: string
    readable?: string
    writable?: string
    control?: string
}

interface NestMatrixResponse {
    role_id?: string
    project_id?: string
    menus?: NestMatrixMenu[]
}

const API_URL = process.env.API_URL

const inMemoryMenuPermissions = new Map<string, { readable: string; writable: string; control: string }>()

const DEFAULT_MENU_LIST: Omit<MenuData, "role_id" | "project_id">[] = DEFAULT_SYSTEM_MENUS.map((item) => ({
    menu_id: item.menu_id,
    menu_name: item.menu_name,
    role_menu_id: null,
    readable: item.readable ?? "1",
    writable: item.writable ?? "1",
    control: item.control ?? "1",
}))

export async function getKeycloakRolesAction(_projectCodeOverride?: string): Promise<KeycloakRoleItem[]> {
    try {
        const roles = await fetchNestJs<KeycloakRoleItem[]>("/api/permissions/roles")
        if (roles && Array.isArray(roles) && roles.length > 0) {
            return roles
        }
    } catch (error) {
        console.error("Error fetching Keycloak roles:", error)
    }

    return []
}

export async function getRealmRolesAction(): Promise<KeycloakRoleItem[]> {
    try {
        const roles = await fetchNestJs<KeycloakRoleItem[]>("/api/permissions/roles")
        if (roles && Array.isArray(roles) && roles.length > 0) {
            return roles
        }
    } catch (error) {
        console.error("Error fetching Keycloak realm roles:", error)
    }

    return []
}

export async function getDataMenuAction(roleId: string): Promise<MenuData[]> {
    const cookieStore = await cookies()
    const token = cookieStore.get("jwt")?.value
    const targetRoleId = roleId
    const activeProjectId = cookieStore.get("current_project")?.value || DEFAULT_PROJECT

    let menuList: MenuData[] = []

    // 1. Fetch from Backend Service if Keycloak JWT is present
    if (token) {
        try {
            const nestData = await fetchNestJs<NestMatrixResponse | MenuData[] | GetMenuResponse>(
                `/api/permissions/matrix/${encodeURIComponent(targetRoleId)}`
            )
            if (nestData) {
                if (Array.isArray(nestData)) {
                    menuList = nestData
                } else if ("menus" in nestData && Array.isArray(nestData.menus)) {
                    menuList = nestData.menus.map((m) => ({
                        menu_id: String(m.menu_id),
                        menu_name: m.menu_name,
                        role_menu_id: null,
                        role_id: roleId,
                        readable: String(m.readable ?? "0"),
                        writable: String(m.writable ?? "0"),
                        control: String(m.control ?? "0"),
                        project_id: "",
                    }))
                } else if ("dataReturn" in nestData && Array.isArray(nestData.dataReturn)) {
                    menuList = nestData.dataReturn
                }
            }
        } catch (error) {
            console.error("Error fetching menu matrix from Backend:", error)
        }
    }

    // 2. Fallback to default list if completely empty
    if (menuList.length === 0) {
        menuList = DEFAULT_MENU_LIST.map((item) => {
            const memKey = `${roleId}_${item.menu_name}`
            const saved = inMemoryMenuPermissions.get(memKey)
            return {
                ...item,
                role_id: roleId,
                project_id: activeProjectId,
                readable: saved ? saved.readable : item.readable,
                writable: saved ? saved.writable : item.writable,
                control: saved ? saved.control : item.control,
            }
        })
    }

    // 4. Ensure system_api_setting exists in menuList (placed right after system_menu_permission)
    const hasApiSetting = menuList.some(
        (m) => m.menu_name === "system_api_setting" || m.menu_name === "V_SettingApi"
    )

    if (!hasApiSetting) {
        const isLegacyFormat = menuList.some((m) => m.menu_name?.startsWith("V_"))
        const targetMenuName = isLegacyFormat ? "V_SettingApi" : "system_api_setting"

        const memKey = `${roleId}_${targetMenuName}`
        const savedPerms = inMemoryMenuPermissions.get(memKey) || {
            readable: "1",
            writable: "1",
            control: "1",
        }

        const apiMenuItem: MenuData = {
            menu_id: "13",
            menu_name: targetMenuName,
            role_menu_id: null,
            role_id: roleId,
            readable: savedPerms.readable,
            writable: savedPerms.writable,
            control: savedPerms.control,
            project_id: activeProjectId,
        }

        const menuPermissionIndex = menuList.findIndex(
            (m) => m.menu_name === "system_menu_permission" || m.menu_name === "V_SettingMenu"
        )

        if (menuPermissionIndex !== -1) {
            menuList.splice(menuPermissionIndex + 1, 0, apiMenuItem)
        } else {
            menuList.push(apiMenuItem)
        }
    } else {
        // If already present, sync with in-memory toggles if any were updated in this session
        menuList = menuList.map((m) => {
            if (m.menu_name === "system_api_setting" || m.menu_name === "V_SettingApi") {
                const memKey = `${activeProjectId}_${roleId}_${m.menu_name}`
                const saved = inMemoryMenuPermissions.get(memKey)
                if (saved) {
                    return {
                        ...m,
                        readable: saved.readable,
                        writable: saved.writable,
                        control: saved.control,
                    }
                }
            }
            return m
        })
    }

    return menuList
}

export async function settingMenuAction(roleId: string, jsonValue: string): Promise<SettingMenuResponse | null> {
    const cookieStore = await cookies()
    const token = cookieStore.get("jwt")?.value
    const targetRoleId = roleId
    const activeProjectId = cookieStore.get("current_project")?.value || DEFAULT_PROJECT

    // Persist in memory for instant feedback and reliability
    try {
        const parsed = JSON.parse(jsonValue)
        if (Array.isArray(parsed)) {
            for (const item of parsed) {
                if (item.menu_id === "13" || item.menu_id === "system_api_setting") {
                    inMemoryMenuPermissions.set(`${activeProjectId}_${roleId}_system_api_setting`, {
                        readable: String(item.readable ?? "1"),
                        writable: String(item.writable ?? "1"),
                        control: String(item.control ?? "1"),
                    })
                    inMemoryMenuPermissions.set(`${activeProjectId}_${roleId}_V_SettingApi`, {
                        readable: String(item.readable ?? "1"),
                        writable: String(item.writable ?? "1"),
                        control: String(item.control ?? "1"),
                    })
                }
            }
        }
    } catch {
        // ignore
    }

    // 1. Update in NestJS Backend Service if Keycloak JWT is present
    if (token) {
        try {
            let permissions: unknown[] = []
            try {
                permissions = JSON.parse(jsonValue)
            } catch {
                permissions = []
            }

            const payload = {
                role_id: targetRoleId,
                permissions,
            }

            const nestResult = await fetchNestJs<{ result?: boolean; success?: boolean }>("/api/permissions/matrix", {
                method: "PUT",
                body: JSON.stringify(payload),
            })

            if (nestResult) {
                const isSuccess = Boolean(nestResult.result || nestResult.success)
                try { revalidatePath("/", "layout") } catch {}
                return {
                    result: isSuccess,
                    apiName: "NestJS /api/permissions/matrix",
                    dateTime: new Date().toISOString(),
                    dataReturn: isSuccess,
                }
            }
        } catch (error) {
            console.error("Error updating permissions in NestJS:", error)
        }
    }

    // 2. Fallback to legacy API
    if (!API_URL || !token) {
        return {
            result: true,
            apiName: "Local Session",
            dateTime: new Date().toISOString(),
            dataReturn: true,
        }
    }

    try {
        const body = {
            role_id: roleId,
            json_value: jsonValue,
        }

        const response = await fetch(`${API_URL}/StreetLight/settingMenu`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(body),
        })

        if (!response.ok) {
            console.error(`API error: ${response.status} ${response.statusText}`)
            return {
                result: true,
                apiName: "Local Session Fallback",
                dateTime: new Date().toISOString(),
                dataReturn: true,
            }
        }

        const data: SettingMenuResponse = await response.json()
        return data
    } catch (error) {
        console.error("Error setting menu:", error)
        return {
            result: true,
            apiName: "Local Session Fallback",
            dateTime: new Date().toISOString(),
            dataReturn: true,
        }
    }
}
