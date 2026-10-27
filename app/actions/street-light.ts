"use server"

import { DeviceGroup, StreetLightDevice, GetLogResponse, StreetLightLog } from "@/types/street-light"
import { fetchLesApi, fetchMenuApi } from "@/lib/les-api"

function mapToStreetLightDevice(item: unknown): StreetLightDevice {
    const d = item as Record<string, unknown>
    const imei = String(d.imeI_Name ?? d.IMEI_Name ?? d.imsi ?? d.Imsi ?? d.imei ?? d.Imei ?? "")

    let groups: string[] = []
    if (Array.isArray(d.streetLightGroups)) {
        groups = d.streetLightGroups.map(String)
    } else if (Array.isArray(d.group_name)) {
        groups = d.group_name.map(String)
    } else if (typeof d.group_name === "string" && d.group_name.trim().startsWith("[")) {
        try {
            groups = JSON.parse(d.group_name)
        } catch {
            groups = [d.group_name]
        }
    } else if (typeof d.group_name === "string" && d.group_name.trim()) {
        groups = [d.group_name]
    } else if (typeof d.groupName === "string" && d.groupName.trim()) {
        groups = [d.groupName]
    }

    let commands: string[] = []
    if (Array.isArray(d.streetLightCommand)) {
        commands = d.streetLightCommand.map(String)
    } else if (typeof d.last_command === "string" && d.last_command.trim().startsWith("[")) {
        try {
            commands = JSON.parse(d.last_command)
        } catch {
            commands = [d.last_command]
        }
    } else if (typeof d.last_command === "string" && d.last_command.trim()) {
        commands = [d.last_command]
    }

    return {
        imeI_Name: imei,
        streetLightName: String(d.streetLightName ?? d.street_light_name ?? d.StreetLightName ?? "ไม่มีข้อมูล"),
        streetLightSerial: String(d.streetLightSerial ?? d.gov_name ?? d.GOV_No ?? d.govName ?? "ไม่มีข้อมูล"),
        streetLightStatus: String(d.streetLightStatus ?? d.status ?? "3"),
        streetLightGroups: groups,
        streetLightCommand: commands,
        streetLightLastUpdate: String(d.streetLightLastUpdate ?? d.lastUpdate ?? d.last_update ?? ""),
        lastUpdate: (d.lastUpdate ?? d.streetLightLastUpdate ?? d.last_update ?? null) as string | null,
        lastPower: String(d.lastPower ?? d.last_power ?? "0"),
        latitude: (d.latitude ?? d.lat ?? d.lat_lamp ?? null) as string | null,
        longitude: (d.longitude ?? d.lng ?? d.long_lamp ?? null) as string | null,
        gatewayId: String(d.gatewayId ?? d.gateway_id ?? ""),
        lifeTime: Number(d.lifeTime ?? 0),
        typeSchedule: String(d.typeSchedule ?? d.type_schedule ?? "manual"),
        usingSensor: Boolean(d.usingSensor ?? (d.using_sensor === "1" || d.using_sensor === true))
    }
}

