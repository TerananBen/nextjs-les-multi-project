import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
    SidebarInset,
    SidebarProvider,
} from "@/components/ui/sidebar"
import { getAuthorizedMenu, getCurrentUser } from "@/app/actions/auth"
import { PermissionProvider } from "@/components/providers/permission-provider"

export default async function MainLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const menuItems = await getAuthorizedMenu()
    const user = await getCurrentUser()

    const sidebarUser = {
        name: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : (user?.userName || "User"),
        email: user?.userName || "", // We use username as distinct identifier for now if email is missing
        role: user?.userRole,
        avatar: "/avatars/shadcn.jpg", // Default avatar
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
            <AppSidebar variant="inset" menuItems={menuItems} user={sidebarUser} />
            <PermissionProvider initialPermissions={menuItems}>
                <SidebarInset>
                    <SiteHeader />
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
