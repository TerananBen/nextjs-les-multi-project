import { getTranslations } from "next-intl/server"
import { MenuSettingsClient } from "@/components/cores/setting-system/menu-settings/client"
import { getKeycloakRolesAction } from "@/app/actions/menu-settings"
import { getCurrentUser } from "@/app/actions/auth"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params
    const t = await getTranslations({ locale, namespace: "Sidebar" })
    return {
        title: t("menu.menuSettings"),
    }
}

export default async function Page() {
    const [initialRoles, currentUser] = await Promise.all([
        getKeycloakRolesAction(),
        getCurrentUser(),
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
                !code.includes("super-admin") &&
                r.id !== "855125b5-a3ea-48aa-a9e7-7e5abbecfaca"
            )
        })

    return (
        <div className="flex flex-1 flex-col gap-3 p-3 md:p-3">
            <MenuSettingsClient initialRoles={filteredRoles} isSuperAdmin={isSuperAdmin} />
        </div>
    )
}
