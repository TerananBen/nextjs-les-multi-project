"use server"

import { ScheduleItem, ScheduleResponseItem, ResendPayload } from "@/types/schedule-settings"
import { fetchLesApi, fetchMenuApi } from "@/lib/les-api"

interface RawScheduleItem {
    list_group_name_code?: string | string[] | unknown[];
    list_scenes_light?: string | unknown[] | Record<string, unknown>;
    name_schedule?: string;
    scheduleName?: string;
    nameSchedule?: string;
    schedule_name?: string;
    name?: string;
    type_schedule?: string;
    typeSchedule?: string;
    schedule_type?: string;
    type?: string;
    code_name?: string;
    groupCode?: string;
    group_code?: string;
    codeName?: string;
    code?: string;
    id?: string;
    dataGroupName?: string[];
    groupNames?: string[];
    group_names?: string[];
    groups?: unknown[];
    listScenes?: unknown[];
    scenes?: unknown[];
    dataGroupCode?: string[];
    groupCodes?: string[];
    group_codes?: string[];
    listDays?: string[];
    days?: string[];
    [key: string]: unknown;
}

function parseGroups(raw: unknown): { names: string[]; codes: string[] } {
    const names: string[] = []
    const codes: string[] = []
    if (!raw) return { names, codes }

    let parsed = raw
    if (typeof raw === "string") {
        try {
            parsed = JSON.parse(raw)
        } catch {
            return { names: [raw.trim()], codes: [] }
        }
    }

    if (Array.isArray(parsed)) {
        for (const item of parsed) {
            if (typeof item === "string") {
                if (item.includes("$")) {
                    const [n, c] = item.split("$")
                    if (n) names.push(n.trim())
                    if (c) codes.push(c.trim())
                } else {
                    names.push(item.trim())
                }
            } else if (item && typeof item === "object") {
                const obj = item as Record<string, unknown>
                const n = String(obj.name || obj.group_name || obj.groupName || obj.dataGroupName || "")
                const c = String(obj.code || obj.group_code || obj.groupCode || obj.dataGroupCode || "")
                if (n) names.push(n)
                if (c) codes.push(c)
            }
        }
    }
    return { names, codes }
}

function parseScenes(raw: unknown): unknown[] {
    if (!raw) return []
    let parsed = raw
    if (typeof raw === "string") {
        try {
            parsed = JSON.parse(raw)
        } catch {
            return []
        }
    }
    if (Array.isArray(parsed)) return parsed
    if (parsed && typeof parsed === "object") return [parsed]
    return []
}

function parseDays(raw: unknown): string[] {
    if (!raw) return []
    let parsed = raw
    if (typeof raw === "string") {
        try {
            parsed = JSON.parse(raw)
        } catch {
            return [raw.trim()]
        }
    }
    if (Array.isArray(parsed)) return parsed.map(String)
    return []
}

