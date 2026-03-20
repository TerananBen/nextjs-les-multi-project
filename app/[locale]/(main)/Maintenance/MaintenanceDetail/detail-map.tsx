"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { useTranslations } from "next-intl"
import { createRoot } from "react-dom/client"
import { Button } from "@/components/ui/button"
import { Navigation } from "lucide-react"
import { getLeafletIconUrl, getGoogleMapsIconHtml, MarkerColor, MarkerBadge } from "@/lib/map-icons"
import { MaintenanceDetailRecord } from "@/app/actions/maintenance"
import { isValidGPS } from "../../Map/MapGlobal/map-utils"
import { GoogleMap, useJsApiLoader, Marker as GoogleMarker, InfoWindow } from "@react-google-maps/api"
import { Loader2 } from "lucide-react"

function getIconSizeForZoom(zoom: number) {
    const size = 20 + (zoom - 10) * 5
    return Math.max(10, Math.min(size, 80))
}

/** Determine icon color from lamp_case — matches the dashboard legend:
 *  Red  = Power/RTU failure
 *  Yellow = Abnormal voltage
 *  Blue = Network failure
 */
function getMarkerConfig(item: MaintenanceDetailRecord): { color: MarkerColor, badge: MarkerBadge } {
    const lc = (item.lamp_case ?? "").toLowerCase()
    if (lc.includes("voltage") || lc.includes("แรงดัน") || lc.includes("volt")) {
        return { color: "yellow", badge: null }
    }
    if (lc.includes("network") || lc.includes("เครือข่าย") || lc.includes("comm") || lc.includes("disconnect")) {
        return { color: "blue", badge: null }
    }
    // Default: power/RTU failure (red)
    return { color: "red", badge: null }
}

const customIconLeaflet = (color: MarkerColor, badge: MarkerBadge, size: number) => L.divIcon({
    className: "custom-marker-svg",
    html: `<img src="${getLeafletIconUrl(color, badge)}" style="width: ${size}px; height: ${size}px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));" />`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size]
})

interface MarkerPopupProps {
    item: MaintenanceDetailRecord
    t: (key: string, options?: Record<string, string>) => string
}

