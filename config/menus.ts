export interface SystemMenuDefinition {
    menu_id: string
    menu_name: string
    readable?: string
    writable?: string
    control?: string
    api_version?: number
}

export interface NavigationMenuItem {
    menu_id: string
    menu_name: string
    label: string
    path: string
    readable: string
    writable?: string
    control: string
    api_version?: number
}

/**
 * Standard 17 system menus used across permissions matrix and API settings.
 */
export const DEFAULT_SYSTEM_MENUS: SystemMenuDefinition[] = [
    { menu_id: "1", menu_name: "dashboard_group", readable: "1", writable: "1", control: "1", api_version: 1 },
    { menu_id: "2", menu_name: "dashboard_overview", readable: "1", writable: "1", control: "1", api_version: 1 },
    { menu_id: "3", menu_name: "control_streetlight", readable: "1", writable: "1", control: "1", api_version: 1 },
    { menu_id: "4", menu_name: "control_group", readable: "1", writable: "1", control: "1", api_version: 1 },
    { menu_id: "5", menu_name: "control_schedule", readable: "1", writable: "1", control: "1", api_version: 1 },
    { menu_id: "6", menu_name: "map_disconnect", readable: "1", writable: "1", control: "1", api_version: 1 },
    { menu_id: "7", menu_name: "map_global", readable: "1", writable: "1", control: "1", api_version: 1 },
    { menu_id: "8", menu_name: "map_changelamp", readable: "1", writable: "1", control: "1", api_version: 1 },
    { menu_id: "9", menu_name: "maintenance_dashboard", readable: "1", writable: "1", control: "1", api_version: 1 },
    { menu_id: "10", menu_name: "maintenance_request", readable: "1", writable: "1", control: "1", api_version: 1 },
    { menu_id: "11", menu_name: "maintenance_list", readable: "1", writable: "1", control: "1", api_version: 1 },
    { menu_id: "12", menu_name: "system_menu_permission", readable: "1", writable: "1", control: "1", api_version: 1 },
    { menu_id: "13", menu_name: "system_api_setting", readable: "1", writable: "1", control: "1", api_version: 1 },
    { menu_id: "14", menu_name: "system_project", readable: "1", writable: "1", control: "1", api_version: 1 },
    { menu_id: "15", menu_name: "system_alert", readable: "1", writable: "1", control: "1", api_version: 1 },
    { menu_id: "16", menu_name: "system_personal", readable: "1", writable: "1", control: "1", api_version: 1 },
    { menu_id: "17", menu_name: "system_device", readable: "1", writable: "1", control: "1", api_version: 1 },
]

/**
 * SuperAdmin full navigation menus fallback when permissions API is unavailable.
 */
export const SUPERADMIN_FULL_MENUS: NavigationMenuItem[] = [
    { menu_id: "1", menu_name: "dashboard_group", label: "Dashboard", path: "/dashboard", readable: "1", writable: "1", control: "1", api_version: 1 },
    { menu_id: "2", menu_name: "smart_pole", label: "Smart Pole", path: "/smart-pole", readable: "1", writable: "1", control: "1", api_version: 1 },
    { menu_id: "3", menu_name: "street_light", label: "Street Light", path: "/street-light", readable: "1", writable: "1", control: "1", api_version: 1 },
    { menu_id: "4", menu_name: "building_light", label: "Building Light", path: "/building-light", readable: "1", writable: "1", control: "1", api_version: 1 },
    { menu_id: "5", menu_name: "solar_cell", label: "Solar Cell", path: "/solar-cell", readable: "1", writable: "1", control: "1", api_version: 1 },
    { menu_id: "6", menu_name: "cctv", label: "CCTV", path: "/cctv", readable: "1", writable: "1", control: "1", api_version: 1 },
    { menu_id: "7", menu_name: "emergency_call", label: "Emergency Call", path: "/emergency-call", readable: "1", writable: "1", control: "1", api_version: 1 },
    { menu_id: "8", menu_name: "schedule", label: "Schedule", path: "/schedule", readable: "1", writable: "1", control: "1", api_version: 1 },
    { menu_id: "9", menu_name: "history", label: "History", path: "/history", readable: "1", writable: "1", control: "1", api_version: 1 },
    { menu_id: "10", menu_name: "report", label: "Report", path: "/report", readable: "1", writable: "1", control: "1", api_version: 1 },
    { menu_id: "11", menu_name: "alarm", label: "Alarm", path: "/alarm", readable: "1", writable: "1", control: "1", api_version: 1 },
    { menu_id: "12", menu_name: "map", label: "Map", path: "/map", readable: "1", writable: "1", control: "1", api_version: 1 },
    { menu_id: "13", menu_name: "setting_group", label: "Device Setting", path: "/setting-device", readable: "1", writable: "1", control: "1", api_version: 1 },
    { menu_id: "14", menu_name: "maintenance_group", label: "Maintenance", path: "/maintenance", readable: "1", writable: "1", control: "1", api_version: 1 },
    { menu_id: "15", menu_name: "user_management", label: "User Management", path: "/user-management", readable: "1", writable: "1", control: "1", api_version: 1 },
    { menu_id: "16", menu_name: "setting_system", label: "Setting System", path: "/setting-system", readable: "1", writable: "1", control: "1", api_version: 1 },
    { menu_id: "17", menu_name: "system_api_setting", label: "API Settings", path: "/setting-system/api-settings", readable: "1", writable: "1", control: "1", api_version: 1 },
    { menu_id: "18", menu_name: "system_project", label: "Project Settings", path: "/setting-system/menu-superadmin", readable: "1", writable: "1", control: "1", api_version: 1 },
    { menu_id: "19", menu_name: "system_menu_superadmin", label: "SuperAdmin Settings", path: "/setting-system/menu-superadmin", readable: "1", writable: "1", control: "1", api_version: 1 },
]
