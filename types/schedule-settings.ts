export interface Scene {
    time: string | null;
    dim: string | null;
    open_volt: string | null;
    open_time: string | null;
    close_volt: string | null;
    close_time: string | null;
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
