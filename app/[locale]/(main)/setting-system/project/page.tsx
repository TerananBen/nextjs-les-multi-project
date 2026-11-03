import { getProjectsList } from "@/app/actions/project-management"
import { ProjectClient } from "@/components/cores/setting-system/project/client"
import { getTranslations } from "next-intl/server"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params
    const t = await getTranslations({ locale, namespace: "Sidebar" })
    return {
        title: t("menu.projectSettings"),
    }
}

export default async function ProjectSettingsPage() {
    const projectList = await getProjectsList()

    return (
        <div className="flex flex-1 flex-col gap-3 p-3 md:p-3">
            <ProjectClient initialData={projectList} />
        </div>
    )
}
