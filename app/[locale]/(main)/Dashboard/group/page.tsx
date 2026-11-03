import { getListDataGroupAll } from "@/app/actions/dashboard"
import { GroupDashboardClient } from "@/components/cores/dashboard/group/client"
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
    const defaultGroupCode = process.env.GROUP_CODE_ALL_PROJECT
    const startDate = process.env.START_DATE_PROJECT

    return (
        <div className="flex flex-1 flex-col gap-4 p-4 md:gap-3 md:p-3">
            <GroupDashboardClient groups={groups} startDate={startDate} defaultGroupCode={defaultGroupCode} />
        </div>
    )
}
