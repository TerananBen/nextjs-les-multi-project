"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Folders, ShieldCheck, Code2, ShieldAlert } from "lucide-react"
import { usePermission } from "@/components/providers/permission-provider"

import { ProjectsTab } from "./projects-tab"
import { PermissionsTab } from "./permissions-tab"
import { ApiTab } from "./api-tab"

import type { ProjectConfig } from "@/config/projects/types"
import type { KeycloakRoleItem } from "@/types/menu-settings"
import type { ApiMenuSetting } from "@/types/api-settings"

interface ProjectPermissionsApiClientProps {
    initialProjects: ProjectConfig[]
    initialRoles?: KeycloakRoleItem[]
    initialApiSettings: ApiMenuSetting[]
    isSuperAdmin?: boolean
}

export function ProjectPermissionsApiClient({
    initialProjects = [],
    initialRoles = [],
    initialApiSettings = [],
    isSuperAdmin = false,
}: ProjectPermissionsApiClientProps) {
    const t = useTranslations("ProjectPermissionsApi")
    const { getPermission, permissions } = usePermission()

    const projectPerm = React.useMemo(() => {
        if (!permissions.length) return { readable: true, writable: true, control: true }
        return getPermission("system_project")
    }, [getPermission, permissions])

    const menuPerm = React.useMemo(() => {
        if (!permissions.length) return { readable: true, writable: true, control: true }
        return getPermission("system_menu_permission")
    }, [getPermission, permissions])

    const apiPerm = React.useMemo(() => {
        if (!permissions.length) return { readable: true, writable: true, control: true }
        return getPermission("system_api_setting")
    }, [getPermission, permissions])

    const canReadProject = isSuperAdmin || projectPerm.readable
    const canReadPermissions = isSuperAdmin || menuPerm.readable
    const canReadApi = isSuperAdmin || apiPerm.readable

    const defaultTab = React.useMemo(() => {
        if (canReadProject) return "projects"
        if (canReadPermissions) return "permissions"
        if (canReadApi) return "apiSettings"
        return "projects"
    }, [canReadProject, canReadPermissions, canReadApi])

    const [activeTab, setActiveTab] = React.useState<string>(defaultTab)

    React.useEffect(() => {
        if (activeTab === "projects" && !canReadProject) {
            setActiveTab(canReadPermissions ? "permissions" : canReadApi ? "apiSettings" : "projects")
        } else if (activeTab === "permissions" && !canReadPermissions) {
            setActiveTab(canReadProject ? "projects" : canReadApi ? "apiSettings" : "permissions")
        } else if (activeTab === "apiSettings" && !canReadApi) {
            setActiveTab(canReadProject ? "projects" : canReadPermissions ? "permissions" : "apiSettings")
        }
    }, [activeTab, canReadProject, canReadPermissions, canReadApi])

    if (!canReadProject && !canReadPermissions && !canReadApi) {
        return (
            <div className="flex flex-1 flex-col items-center justify-center min-h-[400px] gap-3 text-muted-foreground">
                <ShieldAlert className="h-12 w-12 text-muted-foreground/60" />
                <p className="text-base font-medium">{t("noAccess")}</p>
            </div>
        )
    }

    return (
        <div className="flex flex-1 flex-col gap-2.5 w-full h-full">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col gap-2.5">
                <div className="flex items-center justify-center w-full">
                    <TabsList className="h-9 p-1 bg-muted/60">
                        {canReadProject && (
                            <TabsTrigger
                                value="projects"
                                className="h-7.5 text-xs sm:text-sm px-4 cursor-pointer gap-2 data-[state=active]:bg-background"
                            >
                                <Folders className="h-4 w-4" />
                                {t("tabs.projects")}
                            </TabsTrigger>
                        )}
                        {canReadPermissions && (
                            <TabsTrigger
                                value="permissions"
                                className="h-7.5 text-xs sm:text-sm px-4 cursor-pointer gap-2 data-[state=active]:bg-background"
                            >
                                <ShieldCheck className="h-4 w-4" />
                                {t("tabs.permissions")}
                            </TabsTrigger>
                        )}
                        {canReadApi && (
                            <TabsTrigger
                                value="apiSettings"
                                className="h-7.5 text-xs sm:text-sm px-4 cursor-pointer gap-2 data-[state=active]:bg-background"
                            >
                                <Code2 className="h-4 w-4" />
                                {t("tabs.apiSettings")}
                            </TabsTrigger>
                        )}
                    </TabsList>
                </div>

                {canReadProject && (
                    <TabsContent value="projects" className="mt-0 flex-1 flex flex-col">
                        <ProjectsTab initialData={initialProjects} />
                    </TabsContent>
                )}

                {canReadPermissions && (
                    <TabsContent value="permissions" className="mt-0 flex-1 flex flex-col">
                        <PermissionsTab
                            initialRoles={initialRoles}
                            isSuperAdmin={isSuperAdmin}
                        />
                    </TabsContent>
                )}

                {canReadApi && (
                    <TabsContent value="apiSettings" className="mt-0 flex-1 flex flex-col">
                        <ApiTab initialData={initialApiSettings} />
                    </TabsContent>
                )}
            </Tabs>
        </div>
    )
}
