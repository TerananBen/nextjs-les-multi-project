"use server"

import { ScheduleItem } from "@/types/schedule-settings"
import { fetchLesApi, fetchMenuApi } from "@/lib/les-api"

interface RawScheduleItem {
    list_group_name_code?: string | string[];
    list_scenes_light?: string | unknown[] | Record<string, unknown>;
    name_schedule?: string;
    scheduleName?: string;
    type_schedule?: string;
    typeSchedule?: string;
    code_name?: string;
    groupCode?: string;
    dataGroupName?: string[];
    listScenes?: unknown[];
    dataGroupCode?: string[];
    listDays?: string[];
    [key: string]: unknown;
}

export async function getDataScheduleAction(): Promise<ScheduleItem[]> {
    try {
        let data = await fetchMenuApi<{ result?: boolean; dataReturn?: RawScheduleItem[] } | RawScheduleItem[]>(
            "control_schedule",
            "/streetlights/settings/get-schedule-multisensor",
            {
                method: "POST",
                body: JSON.stringify({})
            }
        )

        if (!data) {
            data = await fetchLesApi<{ result?: boolean; dataReturn?: RawScheduleItem[] } | RawScheduleItem[]>(
                "/api/v1/streetlights/settings/get-schedule-multisensor",
                {
                    method: "POST",
                    body: JSON.stringify({})
                }
            )
        }

        if (!data) {
            data = await fetchLesApi<{ result?: boolean; dataReturn?: RawScheduleItem[] }>(
                "/StreetLight/getDataScheduleMultiSensor",
                {
                    method: "POST",
                    body: JSON.stringify({})
                }
            )
        }

        let rawItems: RawScheduleItem[] = []
        if (Array.isArray(data)) {
            rawItems = data
        } else if (data && typeof data === "object" && "dataReturn" in data && Array.isArray((data as { dataReturn: unknown }).dataReturn)) {
            rawItems = (data as { dataReturn: RawScheduleItem[] }).dataReturn
        }

        if (rawItems.length > 0) {
            // Map raw API data to ScheduleItem structure
            return rawItems.map((item: RawScheduleItem) => {
                // 1. Parse Group Names from "list_group_name_code" (JSON String of ["Name$Code"])
                let groupNames: string[] = []
                if (item.list_group_name_code) {
                    try {
                        const parsed = typeof item.list_group_name_code === 'string'
                            ? JSON.parse(item.list_group_name_code)
                            : item.list_group_name_code

                        if (Array.isArray(parsed)) {
                            // Expecting "Name$Code" strings
                            groupNames = parsed.map((s: string) => {
                                if (typeof s === 'string' && s.includes('$')) {
                                    return s.split('$')[0].trim()
                                }
                                return s // Fallback if just name or unexpected format
                            })
                        }
                    } catch (e) {
                        console.error("Error parsing list_group_name_code", e)
                    }
                }

                // 2. Parse Scenes from "list_scenes_light" (JSON String)
                let scenes: unknown[] = []
                if (item.list_scenes_light) {
                    try {
                        const parsed = typeof item.list_scenes_light === 'string'
                            ? JSON.parse(item.list_scenes_light)
                            : item.list_scenes_light

                        // Handle both Array (Time) and Object (Light - single object)
                        if (Array.isArray(parsed)) {
                            scenes = parsed
                        } else if (parsed && typeof parsed === 'object') {
                            scenes = [parsed]
                        }
                    } catch (e) {
                        console.error("Error parsing list_scenes_light", e)
                    }
                }

                return {
                    scheduleName: item.name_schedule || item.scheduleName || "",
                    typeSchedule: item.type_schedule || item.typeSchedule || "time",
                    groupCode: item.code_name || item.groupCode || "",
                    dataGroupName: groupNames.length > 0 ? groupNames : (item.dataGroupName || []),
                    listScenes: scenes.length > 0 ? scenes : (item.listScenes || []),
                    // Other fields as fallback
                    dataGroupCode: item.dataGroupCode || [],
                    listDays: item.listDays || []
                } as ScheduleItem
            })
        }
        return []
    } catch (error) {
        console.error("Error fetching schedule data:", error)
        return []
    }
}

