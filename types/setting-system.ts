export interface AlertSetting {
    name: string;
    value: string;
    check_box: string; // "0" or "1"
    last_update: string;
    type: string;
}

export interface GetDataAlertStreetLightResponse {
    result: boolean;
    apiName: string;
    dateTime: string;
    dataReturn: AlertSetting[];
}

export interface SettingAlertStreetLightResponse {
    result: boolean;
    apiName: string;
    dateTime: string;
    dataReturn: boolean;
}
