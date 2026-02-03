"use client"

import { useEffect, useState, useCallback, useRef } from "react"
// react-leaflet imports kept as legacy reference or if needed by other components, though current impl uses Vanilla L
import { useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { LatLongData } from "@/app/actions/map-actions"
import { GoogleMap, useJsApiLoader, Marker as GoogleMarker, InfoWindow } from "@react-google-maps/api"
import { Loader2 } from "lucide-react"
import { getLeafletIconUrl, getGoogleMapsIconHtml, MarkerColor, MarkerBadge } from "@/lib/map-icons"
import { useTranslations } from "next-intl"

// Environment Defaults
const DEFAULT_LAT = parseFloat(process.env.NEXT_PUBLIC_LAT_PROJECT || "13.736717")
const DEFAULT_LNG = parseFloat(process.env.NEXT_PUBLIC_LNG_PROJECT || "100.523186")
const DEFAULT_ZOOM = parseInt(process.env.NEXT_PUBLIC_ZOOM_PROJECT || "14")
const ICON_SCALE = parseFloat(process.env.NEXT_PUBLIC_SIZE_ICON || "1")

const DefaultIcon = L.icon({
    iconUrl: "/images/marker-icon.png",
    shadowUrl: "/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
})
L.Marker.prototype.options.icon = DefaultIcon

interface MapProps {
    mode: "online" | "offline"
    onlineUrl?: string
    offlineUrl?: string
    devices: LatLongData[]
}

// Helpers
function getMarkerConfig(device: LatLongData, t: any): { color: MarkerColor, badge: MarkerBadge, statusText: string } {
    const status = device.status;
    const isAuto = device.type_schedule !== "manual" && device.using_sensor.toLowerCase() !== "false";
    const power = parseInt(device.last_power || "0");
    const isPowerAbnormal = power > 5;

    switch (status) {
        case "0":
        case "2":
        case "1":
            return {
                color: status === "1" ? 'green' : 'gray',
                badge: isAuto ? 'A' : 'M',
                statusText: isAuto ? t("legend.auto") : t("legend.manual")
            };
        case "3":
            return { color: isPowerAbnormal ? 'green' : 'gray', badge: '⚡', statusText: t("legend.abnormal") };
        case "4":
            return { color: 'red', badge: null, statusText: t("legend.failure") };
        case "5":
        case "6":
            return { color: 'blue', badge: 'A', statusText: t("legend.disconnect") };
        default:
            return { color: 'gray', badge: null, statusText: "Unknown" };
    }
}

function isValidGPS(lat: string, lng: string): boolean {
    if (!lat || !lng) return false;
    if (lat === "LES" || lng === "LES") return false;
    const l = parseFloat(lat);
    const g = parseFloat(lng);
    return !isNaN(l) && !isNaN(g) && (l !== 0 || g !== 0);
}

function getIconSizeForZoom(zoom: number) {
    // Linear scaling: Zoom 10 -> 20px, Zoom 14 -> 40px, Zoom 18 -> 60px
    const size = 20 + (zoom - 10) * 5;
    return Math.max(10, Math.min(size, 80)); // Clamp between 10px and 80px
}

const customIconLeaflet = (color: MarkerColor, badge: MarkerBadge, size: number) => L.divIcon({
    className: "custom-marker-svg",
    html: `<img src="${getLeafletIconUrl(color, badge)}" style="width: ${size}px; height: ${size}px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));" />`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size]
})

const containerStyle = { width: '100%', height: '100%' };
const centerDefault = { lat: DEFAULT_LAT, lng: DEFAULT_LNG };

