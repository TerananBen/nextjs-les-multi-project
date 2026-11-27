import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { getCurrentUser } from "@/app/actions/auth"
import { getProjectsList } from "@/app/actions/project-management"
import { getPipelineSchedules, getPipelineProjects } from "@/app/actions/pipeline-schedule"
import { getApiMenuSettingsAction } from "@/app/actions/api-settings"
import { getActiveProjectCode } from "@/lib/project"
import { MenuSuperadminClient } from "@/components/cores/setting-system/menu-superadmin/client"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params
    const t = await getTranslations({ locale, namespace: "Sidebar" })
    return {
        title: t("menu.superadmin", { defaultValue: "SuperAdmin Settings" }),
    }
}

export default async function MenuSuperadminPage() {
    const currentUser = await getCurrentUser()
    const roleStr = (currentUser?.userRole || "").toLowerCase()
    const isSuperAdmin =
        roleStr.includes("superadmin") ||
        roleStr.includes("super_admin") ||
        roleStr.includes("super-admin")

    // Role superadmin restriction
    if (!isSuperAdmin) {
        redirect("/dashboard/group")
    }

    const activeProject = await getActiveProjectCode()
    const [projects, initialSchedules, initialPipelineProjects, apiSettings] = await Promise.all([
        getProjectsList(),
        getPipelineSchedules(),
        getPipelineProjects("ALL"),
        getApiMenuSettingsAction(activeProject),
    ])

    const schedulesWithProjects = initialSchedules.map((s) => ({
        ...s,
        projects: initialPipelineProjects,
    }))

    return (
        <div className="flex flex-1 flex-col gap-3 p-3 md:p-3">
            <MenuSuperadminClient
                initialPipelineData={schedulesWithProjects}
                initialPipelineProjects={initialPipelineProjects}
                projects={projects}
                initialApiSettings={apiSettings}
                initialProjectId={activeProject}
                isSuperAdmin={isSuperAdmin}
            />
        </div>
    )
}