export async function getDataScheduleAction(): Promise<ScheduleItem[]> {
    try {
        let data = await fetchMenuApi<unknown>(
            "control_schedule",
            "/streetlights/settings/schedule-multisensor",
            {
                method: "GET"
            }
        )

        if (!data) {
            data = await fetchLesApi<unknown>(
                "/api/v1/streetlights/settings/schedule-multisensor",
                {
                    method: "GET"
                }
            )
        }

        if (!data) {
            data = await fetchLesApi<unknown>(
                "/api/v1/streetlights/settings/get-schedule-multisensor",
                {
                    method: "POST",
                    body: JSON.stringify({})
                }
            )
        }

        if (!data) {
            data = await fetchLesApi<unknown>(
                "/StreetLight/getDataScheduleMultiSensor",
                {
                    method: "POST",
                    body: JSON.stringify({})
                }
            )
        }

        let rawItems: RawScheduleItem[] = []
        if (Array.isArray(data)) {
            rawItems = data as RawScheduleItem[]
        } else if (data && typeof data === "object") {
            const d = data as Record<string, unknown>
            if (Array.isArray(d.dataReturn)) {
                rawItems = d.dataReturn as RawScheduleItem[]
            } else if (Array.isArray(d.data)) {
                rawItems = d.data as RawScheduleItem[]
            } else if (Array.isArray(d.schedules)) {
                rawItems = d.schedules as RawScheduleItem[]
            } else if (Array.isArray(d.items)) {
                rawItems = d.items as RawScheduleItem[]
            } else if (Array.isArray(d.result)) {
                rawItems = d.result as RawScheduleItem[]
            }
        }

        if (rawItems.length > 0) {
            return rawItems.map((item: RawScheduleItem) => {
                const groupParsed = parseGroups(
                    item.list_group_name_code ??
                    item.groups ??
                    item.dataGroupName ??
                    item.groupNames ??
                    item.group_names
                )

                const groupNames = groupParsed.names.length > 0
                    ? groupParsed.names
                    : Array.isArray(item.dataGroupName)
                        ? (item.dataGroupName as string[])
                        : Array.isArray(item.group_names)
                            ? (item.group_names as string[])
                            : []

                const groupCodes = groupParsed.codes.length > 0
                    ? groupParsed.codes
                    : Array.isArray(item.dataGroupCode)
                        ? (item.dataGroupCode as string[])
                        : Array.isArray(item.group_codes)
                            ? (item.group_codes as string[])
                            : []

                const scenes = parseScenes(
                    item.list_scenes_light ??
                    item.listScenes ??
                    item.scenes ??
                    item.list_scenes
                )

                const days = parseDays(
                    item.listDays ??
                    item.list_days ??
                    item.days
                )

                const rawType = String(
                    item.type_schedule ??
                    item.typeSchedule ??
                    item.schedule_type ??
                    item.type ??
                    "time"
                ).toLowerCase()

                let typeSchedule: "time" | "light" | "manual" | string = rawType
                if (rawType.includes("light") || rawType.includes("sensor") || rawType.includes("แสง")) {
                    typeSchedule = "light"
                } else if (rawType.includes("manual") || rawType.includes("มือ") || rawType.includes("ปิดใช้งาน")) {
                    typeSchedule = "manual"
                } else if (rawType.includes("time") || rawType.includes("timer") || rawType.includes("เวลา")) {
                    typeSchedule = "time"
                }

                const scheduleName = String(
                    item.name_schedule ??
                    item.scheduleName ??
                    item.nameSchedule ??
                    item.schedule_name ??
                    item.name ??
                    ""
                )

                const groupCode = String(
                    item.GROUP_CODE ??
                    item.group_code ??
                    item.groupCode ??
                    item.GroupCode ??
                    item.code_name ??
                    item.codeName ??
                    item.code ??
                    item.id ??
                    ""
                )

                return {
                    scheduleName,
                    typeSchedule,
                    groupCode,
                    GROUP_CODE: groupCode,
                    group_code: groupCode,
                    code_name: groupCode,
                    dataGroupName: groupNames,
                    dataGroupCode: groupCodes,
                    listScenes: scenes,
                    listDays: days
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
            "/streetlights/settings/schedule-multisensor",
            {
                method: "POST",
                body: JSON.stringify(payload)
            }
        )

        if (!data) {
            data = await fetchLesApi<{ result?: boolean; success?: boolean; message?: string; dataReturn?: unknown }>(
                "/api/v1/streetlights/settings/schedule-multisensor",
                {
                    method: "POST",
                    body: JSON.stringify(payload)
                }
            )
        }

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

        if (!data) {
            return { success: false, message: "No response from API server" }
        }

        const resObj = data as Record<string, unknown>
        if (resObj.result === false || resObj.success === false) {
            return { success: false, message: String(resObj.message || "API returned false result") }
        }

        return { success: true }
    } catch (error) {
        console.error("Error saving schedule:", error)
        return { success: false, message: "Network error" }
    }
}

export async function deleteScheduleAction(groupCode: string): Promise<{ success: boolean; message?: string }> {
    try {
        const deletePayload = {
            code_name: groupCode
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
            const legacyPayload = {
                groupCode,
                group_code: groupCode,
                code_name: groupCode,
                json_value: JSON.stringify({ groupCode })
            }
            data = await fetchLesApi<{ result?: boolean; success?: boolean; message?: string }>(
                "/StreetLight/deleteSettingSchedule",
                {
                    method: "POST",
                    body: JSON.stringify(legacyPayload)
                }
            )
        }

        if (!data) {
            return { success: false, message: "No response from API server" }
        }

        const isSuccess = data.result === true || data.success === true || (data.result !== false && data.success !== false)
        if (isSuccess) {
            return { success: true }
        }
        return { success: false, message: data.message || "API returned false result" }
    } catch (error) {
        console.error("Error deleting schedule:", error)
        return { success: false, message: "Network error" }
    }
}

export async function getScheduleResponseAction(codeName: string): Promise<{ result: boolean; dataReturn: ScheduleResponseItem[] }> {
    try {
        const payload = { code_name: codeName }

        let data = await fetchMenuApi<Record<string, unknown>>(
            "control_schedule",
            "/streetlights/settings/response-schedule",
            {
                method: "POST",
                body: JSON.stringify(payload)
            }
        )

        if (!data) {
            data = await fetchLesApi<Record<string, unknown>>(
                "/api/v1/streetlights/settings/response-schedule",
                {
                    method: "POST",
                    body: JSON.stringify(payload)
                }
            )
        }

        // Fallback for backward compatibility
        if (!data) {
            data = await fetchMenuApi<Record<string, unknown>>(
                "control_schedule",
                "/streetlights/settings/alert",
                {
                    method: "POST",
                    body: JSON.stringify({ code_name: codeName, groupCode: codeName })
                }
            )
        }

        if (!data) {
            data = await fetchLesApi<Record<string, unknown>>(
                "/StreetLightSmartSolar/getDataResponseSettingSchedule",
                {
                    method: "POST",
                    body: JSON.stringify(payload)
                }
            )
        }

        if (!data) {
            return { result: false, dataReturn: [] }
        }

        let rawList: unknown[] = []
        if (Array.isArray(data)) {
            rawList = data
        } else if (typeof data === "object" && data !== null) {
            if (Array.isArray(data.dataReturn)) {
                rawList = data.dataReturn
            } else if (Array.isArray(data.data)) {
                rawList = data.data
            } else if (Array.isArray(data.items)) {
                rawList = data.items
            } else if (Array.isArray(data.result)) {
                rawList = data.result
            }
        }

        const parsedList: ScheduleResponseItem[] = rawList.map((raw) => {
            if (typeof raw !== "object" || raw === null) {
                return {
                    imsi: "",
                    SN: "",
                    group_name: [],
                    last_update: "",
                    time_create: "",
                    status: ""
                }
            }
            const item = raw as Record<string, unknown>
            const imsi = String(item.imsi ?? item.SN ?? item.sn ?? item.device_sn ?? "")
            let group_name: string[] = []
            if (Array.isArray(item.group_name)) {
                group_name = item.group_name.map(String)
            } else if (typeof item.group_name === "string") {
                group_name = [item.group_name]
            } else if (Array.isArray(item.groupName)) {
                group_name = item.groupName.map(String)
            } else if (typeof item.groupName === "string") {
                group_name = [item.groupName]
            }

            const last_update = String(item.last_update ?? item.lastUpdate ?? item.updated_at ?? "")
            const time_create = String(item.time_create ?? item.timeCreate ?? item.created_at ?? "")
            const status = String(item.status ?? item.state ?? "")

            return {
                imsi,
                SN: imsi,
                group_name,
                last_update,
                time_create,
                status
            }
        })

        const isSuccess = data.result !== false && data.success !== false
        return { result: isSuccess, dataReturn: parsedList }
    } catch (error) {
        console.error("Error fetching schedule response:", error)
        return { result: false, dataReturn: [] }
    }
}

export async function resendScheduleAction(payload: ResendPayload | Record<string, unknown>): Promise<{ success: boolean; message?: string; data?: unknown }> {
    const rawWaitTime = payload.wait_time
    const waitTime = typeof rawWaitTime === "number"
        ? rawWaitTime
        : Number(rawWaitTime || process.env.WAIT_TIME || 20)

    const requestBody = {
        code_name: String(payload.code_name ?? ""),
        imsi: String(payload.imsi ?? ""),
        last_update: String(payload.last_update ?? ""),
        mode: String(payload.mode ?? ""),
        wait_time: Number.isNaN(waitTime) ? 20 : waitTime
    }

    try {
        let data = await fetchMenuApi<Record<string, unknown>>(
            "control_schedule",
            "/streetlights/settings/resend-schedule",
            {
                method: "POST",
                body: JSON.stringify(requestBody)
            }
        )

        if (!data) {
            data = await fetchLesApi<Record<string, unknown>>(
                "/api/v1/streetlights/settings/resend-schedule",
                {
                    method: "POST",
                    body: JSON.stringify(requestBody)
                }
            )
        }

        // Fallback to legacy endpoints if new endpoint is not available
        if (!data) {
            data = await fetchMenuApi<Record<string, unknown>>(
                "control_streetlight",
                "/streetlights/commands/set-mode",
                {
                    method: "POST",
                    body: JSON.stringify(requestBody)
                }
            )
        }

        if (!data) {
            data = await fetchLesApi<Record<string, unknown>>(
                "/StreetLight/setModeResend",
                {
                    method: "POST",
                    body: JSON.stringify(requestBody)
                }
            )
        }

        if (!data) {
            return { success: false, message: "No response from API server" }
        }

        if (data.result === false || data.success === false) {
            return { success: false, message: (data.message as string) || "API returned false result" }
        }

        return { success: true, data: data.dataReturn ?? data.data }
    } catch (error) {
        console.error("Error resending schedule command:", error)
        return { success: false, message: "Network error" }
    }
}

export const setModeResendAction = resendScheduleAction

export async function getScheduleDevicesByGroupAction(groupCode: string): Promise<ScheduleResponseItem[]> {
    const res = await getScheduleResponseAction(groupCode)
    if (res.result && Array.isArray(res.dataReturn)) {
        return res.dataReturn
    }
    return []
}

export async function resendAllScheduleByGroupAction(params: {
    groupCode: string;
    mode: string;
    waitTime?: number;
}): Promise<{
    success: boolean;
    total: number;
    successCount: number;
    failCount: number;
    message?: string;
}> {
    const { groupCode, mode, waitTime = 20 } = params
    if (!groupCode) {
        return { success: false, total: 0, successCount: 0, failCount: 0, message: "Missing group code" }
    }

    try {
        const devices = await getScheduleDevicesByGroupAction(groupCode)

        if (devices.length === 0) {
            return {
                success: false,
                total: 0,
                successCount: 0,
                failCount: 0,
                message: "No devices found in group"
            }
        }

        let successCount = 0
        let failCount = 0

        for (const item of devices) {
            const imsi = item.imsi || item.SN || ""
            if (!imsi) continue

            const payload: ResendPayload = {
                code_name: groupCode,
                imsi,
                last_update: item.last_update || "",
                mode,
                wait_time: waitTime
            }

            try {
                const res = await resendScheduleAction(payload)
                if (res.success) {
                    successCount++
                } else {
                    failCount++
                }
            } catch (err) {
                console.error(`Error resending to device ${imsi}:`, err)
                failCount++
            }
        }

        return {
            success: successCount > 0,
            total: devices.length,
            successCount,
            failCount
        }
    } catch (error) {
        console.error("Error in resendAllScheduleByGroupAction:", error)
        return {
            success: false,
            total: 0,
            successCount: 0,
            failCount: 0,
            message: "Internal server error"
        }
    }
}
