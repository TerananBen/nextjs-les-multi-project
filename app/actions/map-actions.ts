"use server"

import { getProjectId } from "@/lib/project"
import { resolveProjectSlug } from "@/config/projects"
import { fetchLesApi } from "@/lib/les-api"
import { getMapApiVersion } from "@/app/actions/api-settings"

export interface GetListDataGroupResponse {
    result: boolean
    apiName: string
    dateTime: string
    dataReturn: {
        groupCode: string
        groupName: string
    }[]
}

export async function getListDataGroupAction(): Promise<{ groupCode: string; groupName: string }[]> {
    try {
        const version = await getMapApiVersion()

        const data = await fetchLesApi<
            { groupCode?: string; groupName?: string; group_code?: string; group_name?: string }[] |
            { result?: boolean; dataReturn?: { groupCode?: string; groupName?: string; group_code?: string; group_name?: string }[] }
        >(
            `/api/v${version}/streetlights/groups`,
            {
                method: "GET",
            }
        )

        let rawList: unknown[] = []
        if (Array.isArray(data)) {
            rawList = data
        } else if (data && "dataReturn" in data && Array.isArray(data.dataReturn)) {
            rawList = data.dataReturn
        }

        if (rawList.length > 0) {
            return rawList.map((item) => {
                const g = item as Record<string, unknown>
                return {
                    groupCode: String(g.groupCode ?? g.group_code ?? ""),
                    groupName: String(g.groupName ?? g.group_name ?? ""),
                }
            }).filter(g => Boolean(g.groupName))
        }
        return []
    } catch (error) {
        console.error("Error fetching group data:", error)
        return []
    }
}

export interface GetListDataIMSIResponse {
    result: boolean
    apiName: string
    dateTime: string
    dataReturn: string[]
}

export async function getListDataIMSIAction(): Promise<string[]> {
    try {
        const devices = await getDataLatLongSearchAction("group", ["ALL"])
        const imsis = devices
            .map((d) => d.imsi?.trim())
            .filter((imsi): imsi is string => Boolean(imsi))
        return Array.from(new Set(imsis))
    } catch (error) {
        console.error("Error fetching IMSI data:", error)
        return []
    }
}

export interface GetListDataStreetLightNameResponse {
    result: boolean
    apiName: string
    dateTime: string
    dataReturn: string[]
}

export async function getListDataStreetLightNameAction(): Promise<string[]> {
    try {
        const devices = await getDataLatLongSearchAction("group", ["ALL"])
        const names = devices
            .map((d) => (d.street_light_name || d.name_pole || "").trim())
            .filter((name): name is string => Boolean(name))
        return Array.from(new Set(names))
    } catch (error) {
        console.error("Error fetching Street Light Name data:", error)
        return []
    }
}


export interface LatLongData {
    SN?: string
    id: string
    imsi: string
    lat: string
    lng: string
    using_sensor: string
    last_power: string
    type_schedule: string
    gateway_id: string | null
    status: string
    name_pole: string
    name_gov: string
    street_light_name?: string
    group_name?: string
}

export interface GetDataLatLongResponse {
    result: boolean
    apiName: string
    dateTime: string
    dataReturn: LatLongData[]
}

export async function getDataLatLongSearchAction(
    typeSearch: "group" | "imsi" | "street_light_name",
    listValue: string[],
    statusLamp: string = "all",
    typeGps: string = "rtu"
): Promise<LatLongData[]> {
    try {
        const version = await getMapApiVersion()
        const finalTypeGps = typeGps || process.env.MAP_GPS_TYPE || "rtu"

        let resolvedListValue = listValue
        if (typeSearch === "group" && listValue.length > 0 && !listValue.some(v => v.toUpperCase() === "ALL")) {
            try {
                const groups = await getListDataGroupAction()
                const expanded = new Set<string>()
                for (const val of listValue) {
                    expanded.add(val)
                    const found = groups.find(g => g.groupName === val || g.groupCode === val)
                    if (found) {
                        if (found.groupCode) expanded.add(found.groupCode)
                        if (found.groupName) expanded.add(found.groupName)
                    }
                }
                resolvedListValue = Array.from(expanded)
            } catch {
                // Keep original listValue if group resolution encounters an issue
            }
        }

        const payload = {
            type_search: typeSearch,
            type_gps: finalTypeGps,
            status_lamp: statusLamp,
            list_value: resolvedListValue,
        }

        const data = await fetchLesApi<GetDataLatLongResponse | LatLongData[]>(
            `/api/v${version}/streetlights/getDataLatLong`,
            {
                method: "POST",
                body: JSON.stringify(payload),
            }
        )

        let rawList: unknown[] = []
        if (Array.isArray(data)) {
            rawList = data
        } else if (data && "dataReturn" in data && Array.isArray(data.dataReturn)) {
            rawList = data.dataReturn
        }

        if (rawList.length > 0) {
            return rawList.map((item) => {
                const d = item as Record<string, unknown>
                const sn = String(d.imsi ?? d.SN ?? d.id ?? "")
                return {
                    id: String(d.id ?? sn),
                    imsi: sn,
                    lat: String(d.lat ?? ""),
                    lng: String(d.lng ?? ""),
                    using_sensor: String(d.using_sensor ?? "false"),
                    last_power: String(d.last_power ?? "0"),
                    type_schedule: String(d.type_schedule ?? "manual"),
                    gateway_id: d.gateway_id ? String(d.gateway_id) : null,
                    status: String(d.status ?? ""),
                    name_pole: String(d.name_pole ?? ""),
                    name_gov: String(d.name_gov ?? ""),
                    street_light_name: d.street_light_name ? String(d.street_light_name) : undefined,
                    group_name: d.group_name ? String(d.group_name) : undefined,
                }
            })
        }
        return []
    } catch (error) {
        console.error("Error fetching LatLong search data:", error)
        return []
    }
}