function MarkerPopup({ item, t }: MarkerPopupProps) {
    const handleNavigate = () => {
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lng}`, "_blank")
    }

    return (
        <div className="font-sans min-w-[220px] text-gray-800 text-sm space-y-3 p-1">
            <div className="space-y-1">
                <p className="font-bold text-base">{item.street_light_name || "-"}</p>
                <p><span className="text-gray-500 font-medium">ID: </span>{item.imsi_befor}</p>
                <p><span className="text-gray-500 font-medium">{t("detail.table.issueReason")}: </span>{item.lamp_case || "-"}</p>
            </div>
            <Button
                variant="default"
                size="sm"
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                onClick={handleNavigate}
            >
                <Navigation className="w-3 h-3 mr-2" />
                {t("detail.navigate", { defaultMessage: "Navigate" })}
            </Button>
        </div>
    )
}

function UseTranslationsProvider({ children }: { children: React.ReactNode }) {
    return <>{children}</>
}

// ─────────────────────────────────────────────
// Leaflet (offline) component
// ─────────────────────────────────────────────
function LeafletMapComponent({
    defaultLat,
    defaultLng,
    defaultZoom,
    iconScale,
    offlineUrl,
    devices,
}: {
    defaultLat: number
    defaultLng: number
    defaultZoom: number
    iconScale: number
    offlineUrl?: string
    devices: MaintenanceDetailRecord[]
}) {
    const t = useTranslations("MaintenanceDashboard")
    const containerRef = useRef<HTMLDivElement>(null)
    const mapInstanceRef = useRef<L.Map | null>(null)
    const markersRef = useRef<L.Marker[]>([])
    const [currentZoom, setCurrentZoom] = useState(defaultZoom)

    // Init map once
    useEffect(() => {
        if (!containerRef.current || mapInstanceRef.current) return

        const DefaultIcon = L.icon({
            iconUrl: "/images/marker-icon.png",
            shadowUrl: "/images/marker-shadow.png",
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        })
        L.Marker.prototype.options.icon = DefaultIcon

        const map = L.map(containerRef.current).setView([defaultLat, defaultLng], defaultZoom)
        L.tileLayer(offlineUrl || "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "&copy; OpenStreetMap contributors",
            maxZoom: 20
        }).addTo(map)

        map.on("zoomend", () => setCurrentZoom(map.getZoom()))
        mapInstanceRef.current = map

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove()
                mapInstanceRef.current = null
            }
        }
    }, [offlineUrl, defaultLat, defaultLng, defaultZoom])

    // Fit bounds when data changes
    const fitBounds = useCallback(() => {
        const map = mapInstanceRef.current
        if (!map || devices.length === 0) return
        const valid = devices.filter(d => isValidGPS(d.lat, d.lng))
        if (valid.length === 0) return
        const bounds = L.latLngBounds(valid.map(d => [parseFloat(d.lat), parseFloat(d.lng)]))
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 })
    }, [devices])

    useEffect(() => { fitBounds() }, [fitBounds])

    // Update markers
    useEffect(() => {
        const map = mapInstanceRef.current
        if (!map) return

        markersRef.current.forEach(m => m.remove())
        markersRef.current = []

        const iconSize = getIconSizeForZoom(currentZoom) * iconScale

        devices.forEach(item => {
            if (!isValidGPS(item.lat, item.lng)) return
            const config = getMarkerConfig(item)
            const icon = customIconLeaflet(config.color, config.badge, iconSize)
            const marker = L.marker([parseFloat(item.lat), parseFloat(item.lng)], { icon }).addTo(map)

            const container = document.createElement("div")
            marker.bindPopup(container, { minWidth: 240 })

            marker.on("popupopen", (e) => {
                const popup = e.popup
                const content = popup.getContent()
                if (content instanceof HTMLElement) {
                    const c = content as HTMLElement & { _reactRoot?: import("react-dom/client").Root }
                    if (!c._reactRoot) c._reactRoot = createRoot(c)
                    c._reactRoot.render(
                        <UseTranslationsProvider>
                            <MarkerPopup item={item} t={t} />
                        </UseTranslationsProvider>
                    )
                    setTimeout(() => { if (popup.isOpen()) popup.update() }, 50)
                }
            })

            marker.on("popupclose", (e) => {
                const popup = e.popup
                const content = popup.getContent()
                if (content instanceof HTMLElement) {
                    const c = content as HTMLElement & { _reactRoot?: import("react-dom/client").Root }
                    if (c._reactRoot) {
                        setTimeout(() => {
                            if (c._reactRoot) { c._reactRoot.unmount(); delete c._reactRoot }
                        }, 100)
                    }
                }
            })

            markersRef.current.push(marker)
        })
    }, [devices, currentZoom, t, defaultLat, defaultLng, defaultZoom, iconScale])

    return <div ref={containerRef} className="h-full w-full" style={{ zIndex: 0 }} />
}

// ─────────────────────────────────────────────
// Google Maps (online) component
// ─────────────────────────────────────────────
const containerStyle = { width: "100%", height: "100%" }

function GoogleMapComponent({ googleMapsApiKey, devices, defaultLat, defaultLng, defaultZoom, iconScale }: { googleMapsApiKey?: string, devices: MaintenanceDetailRecord[], defaultLat: number, defaultLng: number, defaultZoom: number, iconScale: number }) {
    const t = useTranslations("MaintenanceDashboard")
    const { isLoaded } = useJsApiLoader({
        id: "google-map-script",
        googleMapsApiKey: googleMapsApiKey || "",
        language: "th"
    })
    const [map, setMap] = useState<google.maps.Map | null>(null)
    const [zoom, setZoom] = useState(defaultZoom)
    const [selectedDevice, setSelectedDevice] = useState<MaintenanceDetailRecord | null>(null)

    const onLoad = useCallback((m: google.maps.Map) => setMap(m), [])
    const onZoomChanged = useCallback(() => {
        if (!map) return
        const z = map.getZoom()
        if (z) setZoom(z)
    }, [map])
    const onUnmount = useCallback(() => setMap(null), [])

    if (!isLoaded) return <div className="h-full w-full flex items-center justify-center"><Loader2 className="animate-spin" /></div>

    const iconSize = getIconSizeForZoom(zoom) * iconScale

    return (
        <GoogleMap
            mapContainerStyle={containerStyle}
            center={{ lat: defaultLat, lng: defaultLng }}
            zoom={zoom}
            onLoad={onLoad}
            onUnmount={onUnmount}
            onZoomChanged={onZoomChanged}
        >
            {devices.map((device, idx) => {
                if (!isValidGPS(device.lat, device.lng)) return null
                const config = getMarkerConfig(device)
                return (
                    <GoogleMarker
                        key={`${device.imsi_befor}-${idx}`}
                        position={{ lat: parseFloat(device.lat), lng: parseFloat(device.lng) }}
                        icon={{
                            url: getGoogleMapsIconHtml(config.color, config.badge),
                            scaledSize: new window.google.maps.Size(iconSize, iconSize),
                            anchor: new window.google.maps.Point(iconSize / 2, iconSize)
                        }}
                        onClick={() => setSelectedDevice(device)}
                    />
                )
            })}
            {selectedDevice && (
                <InfoWindow
                    position={{ lat: parseFloat(selectedDevice.lat), lng: parseFloat(selectedDevice.lng) }}
                    onCloseClick={() => setSelectedDevice(null)}
                >
                    <MarkerPopup item={selectedDevice} t={t} />
                </InfoWindow>
            )}
        </GoogleMap>
    )
}

// ─────────────────────────────────────────────
// Public export
// ─────────────────────────────────────────────
interface DetailMapProps {
    mapMode?: "online" | "offline" | undefined
    mapOfflineUrl?: string
    defaultLat?: string
    defaultLng?: string
    defaultZoom?: string
    iconScale?: string
    googleMapsApiKey?: string
    data: MaintenanceDetailRecord[]
}

export function DetailMap({ mapMode, mapOfflineUrl, defaultLat, defaultLng, defaultZoom, iconScale, googleMapsApiKey, data }: DetailMapProps) {

    if (mapMode === "online") {
        return (
            <div className="h-full w-full rounded-lg overflow-hidden border relative">
                <GoogleMapComponent googleMapsApiKey={googleMapsApiKey} devices={data} defaultLat={parseFloat(defaultLat || "0")} defaultLng={parseFloat(defaultLng || "0")} defaultZoom={parseFloat(defaultZoom || "13")} iconScale={parseFloat(iconScale || "1")} />
            </div>
        )
    }
    return (
        <div className="h-full w-full rounded-lg overflow-hidden border relative z-0">
            <LeafletMapComponent defaultLat={parseFloat(defaultLat || "0")} defaultLng={parseFloat(defaultLng || "0")} defaultZoom={parseFloat(defaultZoom || "13")} iconScale={parseFloat(iconScale || "1")} offlineUrl={mapOfflineUrl} devices={data} />
        </div>
    )
}