export async function getListDataGroupAction(): Promise<DeviceGroup[]> {
    try {
        const data = await fetchMenuApi<unknown>("control_streetlight", "/streetlights/groups", {
            method: "GET",
            skipProject: true
        })

        let rawList: unknown[] = []
        if (Array.isArray(data)) {
            rawList = data
        } else if (data && typeof data === "object" && "dataReturn" in data && Array.isArray((data as { dataReturn: unknown }).dataReturn)) {
            rawList = (data as { dataReturn: unknown[] }).dataReturn
        }

        if (rawList.length > 0) {
            return rawList.map(item => {
                const g = item as Record<string, unknown>
                return {
                    groupCode: String(g.groupCode ?? g.group_code ?? g.GroupCode ?? ""),
                    groupName: String(g.groupName ?? g.group_name ?? g.GroupName ?? "")
                }
            }).filter(g => Boolean(g.groupName && g.groupName.trim()))
        }

        // Fallback to legacy route
        const legacyData = await fetchLesApi<unknown>("/StreetLight/getListDataGroup", {
            method: "POST",
            body: JSON.stringify({}),
            skipProject: true
        })

        if (Array.isArray(legacyData)) {
            return (legacyData as Array<Record<string, unknown>>).map(g => ({
                groupCode: String(g.groupCode ?? g.group_code ?? g.GroupCode ?? ""),
                groupName: String(g.groupName ?? g.group_name ?? g.GroupName ?? "")
            })).filter(g => Boolean(g.groupName && g.groupName.trim()))
        } else if (legacyData && typeof legacyData === "object" && "dataReturn" in legacyData && Array.isArray((legacyData as { dataReturn: unknown }).dataReturn)) {
            return ((legacyData as { dataReturn: Array<Record<string, unknown>> }).dataReturn).map(g => ({
                groupCode: String(g.groupCode ?? g.group_code ?? g.GroupCode ?? ""),
                groupName: String(g.groupName ?? g.group_name ?? g.GroupName ?? "")
            })).filter(g => Boolean(g.groupName && g.groupName.trim()))
        }

        return []
    } catch (error) {
        console.error("Error fetching groups:", error)
        return []
    }
}

export async function searchStreetLightFromGroupAction(groupName: string): Promise<StreetLightDevice[]> {
    try {
        let targetGroupNames: string[] = []

        if (!groupName || groupName.toUpperCase() === "ALL") {
            const allGroups = await getListDataGroupAction()
            targetGroupNames = allGroups
                .map(g => g.groupName)
                .filter(name => Boolean(name && name.toUpperCase() !== "ALL"))
        } else {
            targetGroupNames = [groupName]
        }

        if (targetGroupNames.length > 0) {
            const body = {
                list_group: JSON.stringify(targetGroupNames),
                operator_select: "OR"
            }

            const data = await fetchMenuApi<unknown>("control_streetlight", "/streetlights/groups/search", {
                method: "POST",
                body: JSON.stringify(body),
                skipProject: true
            })

            let rawList: unknown[] = []
            if (Array.isArray(data)) {
                rawList = data
            } else if (data && typeof data === "object" && "dataReturn" in data && Array.isArray((data as { dataReturn: unknown }).dataReturn)) {
                rawList = (data as { dataReturn: unknown[] }).dataReturn
            }

            if (rawList.length > 0) {
                return rawList.map(mapToStreetLightDevice)
            }
        }

        // Comprehensive Fallback when searching "ALL" or when no devices found in specified groups:
        // Query /streetlights/getDataLatLong with type_group: "ALL"
        if (!groupName || groupName.toUpperCase() === "ALL") {
            const latLongData = await fetchMenuApi<unknown>("control_streetlight", "/streetlights/getDataLatLong", {
                method: "POST",
                body: JSON.stringify({
                    type_group: "ALL",
                    type_search: "group"
                }),
                skipProject: true
            })

            let latLongList: unknown[] = []
            if (Array.isArray(latLongData)) {
                latLongList = latLongData
            } else if (latLongData && typeof latLongData === "object" && "dataReturn" in latLongData && Array.isArray((latLongData as { dataReturn: unknown }).dataReturn)) {
                latLongList = (latLongData as { dataReturn: unknown[] }).dataReturn
            }

            if (latLongList.length > 0) {
                return latLongList.map(mapToStreetLightDevice)
            }
        }

        return []
    } catch (error) {
        console.error("Error searching street lights:", error)
        return []
    }
}

