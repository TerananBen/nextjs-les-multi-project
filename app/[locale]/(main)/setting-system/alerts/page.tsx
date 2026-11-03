import { getTranslations } from "next-intl/server"
import { AlertsClient } from "@/components/cores/setting-system/alerts/client"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params
    const t = await getTranslations({ locale, namespace: "Sidebar" })
    return {
        title: t("menu.alerts"),
    }
}

export default function Page() {

    return (
        <div className="flex flex-1 flex-col gap-2.5 p-2.5 sm:p-3">
            <AlertsClient hiddenConfigAlerts={process.env.HIDDEN_CONFIG_ALERTS || ""} />
        </div>
    )
}
