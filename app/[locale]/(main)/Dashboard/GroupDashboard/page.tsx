import { getListDataGroupAll } from "@/app/actions/dashboard"
import { GroupDashboardClient } from "./client"
import { getTranslations } from "next-intl/server"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params
    const t = await getTranslations({ locale, namespace: "Sidebar" })
    return {
        title: t("menu.groupDashboard"),
    }
}

export default async function Page() {
    const groups = await getListDataGroupAll()
    const defaultGroupCode = process.env.GROUP_CODE_All_PROJECT

    return (
        <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
            <GroupDashboardClient groups={groups} defaultGroupCode={defaultGroupCode} />
        </div>
    )
}
