"use server"

import {
    GroupConfigData,
    ControlGroupResponse,
    ResendCommandResponse,
    GetDataLatLongResponseControlResponse,
    GroupDetailData,
    GetDataLatLongResponse,
    LatLongData
} from "@/types/group-config"
import { SearchStreetLightResponse } from "@/types/street-light"
import { fetchLesApi, fetchMenuApi } from "@/lib/les-api"
import { getGroupConfigApiVersion } from "@/app/actions/api-settings"

export async function getListDataGroupAllAction(): Promise<GroupConfigData[]> {
    try {
        const version = await getGroupConfigApiVersion()

        const data = await fetchLesApi<GroupConfigData[] | { result?: boolean; dataReturn?: GroupConfigData[] }>(
            `/api/v${version}/streetlights/groups/all`,
            {
                method: "GET",
                skipProject: true,
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
                const onlineVal = g.online_rtu ?? g.onlineRtu ?? g.online ?? g.rtu_online ?? g.rtuOnline ?? g.total_rtu_online ?? g.online_count
                const offlineVal = g.offline_rtu ?? g.offlineRtu ?? g.offline ?? g.rtu_offline ?? g.rtuOffline ?? g.total_rtu_offline ?? g.offline_count
                const total = parseInt(String(g.total_rtu ?? g.totalRtu ?? g.TotalRtu ?? "0"), 10) || 0
                return {
                    group_code: String(g.group_code ?? g.groupCode ?? g.GroupCode ?? ""),
                    group_name: String(g.group_name ?? g.groupName ?? g.GroupName ?? ""),
                    sub_district: String(g.sub_district ?? g.subDistrict ?? g.SubDistrict ?? "-"),
                    total_rtu: String(total),
                    online_rtu: onlineVal !== undefined && onlineVal !== null
                        ? String(onlineVal)
                        : (total > 0 ? String(total) : "0"),
                    offline_rtu: offlineVal !== undefined && offlineVal !== null
                        ? String(offlineVal)
                        : "0",
                }
            })
        }
        return []
    } catch (error) {
        console.error("Error fetching groups via API:", error)
        return []
    }
}

export async function addNewGroupNameAction(groupName: string): Promise<{ result: boolean; message?: string }> {
    try {
        const version = await getGroupConfigApiVersion()

        const data = await fetchLesApi<{ result?: boolean; success?: boolean; message?: string; dataReturn?: unknown }>(
            `/api/v${version}/streetlights/new-group`,
            {
                method: "POST",
                body: JSON.stringify({
                    group_name: groupName,
                }),
                skipProject: true,
            }
        )

        if (!data) {
            return { result: false, message: "Server configuration error or request failed" }
        }

        const isSuccess = Boolean(data.result ?? data.success) && (
            data.dataReturn === true ||
            data.dataReturn === "true" ||
            data.dataReturn === "1" ||
            data.dataReturn === 1 ||
            data.result === true ||
            data.success === true
        )

        return {
            result: isSuccess,
            message: isSuccess ? undefined : (data.message || "Failed to create group")
        }
    } catch (error) {
        console.error("Error adding group via API:", error)
        return { result: false, message: "Network error" }
    }
}

export async function deleteGroupConfigAction(groupCode: string, groupName?: string): Promise<{ result: boolean; message?: string }> {
    try {
        const version = await getGroupConfigApiVersion()
        const query = groupName ? `?groupName=${encodeURIComponent(groupName)}` : ""

        const data = await fetchLesApi<{ result: boolean; message?: string; dataReturn?: unknown }>(
            `/api/v${version}/streetlights/groups/${encodeURIComponent(groupCode)}${query}`,
            {
                method: "DELETE",
                skipProject: true
            }
        )

        if (!data) {
            return { result: false, message: "Server configuration error or request failed" }
        }

        if (data.result && (data.dataReturn === true || data.dataReturn === undefined)) {
            return { result: true }
        }

        return { result: false, message: data.message || "API returned failure" }
    } catch (error) {
        console.error("Error deleting group via API:", error)
        return { result: false, message: "Network error" }
    }
}

