import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
    SidebarInset,
    SidebarProvider,
} from "@/components/ui/sidebar"
import { getAuthorizedMenu } from "@/app/actions/auth"
import { PermissionProvider } from "@/components/providers/permission-provider"

export default async function MainLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const menuItems = await getAuthorizedMenu()

    return (
        <SidebarProvider
            style={
                {
                    "--sidebar-width": "calc(var(--spacing) * 72)",
                    "--header-height": "calc(var(--spacing) * 12)",
                } as React.CSSProperties
            }
        >
            <AppSidebar variant="inset" menuItems={menuItems} />
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
