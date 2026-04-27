import { getTranslations } from "next-intl/server"
import { MenuSettingsClient } from "./client"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params
    const t = await getTranslations({ locale, namespace: "Sidebar" })
    return {
        title: t("menu.menuSettings"),
    }
}

export default function Page() {
    return (
        <div className="flex flex-1 flex-col gap-4 p-4 md:gap-3 md:p-3">
            <MenuSettingsClient />
        </div>
    )
}
