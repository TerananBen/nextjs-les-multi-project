import { getKeycloakRolesAction } from "@/app/actions/menu-settings"
import { getCurrentUser } from "@/app/actions/auth"
import { PermissionsClient } from "@/components/cores/setting-system/permission/client"
import { getTranslations } from "next-intl/server"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params
    const t = await getTranslations({ locale, namespace: "Sidebar" })
    return {
        title: t("menu.permission", { defaultValue: "สิทธิ์การเข้าถึง" }),
    }
}

export default async function PermissionPage() {
    const [currentUser, initialRoles] = await Promise.all([
        getCurrentUser(),
        getKeycloakRolesAction(),
    ])

    const roleStr = (currentUser?.userRole || "").toLowerCase()
    const isSuperAdmin =
        roleStr.includes("superadmin") ||
        roleStr.includes("super_admin") ||
        roleStr.includes("super-admin")

    const filteredRoles = isSuperAdmin
        ? initialRoles
        : initialRoles.filter((r) => {
            const name = (r.name || "").toLowerCase()
            const code = (r.code || "").toLowerCase()
            return (
                !name.includes("superadmin") &&
                !name.includes("super_admin") &&
                !name.includes("super-admin") &&
                !code.includes("superadmin") &&
                !code.includes("super_admin") &&
                !code.includes("super-admin")
            )
        })

    return (
        <div className="flex flex-1 flex-col gap-3 p-3 md:p-3">
            <PermissionsClient
                initialRoles={filteredRoles}
                isSuperAdmin={isSuperAdmin}
            />
        </div>
    )
}
