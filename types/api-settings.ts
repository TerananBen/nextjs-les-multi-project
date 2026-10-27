export interface ApiMenuSetting {
    menu_id: string;
    menu_name: string;
    api_version: number;
}

export interface GetApiSettingsResponse {
    result: boolean;
    dataReturn: ApiMenuSetting[];
}

export interface SaveApiSettingResponse {
    result: boolean;
    message?: string;
}
