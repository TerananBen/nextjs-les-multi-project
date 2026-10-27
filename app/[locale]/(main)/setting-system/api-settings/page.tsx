import { getTranslations } from "next-intl/server"
import { ApiSettingsClient } from "@/components/cores/setting-system/api-settings/client"
import { getApiMenuSettingsAction } from "@/app/actions/api-settings"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params
    const t = await getTranslations({ locale, namespace: "Sidebar" })
    return {
        title: t("menu.apiSettings"),
    }
}

export default async function Page() {
    const initialData = await getApiMenuSettingsAction()

    return (
        <div className="flex flex-1 flex-col gap-3 p-3 md:p-3">
            <ApiSettingsClient initialData={initialData} />
        </div>
    )
}
