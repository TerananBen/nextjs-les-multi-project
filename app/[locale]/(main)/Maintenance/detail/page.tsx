import { getDataListMaintenanceDetail } from "@/app/actions/maintenance"
import { MaintenanceDetailClient } from "@/components/cores/maintenance/detail/client"
import { getTranslations } from "next-intl/server"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params
    const t = await getTranslations({ locale, namespace: "Sidebar" })
    return {
        title: t("menu.maintenanceDetail"),
    }
}
export default async function MaintenanceDetailPage() {
    const data = await getDataListMaintenanceDetail()
    const defaultLat = process.env.MAP_DEFAULT_LAT || "13.736717"
    const defaultLng = process.env.MAP_DEFAULT_LNG || "100.523186"
    const defaultZoom = process.env.MAP_DEFAULT_ZOOM || "14"
    const iconScale = process.env.MAP_ICON_SCALE || "1"
    const mapMode = process.env.MAP_MODE || "online"
    const mapOfflineUrl = process.env.MAP_OFFLINE_URL || ""
    const googleMapsApiKey = process.env.GOOGLE_MAPS_KEY || ""

    return (
        <div className="flex flex-1 flex-col gap-4 p-4 md:gap-3 md:p-3">
            <MaintenanceDetailClient defaultLat={defaultLat} defaultLng={defaultLng} defaultZoom={defaultZoom} iconScale={iconScale} mapMode={mapMode as "offline" | "online"} mapOfflineUrl={mapOfflineUrl} googleMapsApiKey={googleMapsApiKey} initialData={data || []} />
        </div>
    )
}