export async function getListDataGroupDetailAction(searchGroupName: string = "ALL"): Promise<GroupDetailData[]> {
    try {
        const version = await getGroupConfigApiVersion()

        const data = await fetchLesApi<unknown>(
            `/api/v${version}/streetlights/groups/detail`,
            {
                method: "POST",
                body: JSON.stringify({
                    group_name: searchGroupName,
                    type_search: "OR"
                }),
                skipProject: true
            }
        )

        let rawDetailList: unknown[] = []
        if (Array.isArray(data)) {
            rawDetailList = data
        } else if (data && typeof data === "object" && "dataReturn" in data && Array.isArray((data as { dataReturn: unknown }).dataReturn)) {
            rawDetailList = (data as { dataReturn: unknown[] }).dataReturn
        }

        if (rawDetailList.length > 0) {
            return rawDetailList.map(item => {
                const d = item as Record<string, unknown>
                return {
                    project_name: String(d.project_name ?? d.projectName ?? d.ProjectName ?? ""),
                    group_code: (d.group_code ?? d.groupCode ?? d.GroupCode ?? null) as string | null,
                    group_name: String(d.group_name ?? d.groupName ?? d.GroupName ?? "[]"),
                    street_light_name: String(d.street_light_name ?? d.streetLightName ?? d.StreetLightName ?? "ไม่มีข้อมูล"),
                    gov_name: String(d.gov_name ?? d.govName ?? d.GovName ?? "ไม่มีข้อมูล"),
                    imsi: String(d.imsi ?? d.Imsi ?? d.imei ?? d.Imei ?? ""),
                    last_update: String(d.last_update ?? d.lastUpdate ?? d.LastUpdate ?? ""),
                    time_stamp: String(d.time_stamp ?? d.timeStamp ?? d.TimeStamp ?? ""),
                    last_power: String(d.last_power ?? d.lastPower ?? d.LastPower ?? "0"),
                    power_total: String(d.power_total ?? d.powerTotal ?? d.PowerTotal ?? "0"),
                    last_command: String(d.last_command ?? d.lastCommand ?? d.LastCommand ?? ""),
                    total_rtu: String(d.total_rtu ?? d.totalRtu ?? d.TotalRtu ?? "0"),
                }
            })
        }

        // Fallback: search via /api/v${version}/streetlights/groups/search
        const fallbackData = await fetchLesApi<unknown>(
            `/api/v${version}/streetlights/groups/search`,
            {
                method: "POST",
                body: JSON.stringify({
                    list_group: JSON.stringify([searchGroupName]),
                    operator_select: "OR"
                }),
                skipProject: true
            }
        )

        let searchItems: Array<Record<string, unknown>> = []
        if (Array.isArray(fallbackData)) {
            searchItems = fallbackData as Array<Record<string, unknown>>
        } else if (fallbackData && typeof fallbackData === "object" && "dataReturn" in fallbackData && Array.isArray((fallbackData as { dataReturn: unknown }).dataReturn)) {
            searchItems = (fallbackData as { dataReturn: Array<Record<string, unknown>> }).dataReturn
        }

        if (searchItems.length > 0) {
            return searchItems.map(d => ({
                project_name: String(d.projectName ?? d.project_name ?? ""),
                group_code: (d.groupCode ?? d.group_code ?? null) as string | null,
                group_name: Array.isArray(d.streetLightGroups)
                    ? JSON.stringify(d.streetLightGroups)
                    : String(d.groupName ?? d.group_name ?? JSON.stringify([searchGroupName])),
                street_light_name: String(d.streetLightName ?? d.street_light_name ?? "ไม่มีข้อมูล"),
                gov_name: String(d.streetLightSerial ?? d.gov_name ?? "ไม่มีข้อมูล"),
                imsi: String(d.imsi ?? d.imei ?? d.imeI_Name ?? d.IMEI_Name ?? ""),
                last_update: String(d.lastUpdate ?? d.streetLightLastUpdate ?? d.last_update ?? ""),
                time_stamp: String(d.timeStamp ?? d.time_stamp ?? d.lastUpdate ?? ""),
                last_power: String(d.lastPower ?? d.last_power ?? "0"),
                power_total: String(d.powerTotal ?? d.power_total ?? d.lastPower ?? "0"),
                last_command: Array.isArray(d.streetLightCommand) ? JSON.stringify(d.streetLightCommand) : String(d.last_command ?? ""),
                total_rtu: String(d.totalRtu ?? d.total_rtu ?? "1")
            }))
        }

        return []
    } catch (error) {
        console.error("Error fetching group detail:", error)
        return []
    }
}

