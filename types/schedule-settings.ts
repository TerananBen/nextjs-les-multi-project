export interface Scene {
    time?: string | null;
    dim?: string | null;
    open_volt?: string | null;
    open_time?: string | null;
    close_volt?: string | null;
    close_time?: string | null;
}

export interface ScheduleItem {
    scheduleName: string;
    dataGroupName: string[];
    dataGroupCode: string[];
    listScenes: Scene[];
    listDays: string[];
    groupCode: string;
    GROUP_CODE?: string;
    group_code?: string;
    code_name?: string;
    typeSchedule: "time" | "light" | "manual" | string;
}

export interface ScheduleResponse {
    result: boolean;
    apiName: string;
    dateTime: string;
    dataReturn: ScheduleItem[];
}

export interface ScheduleSaveRequest {
    name_schedule: string;
    code_name: string; // "new" or existing code (Edit)
    list_group_name_code: string[] | string;
    list_scenes_light: unknown[] | Record<string, unknown> | string;
    type_schedule: string;
    type_set: string; // "group", "all", "delete"
    list_days: string[] | string;
    version_light_sensor: string;
}

export interface ScheduleSaveResponse {
    result: boolean;
    apiName: string;
    dateTime: string;
    dataReturn: boolean;
}

export interface ScheduleResponseItem {
    imsi: string;
    SN?: string;
    group_name: string[] | string;
    last_update: string;
    time_create: string;
    status: string;
}

export interface ResendPayload {
    code_name?: string;
    imsi: string;
    last_update: string;
    mode: string;
    wait_time?: number | string;
}
