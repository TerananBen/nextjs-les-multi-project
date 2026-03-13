import { getListDataOperatorAndAdmin } from "@/app/actions/maintenance"
import MaintenanceDashboardClient from "./client"
import { getTranslations } from "next-intl/server"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params
    const t = await getTranslations({ locale, namespace: "Sidebar" })
    return {
        title: t("menu.maintenanceDashboard"),
    }
}
export default async function Page() {
    const usersData = await getListDataOperatorAndAdmin()

    return (
        <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
            <MaintenanceDashboardClient
                initialUsersData={usersData}
            />
        </div>

    )
}
