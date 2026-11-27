"use server"

import { revalidatePath } from "next/cache"
import { fetchNestJs } from "@/lib/nestjs"
import { getActiveProjectCode } from "@/lib/project"
import { getAuthToken } from "@/lib/auth-cookies"
import { DEFAULT_SYSTEM_MENUS } from "@/config/menus"
import type { ApiMenuSetting, SaveApiSettingResponse } from "@/types/api-settings"

export async function getApiMenuSettingsAction(projectId?: string): Promise<ApiMenuSetting[]> {
  const token = await getAuthToken()
  const activeProject =
    projectId && projectId.trim() ? projectId.trim() : await getActiveProjectCode()

  if (token) {
    try {
      const res = await fetchNestJs<ApiMenuSetting[] | { dataReturn: ApiMenuSetting[] }>(
        `/api/settings/api-version?project_id=${encodeURIComponent(activeProject)}`,
        {
          headers: {
            "X-Project-Name": activeProject,
          },
        }
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
      console.warn("[API Settings] Backend API lookup failed, using default settings:", error)
    }
  }

  return DEFAULT_SYSTEM_MENUS.map((item) => ({
    menu_id: item.menu_id,
    menu_name: item.menu_name,
    api_version: item.api_version ?? 1,
  }))
}

export async function saveApiMenuSettingAction(
  menuId: string,
  apiVersion: number,
  projectId?: string
): Promise<SaveApiSettingResponse> {
  const token = await getAuthToken()
  const activeProject =
    projectId && projectId.trim() ? projectId.trim() : await getActiveProjectCode()

  if (!token) {
    return { result: false, message: "Unauthorized" }
  }

  try {
    const res = await fetchNestJs<{ result?: boolean; success?: boolean }>(
      "/api/settings/api-version",
      {
        method: "POST",
        headers: {
          "X-Project-Name": activeProject,
        },
        body: JSON.stringify({
          menu_id: menuId,
          api_version: apiVersion,
          project_id: activeProject,
        }),
      }
    )
    if (res) {
      const isSuccess = Boolean(res.result || res.success)
      try {
        revalidatePath("/setting-system/menu-superadmin")
      } catch {}
      return { result: isSuccess }
    }
  } catch (error) {
    console.error("[API Settings] Backend API save failed:", error)
    return { result: false, message: "Backend error" }
  }

  return { result: false, message: "Backend save failed" }
}

export async function saveAllApiMenuSettingsAction(
  items: { menu_id: string; api_version: number }[],
  projectId?: string
): Promise<SaveApiSettingResponse> {
  const token = await getAuthToken()
  const activeProject =
    projectId && projectId.trim() ? projectId.trim() : await getActiveProjectCode()

  if (!token) {
    return { result: false, message: "Unauthorized" }
  }

  try {
    const res = await fetchNestJs<{ result?: boolean; success?: boolean }>(
      "/api/settings/api-version",
      {
        method: "POST",
        headers: {
          "X-Project-Name": activeProject,
        },
        body: JSON.stringify({
          settings: items,
          project_id: activeProject,
        }),
      }
    )
    if (res && Boolean(res.result || res.success)) {
      try {
        revalidatePath("/setting-system/menu-superadmin")
      } catch {}
      return { result: true }
    }

    // Fallback to individual calls
    const results = await Promise.all(
      items.map((i) =>
        fetchNestJs<{ result?: boolean; success?: boolean }>("/api/settings/api-version", {
          method: "POST",
          headers: {
            "X-Project-Name": activeProject,
          },
          body: JSON.stringify({
            menu_id: i.menu_id,
            api_version: i.api_version,
            project_id: activeProject,
          }),
        })
      )
    )
    const allOk = results.some((r) => r && Boolean(r.result || r.success))
    try {
      revalidatePath("/", "layout")
    } catch {}
    return { result: allOk }
  } catch (error) {
    console.error("[API Settings] Backend API batch save failed:", error)
    return { result: false, message: "Backend batch save failed" }
  }
}

export async function getStreetLightApiVersion(): Promise<number> {
  try {
    const settings = await getApiMenuSettingsAction()
    const match = settings.find(
      (s) =>
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
    const match = settings.find(
      (s) =>
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
    const match = settings.find(
      (s) =>
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
    const match = settings.find(
      (s) =>
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
