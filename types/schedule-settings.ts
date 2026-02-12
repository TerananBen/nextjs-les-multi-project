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
    list_group_name_code: string; // JSON string of "GroupName$GroupCode"
    list_scenes_light: string; // JSON string of Scene list
    type_schedule: string;
    type_set: string; // "group", "all", "delete"
    list_days: string; // JSON string of days array
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
    group_name: string[];
    last_update: string;
    time_create: string;
    status: string;
}

export interface ResendPayload {
    imsi: string;
    mode: string;
    last_update: string;
    wait_time?: string;
}