export interface ImsiDetail {
    imsi: string
    group_name: string
    last_update: string
    last_command: string
    last_status: string
    number_gov: string
    street_light_name: string
    gateway_id: string
}

export interface GetDataDetailIMSIResponse {
    result: boolean
    apiName: string
    dateTime: string
    dataReturn: ImsiDetail
}

export async function getDataDetailIMSIAction(imsi: string): Promise<ImsiDetail | null> {
    try {
        const version = await getMapApiVersion()

        const data = await fetchLesApi<
            ImsiDetail |
            { result?: boolean; dataReturn?: ImsiDetail }
        >(
            `/api/v${version}/streetlights/devices/detail?imsi=${encodeURIComponent(imsi)}`,
            {
                method: "GET",
            }
        )

        let detail: Record<string, unknown> | null = null
        if (data) {
            if ("dataReturn" in data && data.dataReturn && typeof data.dataReturn === "object") {
                detail = data.dataReturn as unknown as Record<string, unknown>
            } else if (typeof data === "object") {
                detail = data as unknown as Record<string, unknown>
            }
        }

        if (detail) {
            return {
                imsi: String(detail.imsi ?? detail.Imsi ?? imsi),
                group_name: String(detail.groupName ?? detail.group_name ?? detail.GroupName ?? ""),
                last_update: String(detail.lastUpdate ?? detail.last_update ?? detail.LastUpdate ?? ""),
                last_command: String(detail.lastCommand ?? detail.last_command ?? detail.LastCommand ?? ""),
                last_status: String(detail.lastStatus ?? detail.last_status ?? detail.LastStatus ?? ""),
                number_gov: String(detail.numberGov ?? detail.number_gov ?? detail.NumberGov ?? ""),
                street_light_name: String(detail.streetLightName ?? detail.street_light_name ?? detail.StreetLightName ?? ""),
                gateway_id: String(detail.gatewayId ?? detail.gateway_id ?? detail.GatewayId ?? ""),
            }
        }
        return null
    } catch (error) {
        console.error("Error fetching IMSI detail:", error)
        return null
    }
}



export interface SendCommandMqttResponse {
    result: boolean
    apiName: string
    dateTime: string
    dataReturn: string
}

export async function sendCommandMqttAction(
    imsi: string,
    commandType: "0" | "1",
    dimPercent: string
): Promise<{ success: boolean; message?: string }> {
    try {
        const version = await getMapApiVersion()
        const waitTime = process.env.WAIT_TIME || "30"

        const body = {
            type_open: "imsi",
            imsi: imsi,
            wait_time: waitTime,
            command_type: commandType,
            dim_percent: dimPercent,
        }

        const data = await fetchLesApi<{ result?: boolean; dataReturn?: string; success?: boolean }>(
            `/api/v${version}/streetlights/commands/control-rtu`,
            {
                method: "POST",
                body: JSON.stringify(body),
            }
        )

        if (data && (data.result === true || data.dataReturn === "true" || data.success === true)) {
            return { success: true }
        }
        return { success: false, message: "Command Failed" }
    } catch (error) {
        console.error("Error sending MQTT command:", error)
        return { success: false, message: "Network Error" }
    }
}

export interface ReadDataMqttResponse {
    result: boolean
    apiName: string
    dateTime: string
    dataReturn: string
}

export async function readDataMqttAction(
    gatewayId: string,
    imsi: string
): Promise<{ success: boolean; message?: string }> {
    try {
        const rawProjectId = await getProjectId()
        const projectSlug = resolveProjectSlug(rawProjectId)
        const version = await getMapApiVersion()
        const waitTime = process.env.WAIT_TIME || "30"

        const randomToken = Math.random().toString(36).substring(2, 12)
        const msg = JSON.stringify({ Type: "GetPower", TOKEN: randomToken })

        const body = {
            topic: `${gatewayId}/${imsi}`,
            message: msg,
            subscribe: `${projectSlug}/${imsi}`,
            wait_time: waitTime,
        }

        const data = await fetchLesApi<ReadDataMqttResponse | { result?: boolean; dataReturn?: string }>(
            `/api/v${version}/streetlights/commands/read-data-mqtt`,
            {
                method: "POST",
                body: JSON.stringify(body),
            }
        )

        if (data && (data.result === true || Boolean(data.dataReturn))) {
            return { success: true }
        }
        return { success: false, message: "Read Timeout" }
    } catch (error) {
        console.error("Error reading MQTT data:", error)
        return { success: false, message: "Network Error" }
    }
}