export async function refreshStreetLightPowerAction(gatewayId: string, imeI_Name: string): Promise<{ success: boolean; power: string; error?: string }> {
    const WAIT_TIME = process.env.WAIT_TIME || "30"

    try {
        const generatedToken = Array.from(Array(15), () => Math.floor(Math.random() * 36).toString(36)).join('')

        const message = JSON.stringify({
            Type: "GetPower",
            TOKEN: generatedToken
        })

        const body = {
            topic: `${gatewayId}/${imeI_Name}`,
            message: message,
            wait_time: WAIT_TIME
        }

        let data = await fetchMenuApi<{ result?: boolean; dataReturn?: string }>(
            "control_streetlight",
            "/streetlights/commands/read-data-mqtt",
            {
                method: "POST",
                body: JSON.stringify(body),
                skipProject: true
            }
        )

        if (!data) {
            data = await fetchLesApi<{ result?: boolean; dataReturn?: string }>(
                "/api/v1/streetlights/commands/read-data-mqtt",
                {
                    method: "POST",
                    body: JSON.stringify(body),
                    skipProject: true
                }
            )
        }

        if (!data) {
            return { success: false, power: "0", error: "API Failed" }
        }

        // Response format:
        // Success: { result: true, dataReturn: "{\"W\":\"44\", ...}" }
        // Fail: { result: true, dataReturn: "" }
        if (data.result && data.dataReturn) {
            try {
                const parsedData = JSON.parse(data.dataReturn)
                if (parsedData.W) {
                    return { success: true, power: parsedData.W }
                }
            } catch (e) {
                console.error("JSON parse error", e)
            }
        }

        return { success: false, power: "0", error: "Read Failed" }
    } catch (error) {
        console.error("Refresh Power Error:", error)
        return { success: false, power: "0", error: "Exception" }
    }
}

export async function sendStreetLightCommandAction(
    imsi: string,
    commandType: "0" | "1", // 0: Close, 1: Open
    dimPercent: string // 0-100
): Promise<{ success: boolean; error?: string; dataReturn?: string }> {
    try {
        const body = {
            type_open: "imsi",
            imsi: imsi,
            command_type: commandType,
            dim_percent: dimPercent
        }

        let data = await fetchMenuApi<{ result?: boolean; dataReturn?: string; success?: boolean }>(
            "control_streetlight",
            "/streetlights/commands/control-rtu",
            {
                method: "POST",
                body: JSON.stringify(body),
                skipProject: true
            }
        )

        // Fallback to versioned path via gateway if fetchMenuApi resolution fails
        if (!data) {
            data = await fetchLesApi<{ result?: boolean; dataReturn?: string; success?: boolean }>(
                "/api/v1/streetlights/commands/control-rtu",
                {
                    method: "POST",
                    body: JSON.stringify(body),
                    skipProject: true
                }
            )
        }

        if (!data) {
            return { success: false, error: "API Failed" }
        }

        const isSuccess = data.result === true || data.dataReturn === "true" || data.success === true
        if (isSuccess) {
            return { success: true, dataReturn: String(data.dataReturn ?? "true") }
        }

        return { success: false, error: "Command Failed" }
    } catch (error) {
        console.error("Send Command Error:", error)
        return { success: false, error: "Exception" }
    }
}

export async function getDataLogStreetLightMongoAction(
    imsi: string,
    timestamp_start: string,
    timestamp_end: string
): Promise<Record<string, StreetLightLog>> {
    try {
        const diffDays = Math.max(1, Math.ceil((Number(timestamp_end) - Number(timestamp_start)) / 86400))
        const body = {
            imsi,
            day: String(diffDays),
            days: String(diffDays),
            timestamp_start,
            timestamp_end
        }

        let data = await fetchMenuApi<GetLogResponse>(
            "control_streetlight",
            "/streetlights/power-logs",
            {
                method: "POST",
                body: JSON.stringify(body),
                skipProject: true
            }
        )

        if (!data) {
            data = await fetchLesApi<GetLogResponse>(
                "/api/v1/streetlights/power-logs",
                {
                    method: "POST",
                    body: JSON.stringify(body),
                    skipProject: true
                }
            )
        }

        if (!data) {
            data = await fetchLesApi<GetLogResponse>(
                "/StreetLight/getDataLogStreetLightMongo",
                {
                    method: "POST",
                    body: JSON.stringify(body),
                    skipProject: true
                }
            )
        }

        if (data?.result && data.dataReturn) {
            return data.dataReturn
        }
        return {}
    } catch (error) {
        console.error("Get Log Error:", error)
        return {}
    }
}
