"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getAuthorizedMenu, MenuItem } from '@/app/actions/auth';

interface PermissionContextType {
    permissions: MenuItem[];
    isLoading: boolean;
    getPermission: (menuName: string) => {
        readable: boolean;
        writable: boolean;
        control: boolean;
    };
    getApiVersion: (menuName: string) => number;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

export function PermissionProvider({
    children,
    initialPermissions = [],
    isSuperAdmin = false,
}: {
    children: ReactNode;
    initialPermissions?: MenuItem[];
    isSuperAdmin?: boolean;
}) {
    const [permissions, setPermissions] = useState<MenuItem[]>(initialPermissions);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (initialPermissions.length > 0) {
            setPermissions(initialPermissions);
        } else {
            // Fallback fetch if needed, though usually handled by layout
            const fetchPermissions = async () => {
                setIsLoading(true);
                try {
                    const data = await getAuthorizedMenu();
                    setPermissions(data || []);
                } catch (error) {
                    console.error("Failed to load permissions", error);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchPermissions();
        }
    }, [initialPermissions]);

const MENU_ALIASES: Record<string, string> = {
    "V_GroupDashboard": "dashboard_group",
    "V_Dashboard": "dashboard_overview",
    "V_StreetLight": "control_streetlight",
    "V_GroupConfig": "control_group",
    "V_SettingSchedule": "control_schedule",
    "V_MapGlobal": "map_global",
    "V_MapDisconnect": "map_disconnect",
    "V_MapChangeLamp": "map_changelamp",
    "V_MaintenanceDashboard": "maintenance_dashboard",
    "V_MaintenanceConfig": "maintenance_request",
    "V_MaintenanceDetail": "maintenance_list",
    "V_ProjectSetting": "system_project",
    "V_Personal": "system_personal",
    "V_AlertStreetLight": "system_alert",
    "V_SettingMenu": "system_menu_permission",
    "V_SettingApi": "system_api_setting",
    "V_SettingDevice": "system_device",
    "dashboard_group": "V_GroupDashboard",
    "dashboard_overview": "V_Dashboard",
    "control_streetlight": "V_StreetLight",
    "control_group": "V_GroupConfig",
    "control_schedule": "V_SettingSchedule",
    "map_global": "V_MapGlobal",
    "map_disconnect": "V_MapDisconnect",
    "map_changelamp": "V_MapChangeLamp",
    "maintenance_dashboard": "V_MaintenanceDashboard",
    "maintenance_request": "V_MaintenanceConfig",
    "maintenance_list": "V_MaintenanceDetail",
    "system_project": "V_ProjectSetting",
    "system_personal": "V_Personal",
    "system_alert": "V_AlertStreetLight",
    "system_menu_permission": "V_SettingMenu",
    "system_api_setting": "V_SettingApi",
    "system_device": "V_SettingDevice",
};

    const getPermission = (menuName: string) => {
        if (isSuperAdmin) {
            return { readable: true, writable: true, control: true };
        }

        if (!permissions.length) {
            return { readable: false, writable: false, control: false };
        }

        const alias = MENU_ALIASES[menuName];
        const item = permissions.find(p => p.menu_name === menuName || (alias && p.menu_name === alias));

        if (!item) {
            return { readable: false, writable: false, control: false };
        }

        const isReadable = item.readable === "1" || String(item.readable) === "1";
        const isWritable = item.writable === "1" || String(item.writable) === "1";
        const isControl = item.control === "1" || String(item.control) === "1";

        return {
            readable: isReadable,
            writable: isWritable,
            control: isControl
        };
    };

    const getApiVersion = (menuName: string): number => {
        if (!permissions.length) {
            return 1;
        }

        const alias = MENU_ALIASES[menuName];
        const item = permissions.find(p => p.menu_name === menuName || (alias && p.menu_name === alias));

        return item?.api_version ?? 1;
    };

    return (
        <PermissionContext.Provider value={{ permissions, isLoading, getPermission, getApiVersion }}>
            {children}
        </PermissionContext.Provider>
    );
}

export function usePermission() {
    const context = useContext(PermissionContext);
    if (context === undefined) {
        throw new Error('usePermission must be used within a PermissionProvider');
    }
    return context;
}
