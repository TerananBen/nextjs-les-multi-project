import { getKeycloakRolesAction } from "@/app/actions/menu-settings"
import { getCurrentUser } from "@/app/actions/auth"
import { PermissionsClient } from "@/components/cores/setting-system/permission/client"
import { isSuperAdminRole } from "@/lib/role-hierarchy"
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

  const currentUserRole = currentUser?.userRole || ""
  const isSuperAdmin = isSuperAdminRole(currentUserRole)

  const filteredRoles = isSuperAdmin
    ? initialRoles
    : initialRoles.filter((r) => !isSuperAdminRole(r))

  return (
    <div className="flex flex-1 flex-col gap-3 p-3 md:p-3">
      <PermissionsClient
        initialRoles={filteredRoles}
        isSuperAdmin={isSuperAdmin}
        currentUserRole={currentUserRole}
      />
    </div>
  )
}