export async function getDataLatLongAction(
    groupCodeOrName: string,
    groupNameFallback?: string
): Promise<LatLongData[]> {
    try {
        const version = await getGroupConfigApiVersion()

        let listValues: string[] = []
        if (groupCodeOrName && groupCodeOrName.toUpperCase() === "ALL") {
            listValues = ["ALL"]
        } else {
            if (groupCodeOrName && groupCodeOrName.trim()) {
                listValues.push(groupCodeOrName.trim())
            }
            if (groupNameFallback && groupNameFallback.trim() && groupNameFallback.trim() !== groupCodeOrName.trim()) {
                listValues.push(groupNameFallback.trim())
            }
        }

        const data = await fetchLesApi<GetDataLatLongResponse | LatLongData[]>(
            `/api/v${version}/streetlights/getDataLatLong`,
            {
                method: "POST",
                body: JSON.stringify({
                    type_search: "group",
                    list_value: listValues,
                    status_lamp: "all",
                    type_gps: "rtu"
                }),
                skipProject: true
            }
        )

        if (Array.isArray(data) && data.length > 0) {
            return data
        }

        if (data && "dataReturn" in data && Array.isArray(data.dataReturn) && data.dataReturn.length > 0) {
            return data.dataReturn
        }

        // Fallback: query /api/v${version}/streetlights/groups/search
        const fallbackData = await fetchLesApi<SearchStreetLightResponse>(
            `/api/v${version}/streetlights/groups/search`,
            {
                method: "POST",
                body: JSON.stringify({
                    list_group: JSON.stringify([groupNameFallback || groupCodeOrName]),
                    operator_select: "OR"
                }),
                skipProject: true
            }
        )

        if (fallbackData?.result && Array.isArray(fallbackData.dataReturn)) {
            return fallbackData.dataReturn.map(d => ({
                id: d.imeI_Name,
                imsi: d.imeI_Name,
                lat: d.latitude || "-",
                lng: d.longitude || "-",
                using_sensor: d.usingSensor ? "1" : "0",
                last_power: d.lastPower || "0",
                type_schedule: d.typeSchedule || "",
                gateway_id: d.gatewayId || null,
                status: d.streetLightStatus || ""
            }))
        }

        return []
    } catch (error) {
        console.error("Error fetching lat long data:", error)
        return []
    }
}

export async function configLatLongLampAndPoleAction(data: {
    imsi: string;
    lat_lamp: string;
    long_lamp: string;
    name_pole: string;
    name_gov: string;
}): Promise<{ result: boolean; message?: string }> {
    try {
        const version = await getGroupConfigApiVersion()

        const resData = await fetchLesApi<{ result: boolean; message?: string; dataReturn?: unknown }>(
            `/api/v${version}/streetlights/configLatLongLampAndPole`,
            {
                method: "POST",
                body: JSON.stringify(data),
                skipProject: true
            }
        )

        if (!resData) {
            return { result: false, message: "Server configuration error or request failed" }
        }

        if (resData.result) {
            return { result: true }
        }

        return { result: false, message: resData.message || "API returned failure" }
    } catch (error) {
        console.error("Error configuring device:", error)
        return { result: false, message: "Network error" }
    }
}

export async function deleteImsiGroupConfigAction(data: {
    group_code: string;
    group_name: string;
    imsi: string;
}): Promise<{ result: boolean; message?: string }> {
    try {
        const version = await getGroupConfigApiVersion()

        const resData = await fetchLesApi<{ result: boolean; message?: string; dataReturn?: unknown }>(
            `/api/v${version}/streetlights/deleteImsiGroupConfig`,
            {
                method: "POST",
                body: JSON.stringify({
                    group_code: data.group_code,
                    group_name: data.group_name,
                    imsi: data.imsi
                }),
                skipProject: true
            }
        )

        if (!resData) {
            return { result: false, message: "Server configuration error or request failed" }
        }

        if (resData.result) {
            return { result: true }
        }

        return { result: false, message: resData.message || "API returned failure" }
    } catch (error) {
        console.error("Error deleting device from group:", error)
        return { result: false, message: "Network error" }
    }
}

export async function addRtuToGroupAction(data: {
    group_code: string;
    group_name: string;
    imsi: string;
}): Promise<{ result: boolean; message?: string }> {
    try {
        const version = await getGroupConfigApiVersion()

        const resData = await fetchLesApi<{ result: boolean; message?: string; dataReturn?: unknown }>(
            `/api/v${version}/streetlights/groups/add-device`,
            {
                method: "PUT",
                body: JSON.stringify({
                    group_code: data.group_code,
                    group_name: data.group_name,
                    imsi: data.imsi
                }),
                skipProject: true
            }
        )

        if (!resData) {
            return { result: false, message: "Server configuration error or request failed" }
        }

        if (resData.result) {
            return { result: true }
        }

        return { result: false, message: resData.message || "API returned failure" }
    } catch (error) {
        console.error("Error adding device to group:", error)
        return { result: false, message: "Network error" }
    }
}

export async function sendCommandMqttMultiGroupV2Action(data: {
    group_code: string;
    command_type: string;
    dim_percent: string;
}): Promise<{ result: boolean; dataReturn?: string; message?: string }> {
    try {
        const payload = {
            type_open: "group",
            group_code: [data.group_code],
            command_type: data.command_type,
            dim_percent: data.dim_percent
        }

        let resData = await fetchMenuApi<ControlGroupResponse>(
            "control_streetlight",
            "/streetlights/commands/control-multigroup",
            {
                method: "POST",
                body: JSON.stringify(payload)
            }
        )

        if (!resData) {
            resData = await fetchLesApi<ControlGroupResponse>(
                "/api/v1/streetlights/commands/control-multigroup",
                {
                    method: "POST",
                    body: JSON.stringify(payload)
                }
            )
        }

        const isSuccess = Boolean(resData?.result || resData?.dataReturn === "true")
        if (isSuccess) {
            return { result: true, dataReturn: resData?.dataReturn || "true" }
        }

        return { result: false, message: "API failure" }
    } catch (error) {
        console.error("Error sending group command:", error)
        return { result: false, message: "Network error" }
    }
}

