import { getPersonalList } from "@/app/actions/personal"
import { getProjectsList } from "@/app/actions/project-management"
import { getKeycloakRolesAction, getRealmRolesAction } from "@/app/actions/menu-settings"
import { getCurrentUser } from "@/app/actions/auth"
import { getProjectId } from "@/lib/project"
import { PersonalClient } from "@/components/cores/setting-system/personal/client"
import { getTranslations } from "next-intl/server"
import type { KeycloakRoleItem } from "@/types/menu-settings"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params
    const t = await getTranslations({ locale, namespace: "Sidebar" })
    return {
        title: t("menu.personal"),
    }
}

export default async function PersonalPage() {
    const [currentUser, currentProjectId] = await Promise.all([
        getCurrentUser(),
        getProjectId(),
    ])

    const roleStr = (currentUser?.userRole || "").toLowerCase()
    const isSuperAdmin =
        roleStr.includes("superadmin") ||
        roleStr.includes("super_admin") ||
        roleStr.includes("super-admin")

    const [data, projectList, realmRoles] = await Promise.all([
        getPersonalList(isSuperAdmin ? "ALL" : currentProjectId),
        getProjectsList(),
        getRealmRolesAction(),
    ])
    const rawPersonalList = data?.dataReturn || []
    const superAdminRole = realmRoles.find(
        (r) => (r.name || "").toLowerCase().includes("superadmin") || (r.code || "").toLowerCase().includes("superadmin")
    )
    const personalList = isSuperAdmin
        ? rawPersonalList
        : rawPersonalList.filter((u) => {
            const rName = (u.roleName || "").toLowerCase()
            return (
                !rName.includes("superadmin") &&
                !rName.includes("super_admin") &&
                !rName.includes("super-admin") &&
                (!superAdminRole?.id || u.roles_id !== superAdminRole.id)
            )
        })
    const roleList = (data?.roleList || []).filter((item) => {
        if (isSuperAdmin) return true
        const name = Object.values(item)[0] || ""
        return !name.toLowerCase().includes("superadmin")
    })

    const rolesByProject: Record<string, KeycloakRoleItem[]> = {}
    await Promise.all(
        projectList.map(async (p) => {
            const targetParam = p.uuid || (p.code ? p.code.replace(/_/g, "-") : undefined) || p.id
            const r = await getKeycloakRolesAction(targetParam)
            const filtered = isSuperAdmin
                ? r
                : r.filter((role) => !role.name.toLowerCase().includes("superadmin"))
            rolesByProject[p.id] = filtered
            rolesByProject[p.id.toLowerCase()] = filtered
            rolesByProject[p.id.replace(/-/g, "_")] = filtered
            if (p.uuid) {
                rolesByProject[p.uuid] = filtered
                rolesByProject[p.uuid.toLowerCase()] = filtered
            }
            if (p.code) {
                rolesByProject[p.code] = filtered
                rolesByProject[p.code.toLowerCase()] = filtered
                rolesByProject[p.code.replace(/_/g, "-").toLowerCase()] = filtered
            }
        })
    )

    const filteredRealmRoles = isSuperAdmin
        ? realmRoles
        : realmRoles.filter((r) => !r.name.toLowerCase().includes("superadmin"))

    return (
        <div className="flex flex-1 flex-col gap-3 p-3 md:p-3">
            <PersonalClient
                initialData={personalList}
                roles={roleList}
                rolesByProject={rolesByProject}
                realmRoles={filteredRealmRoles}
                projects={projectList}
                isSuperAdmin={isSuperAdmin}
                currentProjectId={currentProjectId}
            />
        </div>
    )
}
