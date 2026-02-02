"use strict";
"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getAuthorizedMenu, MenuItem } from '@/app/actions/auth';

interface PermissionContextType {
    permissions: MenuItem[];
    isLoading: boolean;
    getPermission: (menuName: string) => {
        readable: boolean;
        writable: boolean; // Note: auth.ts uses 'writable', check if API returns 'writeable'
        control: boolean;
    };
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

export function PermissionProvider({
    children,
    initialPermissions = []
}: {
    children: ReactNode;
    initialPermissions?: MenuItem[];
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

    const getPermission = (menuName: string) => {
        // Find permission item for the given menuName (e.g. "V_StreetLight")
        // The menu_name in API might be the key?
        // Wait, the API returns `menu_name` like "V_StreetLight"? Or is `menu_name` the label?
        // Looking at `messages/th.json` keys: `txt_list_name_V_StreetLight`.
        // Usually systems map by ID or a unique Code.
        // Let's assume `menu_name` or `menu_id` corresponds to the view ID.
        // Based on `menu-settings.ts` earlier, `menu_name` was used as accessor.

        // Safety check for empty permissions
        if (!permissions.length) {
            return { readable: false, writable: false, control: false };
        }

        const item = permissions.find(p => p.menu_name === menuName);

        if (!item) {
            // If not found, default to false or handle as needed
            return { readable: false, writable: false, control: false };
        }

        return {
            readable: item.readable === "1",
            writable: item.writable === "1", // auth.ts defines it as 'writable'
            control: item.control === "1"
        };
    };

    return (
        <PermissionContext.Provider value={{ permissions, isLoading, getPermission }}>
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
