export interface GroupConfigData {
    group_name: string;
    group_code: string;
    sub_district: string;
    total_rtu: string;
}

export interface GetListDataGroupAllResponse {
    result: boolean;
    apiName: string;
    dateTime: string;
    dataReturn: GroupConfigData[];
}

export interface GroupDetailData {
    project_name: string;
    group_code: string | null;
    group_name: string; // JSON shows escaped string representation of an array, but we'll treat as string for now
    street_light_name: string;
    gov_name: string;
    imsi: string;
    last_update: string;
    time_stamp: string;
    last_power: string;
    power_total: string;
    last_command: string;
    total_rtu: string;
}

export interface GroupDetailWithLocation extends GroupDetailData {
    lat?: string;
    lng?: string;
}

export interface GetListDataGroupDetailResponse {
    result: boolean;
    apiName: string;
    dateTime: string;
    dataReturn: GroupDetailData[];
}

export interface LatLongData {
    id: string;
    imsi: string;
    lat: string;
    lng: string;
    using_sensor: string;
    last_power: string;
    type_schedule: string;
    gateway_id: string | null;
    status: string;
}

export interface GetDataLatLongResponse {
    result: boolean;
    apiName: string;
    dateTime: string;
    dataReturn: LatLongData[];
}

export interface ControlGroupResponse {
    result: boolean;
    apiName: string;
    dateTime: string;
    dataReturn: string;
}

export interface ResendCommandResponse {
    result: boolean;
    apiName: string;
    dateTime: string;
    dataReturn: boolean;
}

export interface LatLongResponseControlData {
    id: string | null;
    imsi: string;
    lat: string;
    lng: string;
    using_sensor: string | null;
    last_power: string | null;
    type_schedule: string | null;
    gateway_id: string;
    status: string; // "0" | "1"
}

export interface GetDataLatLongResponseControlResponse {
    result: boolean;
    apiName: string;
    dateTime: string;
    dataReturn: LatLongResponseControlData[];
}

export interface GetListDataIMSIAllResponse {
    result: boolean;
    apiName: string;
    dateTime: string;
    dataReturn: string[];
}