export async function sendCommandMqttMultiRtuV2Action(data: {
    list_imsi: string[];
    command_type: string;
    dim_percent: string;
}): Promise<{ result: boolean; dataReturn?: string; message?: string }> {
    try {
        const payload = {
            type_open: "4",
            list_imsi: data.list_imsi,
            command_type: data.command_type,
            dim_percent: data.dim_percent
        }

        let resData = await fetchMenuApi<ControlGroupResponse>(
            "control_streetlight",
            "/streetlights/commands/control-multirtu",
            {
                method: "POST",
                body: JSON.stringify(payload)
            }
        )

        if (!resData) {
            resData = await fetchLesApi<ControlGroupResponse>(
                "/api/v1/streetlights/commands/control-multirtu",
                {
                    method: "POST",
                    body: JSON.stringify(payload)
                }
            )
        }

        const isSuccess = Boolean(resData?.result || resData?.dataReturn === "true")
        if (isSuccess) {
            return { result: true, dataReturn: resData?.dataReturn || "true" }
        }

        return { result: false, message: "API failure" }
    } catch (error) {
        console.error("Error sending RTU command:", error)
        return { result: false, message: "Network error" }
    }
}

export async function resendCommandOnOffAction(tokenStr: string): Promise<{ result: boolean; message?: string }> {
    try {
        const resData = await fetchLesApi<ResendCommandResponse>("/StreetLight/resendCommandOnOff", {
            method: "POST",
            body: JSON.stringify({
                token: tokenStr
            }),
            skipProject: true
        })

        if (resData?.result) {
            return { result: true }
        }

        return { result: false, message: "API failure" }
    } catch (error) {
        console.error("Error resending command:", error)
        return { result: false, message: "Network error" }
    }
}

export async function getDataLatLongResponseControlAction(tokenStr: string, groupCode: string): Promise<{ result: boolean; dataReturn?: unknown[]; message?: string }> {
    try {
        const resData = await fetchLesApi<GetDataLatLongResponseControlResponse>("/StreetLightSmartSolar/getDataLatLongResponseControl", {
            method: "POST",
            body: JSON.stringify({
                token: tokenStr,
                group_code: JSON.stringify([groupCode])
            }),
            skipProject: true
        })

        if (resData?.result) {
            return { result: true, dataReturn: resData.dataReturn }
        }

        return { result: false, message: "API failure" }
    } catch (error) {
        console.error("Error checking command status:", error)
        return { result: false, message: "Network error" }
    }
}

export async function getListDataIMSIAllAction(): Promise<string[]> {
    try {
        // Primary strategy: fetch all devices in project via getDataLatLongAction("ALL")
        const allLatLong = await getDataLatLongAction("ALL")
        if (Array.isArray(allLatLong) && allLatLong.length > 0) {
            const imsis = allLatLong
                .map(d => d.imsi?.trim())
                .filter((imsi): imsi is string => Boolean(imsi))
            if (imsis.length > 0) {
                return Array.from(new Set(imsis))
            }
        }

        // Secondary fallback: fetch via /api/v${version}/streetlights/groups/search
        const version = await getGroupConfigApiVersion()
        const fallbackData = await fetchLesApi<unknown>(
            `/api/v${version}/streetlights/groups/search`,
            {
                method: "POST",
                body: JSON.stringify({
                    list_group: JSON.stringify(["ALL"]),
                    operator_select: "OR"
                }),
                skipProject: true
            }
        )

        let items: Array<Record<string, unknown>> = []
        if (Array.isArray(fallbackData)) {
            items = fallbackData as Array<Record<string, unknown>>
        } else if (fallbackData && typeof fallbackData === "object" && "dataReturn" in fallbackData && Array.isArray((fallbackData as { dataReturn: unknown }).dataReturn)) {
            items = (fallbackData as { dataReturn: Array<Record<string, unknown>> }).dataReturn
        }

        if (items.length > 0) {
            const fallbackImsis = items
                .map(d => String(d.imsi ?? d.Imsi ?? d.imei ?? d.Imei ?? d.imeI_Name ?? d.IMEI_Name ?? "").trim())
                .filter(Boolean)
            if (fallbackImsis.length > 0) {
                return Array.from(new Set(fallbackImsis))
            }
        }

        return []
    } catch (error) {
        console.error("Error fetching IMSI list:", error)
        return []
    }
}

