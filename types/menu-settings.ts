export interface MenuData {
    menu_id: string;
    menu_name: string;
    role_menu_id: string | null;
    role_id: string | null;
    readable: string; // "1" of "0"
    writeable: string; // "1" of "0"
    control: string; // "1" of "0"
    project_id: string | null;
}

export interface GetMenuResponse {
    result: boolean;
    apiName: string;
    dateTime: string;
    dataReturn: MenuData[];
}

export interface SettingMenuResponse {
    result: boolean;
    apiName: string;
    dateTime: string;
    dataReturn: boolean;
}
