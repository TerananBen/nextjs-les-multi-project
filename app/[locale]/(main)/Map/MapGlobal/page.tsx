import { Metadata } from "next"
import MapGlobalClient from "./client"
import { getTranslations } from "next-intl/server"

export async function generateMetadata(props: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const params = await props.params;
    const { locale } = params;
    const t = await getTranslations({ locale, namespace: "MapGlobal" })
    return {
        title: t("title"),
        description: t("description"),
    }
}

export default function MapGlobalPage() {

    return (
        <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
            <MapGlobalClient />
        </div>
    )
}
