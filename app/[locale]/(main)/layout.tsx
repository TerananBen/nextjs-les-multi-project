import { AppSidebar } from "@/components/layout/app-sidebar"
import { SiteHeader } from "@/components/layout/site-header"
import {
    SidebarInset,
    SidebarProvider,
} from "@/components/ui/sidebar"
import { getAuthorizedMenu, getCurrentUser } from "@/app/actions/auth"
import { PermissionProvider } from "@/components/providers/permission-provider"
import { getProjectConfig, getUserProjectIds } from "@/lib/project"
import { getProjectById } from "@/config/projects"
import { getProjectsList } from "@/app/actions/project-management"
import { TokenRefresher } from "@/components/common/token-refresher"

export default async function MainLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const menuItems = await getAuthorizedMenu()
    const user = await getCurrentUser()
    const projectConfig = await getProjectConfig()
    const userProjectIds = await getUserProjectIds()

    const isSuperAdmin = Boolean(
        user?.userRole &&
        (user.userRole.toLowerCase().includes("superadmin") ||
         user.userRole.toLowerCase().includes("super_admin") ||
         user.userRole.toLowerCase().includes("super-admin"))
    )

    const allProjects = await getProjectsList()
    const allProjectsMap = new Map<string, typeof allProjects[0]>()
    allProjects.forEach((p) => {
        allProjectsMap.set(p.id, p)
        allProjectsMap.set(p.id.toLowerCase(), p)
        if (p.uuid) {
            allProjectsMap.set(p.uuid, p)
            allProjectsMap.set(p.uuid.toLowerCase(), p)
        }
        if (p.code) {
            allProjectsMap.set(p.code, p)
            allProjectsMap.set(p.code.toLowerCase(), p)
        }
    })

    const projectList = (isSuperAdmin && allProjects.length > 0)
        ? allProjects.map((p) => ({
            id: p.id,
            code: p.code || p.id,
            name: p.name || p.code || p.id,
        }))
        : userProjectIds.map((id) => {
            const cleanId = id.toLowerCase()
            const conf = allProjectsMap.get(id) || allProjectsMap.get(cleanId) || getProjectById(id)
            const code = conf?.code || id
            return {
                id,
                code,
                name: conf?.name || id,
            }
        })

    const sidebarUser = {
        name: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : (user?.userName || "User"),
        email: user?.userName || "",
        role: user?.userRole,
        avatar: "/avatars/user-avatar.svg",
    }

    return (
        <SidebarProvider
            style={
                {
                    "--sidebar-width": "calc(var(--spacing) * 72)",
                    "--header-height": "calc(var(--spacing) * 12)",
                } as React.CSSProperties
            }
        >
            <TokenRefresher />
            <AppSidebar variant="inset" menuItems={menuItems} user={sidebarUser} sidebarLogo={projectConfig.logo} />
            <PermissionProvider initialPermissions={menuItems} isSuperAdmin={isSuperAdmin}>
                <SidebarInset>
                    <SiteHeader currentProjectId={projectConfig.code || projectConfig.id} projects={projectList} />
                    <div className="flex flex-1 flex-col">
                        <div className="@container/main flex flex-1 flex-col gap-2">
                            {children}
                        </div>
                    </div>
                </SidebarInset>
            </PermissionProvider>
        </SidebarProvider>
    )
}
