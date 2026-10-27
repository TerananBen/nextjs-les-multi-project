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
    const personalList = isSuperAdmin
        ? rawPersonalList
        : rawPersonalList.filter((u) => {
            const rName = (u.roleName || "").toLowerCase()
            return (
                !rName.includes("superadmin") &&
                !rName.includes("super_admin") &&
                !rName.includes("super-admin") &&
                u.roles_id !== "855125b5-a3ea-48aa-a9e7-7e5abbecfaca"
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
            const r = await getKeycloakRolesAction(p.id)
            const filtered = isSuperAdmin
                ? r
                : r.filter((role) => !role.name.toLowerCase().includes("superadmin"))
            rolesByProject[p.id] = filtered
            if (p.uuid) rolesByProject[p.uuid] = filtered
            if (p.code) rolesByProject[p.code.toLowerCase()] = filtered
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