export async function saveScheduleSettingsAction(payload: unknown): Promise<{ success: boolean; message?: string }> {
    try {
        let data = await fetchMenuApi<{ result?: boolean; success?: boolean; message?: string; dataReturn?: unknown }>(
            "control_schedule",
            "/streetlights/settings/setting-schedule-multisensor",
            {
                method: "POST",
                body: JSON.stringify(payload)
            }
        )

        if (!data) {
            data = await fetchLesApi<{ result?: boolean; success?: boolean; message?: string; dataReturn?: unknown }>(
                "/api/v1/streetlights/settings/setting-schedule-multisensor",
                {
                    method: "POST",
                    body: JSON.stringify(payload)
                }
            )
        }

        if (!data) {
            data = await fetchLesApi<{ result?: boolean; success?: boolean; message?: string; dataReturn?: unknown }>(
                "/StreetLight/settingScheduleMultiSensorLocal",
                {
                    method: "POST",
                    body: JSON.stringify(payload)
                }
            )
        }

        const isSuccess = Boolean(data?.result || data?.success || data?.dataReturn === true || data?.dataReturn === "true")
        if (isSuccess) {
            return { success: true }
        }
        return { success: false, message: data?.message || "API returned false result" }
    } catch (error) {
        console.error("Error saving schedule:", error)
        return { success: false, message: "Network error" }
    }
}

export async function deleteScheduleAction(groupCode: string): Promise<{ success: boolean; message?: string }> {
    try {
        const deletePayload = {
            groupCode,
            group_code: groupCode,
            code_name: groupCode,
            json_value: JSON.stringify({ groupCode })
        }

        let data = await fetchMenuApi<{ result?: boolean; success?: boolean; message?: string }>(
            "control_schedule",
            "/streetlights/settings/delete-schedule",
            {
                method: "POST",
                body: JSON.stringify(deletePayload)
            }
        )

        if (!data) {
            data = await fetchLesApi<{ result?: boolean; success?: boolean; message?: string }>(
                "/api/v1/streetlights/settings/delete-schedule",
                {
                    method: "POST",
                    body: JSON.stringify(deletePayload)
                }
            )
        }

        if (!data) {
            data = await fetchLesApi<{ result?: boolean; success?: boolean; message?: string }>(
                "/StreetLight/deleteSettingSchedule",
                {
                    method: "POST",
                    body: JSON.stringify(deletePayload)
                }
            )
        }

        const isSuccess = Boolean(data?.result || data?.success)
        if (isSuccess) {
            return { success: true }
        }
        return { success: false, message: data?.message || "API returned false result" }
    } catch (error) {
        console.error("Error deleting schedule:", error)
        return { success: false, message: "Network error" }
    }
}

export async function getScheduleResponseAction(codeName: string): Promise<{ result: boolean; dataReturn: unknown[] }> {
    try {
        let data = await fetchMenuApi<{ result?: boolean; dataReturn?: unknown[] }>(
            "control_schedule",
            "/streetlights/settings/alert",
            {
                method: "POST",
                body: JSON.stringify({ code_name: codeName, groupCode: codeName })
            }
        )

        if (!data || !data.result) {
            data = await fetchLesApi<{ result?: boolean; dataReturn?: unknown[] }>(
                "/StreetLightSmartSolar/getDataResponseSettingSchedule",
                {
                    method: "POST",
                    body: JSON.stringify({ code_name: codeName })
                }
            )
        }

        if (data?.result && Array.isArray(data.dataReturn)) {
            return { result: true, dataReturn: data.dataReturn }
        }
        return { result: false, dataReturn: [] }
    } catch (error) {
        console.error("Error fetching schedule response:", error)
        return { result: false, dataReturn: [] }
    }
}

export async function setModeResendAction(payload: Record<string, unknown>): Promise<{ success: boolean; message?: string; data?: unknown }> {
    const WAIT_TIME = process.env.WAIT_TIME || "30"
    const requestBody = {
        ...payload,
        wait_time: WAIT_TIME
    }

    try {
        let data = await fetchMenuApi<{ result?: boolean; dataReturn?: unknown }>(
            "control_streetlight",
            "/streetlights/commands/set-mode",
            {
                method: "POST",
                body: JSON.stringify(requestBody)
            }
        )

        if (!data) {
            data = await fetchLesApi<{ result?: boolean; dataReturn?: unknown }>(
                "/StreetLight/setModeResend",
                {
                    method: "POST",
                    body: JSON.stringify(requestBody)
                }
            )
        }

        if (data?.result) {
            if (data.dataReturn && data.dataReturn !== "") {
                return { success: true, data }
            }
            return { success: false, message: "Timeout or No Data Return" }
        }

        return { success: false, message: "API returned false result" }
    } catch (error) {
        console.error("Error resending command:", error)
        return { success: false, message: "Network error" }
    }
}
