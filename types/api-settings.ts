export interface ApiMenuSetting {
    menu_id: string;
    menu_name: string;
    api_version: number;
    is_configured?: boolean;
}

export interface GetApiSettingsResponse {
    result: boolean;
    dataReturn: ApiMenuSetting[];
}

export interface SaveApiSettingResponse {
    result: boolean;
    message?: string;
}