function GoogleMapComponent({ devices }: { devices: LatLongData[] }) {
    const t = useTranslations("MapGlobal");
    const { isLoaded } = useJsApiLoader({ id: 'google-map-script', googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "", language: "th" })
    const [map, setMap] = useState<google.maps.Map | null>(null)
    const [zoom, setZoom] = useState(DEFAULT_ZOOM)
    const [selectedDevice, setSelectedDevice] = useState<LatLongData | null>(null)

    const onLoad = useCallback((map: google.maps.Map) => {
        setMap(map)
    }, [])

    const onZoomChanged = useCallback(() => {
        if (!map) return;
        const z = map.getZoom();
        if (z) setZoom(z); // Update state to trigger re-render of markers with new size
    }, [map])

    const onUnmount = useCallback((map: google.maps.Map) => setMap(null), [])

    if (!isLoaded) return <div className="h-full w-full flex items-center justify-center"><Loader2 className="animate-spin" /></div>

    const iconSize = getIconSizeForZoom(zoom) * ICON_SCALE;

    return (
        <GoogleMap
            mapContainerStyle={containerStyle}
            center={centerDefault}
            zoom={DEFAULT_ZOOM}
            onLoad={onLoad}
            onUnmount={onUnmount}
            onZoomChanged={onZoomChanged}
            options={{ rotateControl: true }}
        >
            {devices.map((device, idx) => {
                if (!isValidGPS(device.lat, device.lng)) return null;
                const config = getMarkerConfig(device, t);
                return (
                    <GoogleMarker
                        key={`${device.id}-${idx}`}
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
                <InfoWindow position={{ lat: parseFloat(selectedDevice.lat), lng: parseFloat(selectedDevice.lng) }} onCloseClick={() => setSelectedDevice(null)}>
                    <div className="p-2 space-y-1 text-sm text-black">
                        <p><strong>{t("popup.name")}</strong> {selectedDevice.name_pole || selectedDevice.street_light_name || "N/A"}</p>
                        <p><strong>{t("popup.imsi")}</strong> {selectedDevice.imsi}</p>
                        <p><strong>{t("popup.group")}</strong> {selectedDevice.group_name || "N/A"}</p>
                        <p><strong>{t("popup.status")}</strong> {getMarkerConfig(selectedDevice, t).statusText}</p>
                        {!isValidGPS(selectedDevice.lat, selectedDevice.lng) && <p className="text-red-500 text-xs">{t("popup.invalidGps")}</p>}
                    </div>
                </InfoWindow>
            )}
        </GoogleMap>
    )
}

function LeafletMapComponent({ offlineUrl, devices }: { offlineUrl?: string, devices: LatLongData[] }) {
    const t = useTranslations("MapGlobal");
    const containerRef = useRef<HTMLDivElement>(null)
    const mapInstanceRef = useRef<L.Map | null>(null)
    const markersRef = useRef<L.Marker[]>([])
    const [currentZoom, setCurrentZoom] = useState(DEFAULT_ZOOM)

    useEffect(() => {
        if (!containerRef.current || mapInstanceRef.current) return
        const map = L.map(containerRef.current).setView([DEFAULT_LAT, DEFAULT_LNG], DEFAULT_ZOOM)
        L.tileLayer(offlineUrl || "http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: '&copy; OpenStreetMap', maxZoom: 20 }).addTo(map)

        map.on('zoomend', () => {
            setCurrentZoom(map.getZoom())
        })

        mapInstanceRef.current = map
        return () => { if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null } }
    }, [offlineUrl])

    // Update Markers when Devices or Zoom changes
    useEffect(() => {
        const map = mapInstanceRef.current
        if (!map) return

        markersRef.current.forEach(marker => marker.remove())
        markersRef.current = []

        const iconSize = getIconSizeForZoom(currentZoom) * ICON_SCALE;

        devices.forEach(device => {
            if (!isValidGPS(device.lat, device.lng)) return;
            const config = getMarkerConfig(device, t);
            const markerIcon = customIconLeaflet(config.color, config.badge, iconSize);
            const marker = L.marker([parseFloat(device.lat), parseFloat(device.lng)], { icon: markerIcon })
                .bindPopup(`
                    <div class="p-2 space-y-1 text-sm font-sans">
                        <p><strong>${t("popup.name")}</strong> ${device.name_pole || device.street_light_name || "N/A"}</p>
                        <p><strong>${t("popup.imsi")}</strong> ${device.imsi}</p>
                        <p><strong>${t("popup.group")}</strong> ${device.group_name || "N/A"}</p>
                        <p><strong>${t("popup.status")}</strong> ${config.statusText}</p>
                    </div>
                `)
                .addTo(map)
            markersRef.current.push(marker)
        })
    }, [devices, currentZoom, t])

    return <div ref={containerRef} className="h-full w-full" style={{ zIndex: 0 }} />
}

export default function MapContainerComponent({ mode, onlineUrl, offlineUrl, devices }: MapProps) {
    if (mode === "online") {
        return (
            <div className="h-full w-full rounded-lg overflow-hidden border relative">
                <GoogleMapComponent devices={devices} />
                <MapLegend />
            </div>
        )
    }
    return (
        <div className="h-full w-full rounded-lg overflow-hidden border relative z-0">
            <LeafletMapComponent offlineUrl={offlineUrl} devices={devices} />
            <MapLegend />
        </div>
    )
}

function MapLegend() {
    const t = useTranslations("MapGlobal");
    return (
        <div className="absolute bottom-6 left-2 bg-white/95 text-black p-3 rounded-md shadow-lg border text-xs z-[1000] max-w-[320px]">
            <h4 className="font-bold mb-2 text-gray-700">{t("legend.title")}</h4>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {/* Auto Mode: Green (On) | Gray (Off) */}
                <LegendItem
                    icons={[
                        { color: "green", badge: "A" },
                        { color: "gray", badge: "A" }
                    ]}
                    text={t("legend.auto")}
                />

                {/* Manual Mode: Green (On) | Gray (Off) */}
                <LegendItem
                    icons={[
                        { color: "green", badge: "M" },
                        { color: "gray", badge: "M" }
                    ]}
                    text={t("legend.manual")}
                />

                {/* Comm Fail (Blue A) */}
                <LegendItem
                    icons={[{ color: "blue", badge: "A" }]}
                    text={t("legend.disconnect")}
                />

                {/* Abnormal Power: Green Bolt | Gray Bolt */}
                <LegendItem
                    icons={[
                        { color: "green", badge: "⚡" },
                        { color: "gray", badge: "⚡" }
                    ]}
                    text={t("legend.abnormal")}
                />

                {/* Failure: Red */}
                <LegendItem
                    icons={[{ color: "red", badge: null }]}
                    text={t("legend.failure")}
                />
            </div>
        </div>
    )
}

function LegendItem({ icons, text }: { icons: { color: MarkerColor, badge: MarkerBadge }[], text: string }) {
    return (
        <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 min-w-[50px]">
                {icons.map((icon, idx) => (
                    <div key={idx} className="flex items-center">
                        <img src={getLeafletIconUrl(icon.color, icon.badge)} className="w-6 h-6" alt="" />
                        {idx < icons.length - 1 && <span className="text-gray-400 mx-0.5">|</span>}
                    </div>
                ))}
            </div>
            <span>{text}</span>
        </div>
    )
}
