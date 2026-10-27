import { getTranslations } from "next-intl/server"
import { PageUnavailable } from "@/components/common/page-unavailable"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params
    const t = await getTranslations({ locale, namespace: "Sidebar" })
    return {
        title: t("menu.mapDisconnect"),
    }
}

export default function MapDisconnectPage() {
    return (
        <div className="flex flex-1 flex-col gap-4 p-4 md:gap-3 md:p-3">
            <PageUnavailable />
        </div>
    )
}
