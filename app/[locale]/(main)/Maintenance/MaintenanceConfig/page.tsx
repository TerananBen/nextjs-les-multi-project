import { getTranslations } from "next-intl/server"
import { MaintenanceConfigClient } from "./client"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params
    const t = await getTranslations({ locale, namespace: "Sidebar" })
    return {
        title: t("menu.maintenanceConfig"),
    }
}

export default function Page() {
    return (
        <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
            <MaintenanceConfigClient />
        </div>
    )
}
