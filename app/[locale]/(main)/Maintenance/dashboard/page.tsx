import { getListDataOperatorAndAdmin } from "@/app/actions/maintenance"
import MaintenanceDashboardClient from "@/components/cores/maintenance/dashboard/client"
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
    const defaultLat = process.env.MAP_DEFAULT_LAT || "13.736717"
    const defaultLng = process.env.MAP_DEFAULT_LNG || "100.523186"
    const defaultZoom = process.env.MAP_DEFAULT_ZOOM || "14"
    const iconScale = process.env.MAP_ICON_SCALE || "1"
    const mapMode = (process.env.MAP_MODE || "online") as "offline" | "online"
    const mapOfflineUrl = process.env.MAP_OFFLINE_URL || ""
    const googleMapsApiKey = process.env.GOOGLE_MAPS_KEY || ""

    return (
        <div className="flex flex-1 flex-col gap-4 p-4 md:gap-3 md:p-3 min-h-[calc(100vh-4rem)]">
            <MaintenanceDashboardClient
                initialUsersData={usersData}
                defaultLat={defaultLat}
                defaultLng={defaultLng}
                defaultZoom={defaultZoom}
                iconScale={iconScale}
                mapMode={mapMode}
                mapOfflineUrl={mapOfflineUrl}
                googleMapsApiKey={googleMapsApiKey}
            />
        </div>
    )
}
