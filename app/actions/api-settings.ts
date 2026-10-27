"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { fetchNestJs } from "@/lib/nestjs"
import { getActiveProjectCode } from "@/lib/project"
import type { ApiMenuSetting, SaveApiSettingResponse } from "@/types/api-settings"

const inMemoryApiSettings = new Map<string, number>()

const DEFAULT_API_MENUS: ApiMenuSetting[] = [
    { menu_id: "1", menu_name: "dashboard_group", api_version: 1 },
    { menu_id: "2", menu_name: "dashboard_overview", api_version: 1 },
    { menu_id: "3", menu_name: "control_streetlight", api_version: 1 },
    { menu_id: "4", menu_name: "control_group", api_version: 1 },
    { menu_id: "5", menu_name: "control_schedule", api_version: 1 },
    { menu_id: "6", menu_name: "map_disconnect", api_version: 1 },
    { menu_id: "7", menu_name: "map_global", api_version: 1 },
    { menu_id: "8", menu_name: "map_changelamp", api_version: 1 },
    { menu_id: "9", menu_name: "maintenance_dashboard", api_version: 1 },
    { menu_id: "10", menu_name: "maintenance_request", api_version: 1 },
    { menu_id: "11", menu_name: "maintenance_list", api_version: 1 },
    { menu_id: "12", menu_name: "system_menu_permission", api_version: 1 },
    { menu_id: "13", menu_name: "system_api_setting", api_version: 1 },
    { menu_id: "14", menu_name: "system_project", api_version: 1 },
    { menu_id: "15", menu_name: "system_alert", api_version: 1 },
    { menu_id: "16", menu_name: "system_personal", api_version: 1 },
    { menu_id: "17", menu_name: "system_device", api_version: 1 },
]

export async function getApiMenuSettingsAction(): Promise<ApiMenuSetting[]> {
    const cookieStore = await cookies()
    const token = cookieStore.get("jwt")?.value
    const activeProject = await getActiveProjectCode()

    if (token) {
        try {
            const res = await fetchNestJs<ApiMenuSetting[] | { dataReturn: ApiMenuSetting[] }>(
                `/api/settings/api-version?project_id=${encodeURIComponent(activeProject)}`
            )
            if (res) {
                if (Array.isArray(res) && res.length > 0) {
                    return res
                }
                if ("dataReturn" in res && Array.isArray(res.dataReturn) && res.dataReturn.length > 0) {
                    return res.dataReturn
                }
            }
        } catch (error) {
            console.warn("[API Settings] Backend API lookup failed, using local settings:", error)
        }
    }

    return DEFAULT_API_MENUS.map((item) => {
        const customVersion = inMemoryApiSettings.get(`${activeProject}:${item.menu_id}`) ?? inMemoryApiSettings.get(item.menu_id)
        return {
            ...item,
            api_version: typeof customVersion === "number" ? customVersion : item.api_version,
        }
    })
}

export async function saveApiMenuSettingAction(
    menuId: string,
    apiVersion: number
): Promise<SaveApiSettingResponse> {
    const cookieStore = await cookies()
    const token = cookieStore.get("jwt")?.value
    const activeProject = await getActiveProjectCode()

    inMemoryApiSettings.set(`${activeProject}:${menuId}`, apiVersion)

    if (token) {
        try {
            const res = await fetchNestJs<{ result?: boolean; success?: boolean }>(
                "/api/settings/api-version",
                {
                    method: "POST",
                    body: JSON.stringify({
                        menu_id: menuId,
                        api_version: apiVersion,
                        project_id: activeProject,
                    }),
                }
            )
            if (res) {
                const isSuccess = Boolean(res.result || res.success)
                try { revalidatePath("/", "layout") } catch {}
                return { result: isSuccess }
            }
        } catch (error) {
            console.warn("[API Settings] Backend API save failed, saved in session memory:", error)
        }
    }

    try { revalidatePath("/", "layout") } catch {}
    return { result: true }
}

export async function saveAllApiMenuSettingsAction(
    items: { menu_id: string; api_version: number }[]
): Promise<SaveApiSettingResponse> {
    const cookieStore = await cookies()
    const token = cookieStore.get("jwt")?.value
    const activeProject = await getActiveProjectCode()

    for (const item of items) {
        inMemoryApiSettings.set(`${activeProject}:${item.menu_id}`, item.api_version)
    }

    if (token) {
        try {
            const res = await fetchNestJs<{ result?: boolean; success?: boolean }>(
                "/api/settings/api-version",
                {
                    method: "POST",
                    body: JSON.stringify({
                        settings: items,
                        project_id: activeProject,
                    }),
                }
            )
            if (res) {
                try { revalidatePath("/", "layout") } catch {}
                return { result: Boolean(res.result || res.success) }
            }
        } catch (error) {
            console.warn("[API Settings] Backend API batch save failed, fall back to individual or session:", error)
            try {
                await Promise.all(
                    items.map((i) =>
                        fetchNestJs("/api/settings/api-version", {
                            method: "POST",
                            body: JSON.stringify({
                                menu_id: i.menu_id,
                                api_version: i.api_version,
                                project_id: activeProject,
                            }),
                        })
                    )
                )
            } catch (inner) {
                console.warn("[API Settings] Backend individual fallback failed:", inner)
            }
        }
    }

    try { revalidatePath("/", "layout") } catch {}
    return { result: true }
}

export async function getStreetLightApiVersion(): Promise<number> {
    try {
        const settings = await getApiMenuSettingsAction()
        const match = settings.find((s) =>
            s.menu_name === "control_streetlight" ||
            s.menu_name === "street-light" ||
            s.menu_name === "street_light" ||
            s.menu_id === "3"
        )
        if (match && typeof match.api_version === "number") {
            return match.api_version
        }
    } catch {
        // Fallback to default version 1
    }
    return 1
}

export async function getGroupConfigApiVersion(): Promise<number> {
    try {
        const settings = await getApiMenuSettingsAction()
        const match = settings.find((s) =>
            s.menu_name === "control_group" ||
            s.menu_name === "group-config" ||
            s.menu_name === "group_config" ||
            s.menu_name === "group" ||
            s.menu_name === "V_GroupConfig" ||
            s.menu_id === "4"
        )
        if (match && typeof match.api_version === "number") {
            return match.api_version
        }
    } catch {
        // Fallback to default version 1
    }
    return 1
}

export async function getDashboardApiVersion(): Promise<number> {
    try {
        const settings = await getApiMenuSettingsAction()
        const match = settings.find((s) =>
            s.menu_name === "dashboard_group" ||
            s.menu_name === "dashboard_overview" ||
            s.menu_name === "dashboard" ||
            s.menu_id === "1" ||
            s.menu_id === "2"
        )
        if (match && typeof match.api_version === "number") {
            return match.api_version
        }
    } catch {
        // Fallback to default version 1
    }
    return 1
}

export async function getMapApiVersion(): Promise<number> {
    try {
        const settings = await getApiMenuSettingsAction()
        const match = settings.find((s) =>
            s.menu_name === "map_global" ||
            s.menu_name === "map_disconnect" ||
            s.menu_name === "map" ||
            s.menu_id === "7" ||
            s.menu_id === "6"
        )
        if (match && typeof match.api_version === "number") {
            return match.api_version
        }
    } catch {
        // Fallback to default version 1
    }
    return 1
}
