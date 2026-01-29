export interface DeviceGroup {
    groupCode: string;
    groupName: string;
}

export interface GetListDataGroupResponse {
    result: boolean;
    apiName: string;
    dateTime: string;
    dataReturn: DeviceGroup[];
}

export interface StreetLightDevice {
    imeI_Name: string;
    streetLightName: string;
    streetLightSerial: string;
    streetLightStatus: string;
    streetLightGroups: string[];
    streetLightCommand: string[];
    streetLightLastUpdate: string;
    lastUpdate: string | null;
    lastPower: string;
    latitude: string | null;
    longitude: string | null;
    gatewayId: string;
    lifeTime: number;
    typeSchedule: string;
    usingSensor: boolean;
}

export interface SearchStreetLightResponse {
    result: boolean;
    apiName: string;
    dateTime: string;
    dataReturn: StreetLightDevice[];
}
