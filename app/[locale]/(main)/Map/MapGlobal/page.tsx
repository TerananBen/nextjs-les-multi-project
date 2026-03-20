import MapGlobalClient from "./client"
import { getTranslations } from "next-intl/server"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params
    const t = await getTranslations({ locale, namespace: "Sidebar" })
    return {
        title: t("menu.mapGlobal"),
    }
}

const mapMode = process.env.MAP_MODE || "offline"
const mapOfflineUrl = process.env.MAP_OFFLINE_URL || ""
const defaultLat = process.env.MAP_DEFAULT_LAT || "13.736717"
const defaultLng = process.env.MAP_DEFAULT_LNG || "100.523186"
const defaultZoom = process.env.MAP_DEFAULT_ZOOM || "14"
const iconScale = process.env.MAP_ICON_SCALE || "1"
const googleMapsApiKey = process.env.GOOGLE_MAPS_KEY || ""

export default function MapGlobalPage() {

    return (
        <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
            <MapGlobalClient googleMapsApiKey={googleMapsApiKey} mapMode={mapMode as "offline" | "online"} mapOfflineUrl={mapOfflineUrl} defaultLat={defaultLat} defaultLng={defaultLng} defaultZoom={defaultZoom} iconScale={iconScale} />
        </div>
    )
}
