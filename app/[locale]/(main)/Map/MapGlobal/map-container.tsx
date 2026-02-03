"use client"

import { useEffect, useState, useCallback, useRef } from "react"
// react-leaflet imports kept as legacy reference or if needed by other components, though current impl uses Vanilla L
import { useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { LatLongData, getDataDetailIMSIAction, ImsiDetail, sendCommandMqttAction } from "@/app/actions/map-actions"
import { GoogleMap, useJsApiLoader, Marker as GoogleMarker, InfoWindow } from "@react-google-maps/api"
import { Loader2, Power, Sun } from "lucide-react"
import { getLeafletIconUrl, getGoogleMapsIconHtml, MarkerColor, MarkerBadge } from "@/lib/map-icons"
import { useTranslations } from "next-intl"
import { createRoot } from "react-dom/client"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

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

function getDeviceMode(device: LatLongData, t: any): string {
    if (device.using_sensor && device.using_sensor.toLowerCase() === "false") {
        return t("legend.manual");
    }
    return device.type_schedule || t("legend.auto");
}

function formatServiceData(text: string, t: any): string {
    if (!text) return "-";
    // Replace known Thai keywords with localized versions
    let formatted = text;
    formatted = formatted.replace(/เปิด/g, t("serviceStatus.on"));
    formatted = formatted.replace(/ปิด/g, t("serviceStatus.off"));
    formatted = formatted.replace(/สว่าง/g, t("serviceStatus.brightness"));
    return formatted;
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

interface DeviceDetailPopupProps {
    device: LatLongData
    t: any
    onUpdatePosition?: () => void
}

function DeviceDetailPopup({ device, t, onUpdatePosition }: DeviceDetailPopupProps) {
    const [detail, setDetail] = useState<ImsiDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)
    const [sending, setSending] = useState(false)
    const [dimValue, setDimValue] = useState(100)

    useEffect(() => {
        let active = true
        setLoading(true)
        setError(false)

        getDataDetailIMSIAction(device.imsi)
            .then(res => {
                if (active) {
                    if (res) {
                        setDetail(res)
                        // Try to parse existing brightness if available in string, otherwise default 100
                        // Example: "เปิด | สว่าง : 100 % (24 W)"
                        if (res.last_status) {
                            const match = res.last_status.match(/(\d+)\s*%/)
                            if (match) {
                                setDimValue(parseInt(match[1]))
                            }
                        }
                    } else {
                        setError(true)
                    }
                    setLoading(false)
                    if (onUpdatePosition) onUpdatePosition()
                }
            })
            .catch(() => {
                if (active) {
                    setError(true)
                    setLoading(false)
                    if (onUpdatePosition) onUpdatePosition()
                }
            })

        return () => { active = false }
    }, [device, onUpdatePosition])

    const handleCommand = async (commandType: "0" | "1", dim: number) => {
        setSending(true)
        const res = await sendCommandMqttAction(device.imsi, commandType, dim.toString())
        setSending(false)

        if (res.success) {
            toast.success(t("control.success"))
            // Optimistic update could happen here, or just wait for next fetch
        } else {
            toast.error(res.message || t("control.error"))
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-6 gap-2 min-w-[300px]">
                <Loader2 className="animate-spin h-6 w-6 text-primary" />
                <span className="text-sm text-muted-foreground">{t("loading")}</span>
            </div>
        )
    }

    if (error || !detail) {
        return (
            <div className="space-y-2 min-w-[300px]">
                <h3 className="font-bold text-lg">{device.name_pole || device.street_light_name || "N/A"}</h3>
                <p className="text-sm text-gray-500">{t("popup.imsi")} {device.imsi}</p>
                <p className="text-red-500 text-sm">Failed to load detailed data.</p>
            </div>
        )
    }

    const commandText = formatServiceData(detail.last_command, t);
    const statusText = formatServiceData(detail.last_status, t);
    const modeText = getDeviceMode(device, t);
    const isManual = modeText === t("legend.manual");
    const config = getMarkerConfig(device, t);

    return (
        <div className="font-sans min-w-[300px] text-gray-800 text-base">
            {/* Header */}
            <div className="border-b pb-2 mb-3">
                <h3 className="font-bold text-xl text-primary leading-tight m-0">
                    {detail.street_light_name || t("popup.name")}
                </h3>
                <p className="text-sm text-gray-500 mt-1 m-0">
                    {t("popup.imsi")} {detail.imsi}
                </p>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-3">
                <div className="flex flex-col">
                    <span className="text-gray-500 font-medium">{t("popup.group")}</span>
                    <span className="truncate block w-full whitespace-nowrap overflow-hidden text-ellipsis">{detail.group_name || "-"}</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-gray-500 font-medium">{t("popup.govName")}</span>
                    <span className="truncate block w-full whitespace-nowrap overflow-hidden text-ellipsis">{detail.number_gov || "-"}</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-gray-500 font-medium">{t("popup.mode")}</span>
                    <span className={`${isManual ? 'text-orange-600' : 'text-green-600'} font-semibold`}>{modeText}</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-gray-500 font-medium">{t("popup.status")}</span>
                    <span className="font-medium">{config.statusText}</span>
                </div>
            </div>

            {/* Status Box */}
            <div className="bg-slate-50 p-2 rounded-md border border-gray-200 text-sm space-y-1.5 mb-3">
                <div className="flex justify-between items-center">
                    <span className="text-gray-500">{t("popup.lastCommand")}:</span>
                    <span className="font-medium text-right">{commandText}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-gray-500">{t("popup.lastStatus")}:</span>
                    <span className="font-medium text-right">{statusText}</span>
                </div>
            </div>

            {/* Control Section */}
            <div className="mb-3 pt-2 border-t">
                <p className="font-semibold text-sm mb-2 text-gray-700">{t("control.title")}</p>

                {/* On/Off Buttons */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                    <Button
                        size="sm"
                        onClick={() => handleCommand("1", 100)}
                        disabled={sending}
                        className="bg-green-600 hover:bg-green-700 text-white w-full"
                    >
                        {sending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Power className="w-4 h-4 mr-1" />}
                        {t("control.on")}
                    </Button>
                    <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleCommand("0", 0)}
                        disabled={sending}
                        className="w-full"
                    >
                        {sending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Power className="w-4 h-4 mr-1" />}
                        {t("control.off")}
                    </Button>
                </div>

                {/* Brightness Slider */}
                <div className="space-y-2 bg-slate-50 p-2 rounded border">
                    <div className="flex justify-between text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Sun className="w-3 h-3" /> {t("control.dim")}</span>
                        <span>{dimValue}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Slider
                            value={[dimValue]}
                            onValueChange={(vals) => setDimValue(vals[0])}
                            max={100}
                            step={1}
                            className="flex-1"
                            disabled={sending}
                        />
                        <Button
                            size="icon"
                            variant="outline"
                            className="h-6 w-8 text-xs"
                            disabled={sending}
                            onClick={() => handleCommand("1", dimValue)}
                        >
                            {t("control.set")}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="text-xs text-gray-400 text-right pt-2 border-t border-gray-100">
                {t("popup.lastUpdate")} {detail.last_update}
            </div>
        </div>
    )
}

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
        if (z) setZoom(z);
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
                <InfoWindow
                    position={{ lat: parseFloat(selectedDevice.lat), lng: parseFloat(selectedDevice.lng) }}
                    onCloseClick={() => setSelectedDevice(null)}
                >
                    <DeviceDetailPopup device={selectedDevice} t={t} />
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
                .addTo(map)

            // Interaction logic using createRoot for React content inside Leaflet Popup
            const container = document.createElement('div');
            marker.bindPopup(container);

            marker.on('popupopen', (e) => {
                const popup = e.popup;
                const content = popup.getContent();

                if (content instanceof HTMLElement) {
                    const c = content as any;
                    let root = c._reactRoot;

                    if (!root) {
                        root = createRoot(c);
                        c._reactRoot = root;
                    }

                    root.render(
                        <DeviceDetailPopup
                            device={device}
                            t={t}
                            onUpdatePosition={() => {
                                // Update popup position if content size changes
                                marker.getPopup()?.update()
                            }}
                        />
                    );
                }
            });

            marker.on('popupclose', (e) => {
                const popup = e.popup;
                const content = popup.getContent();
                if (content instanceof HTMLElement) {
                    const c = content as any;
                    if (c._reactRoot) {
                        // We can unmount on close to convert back to "clean" state
                        setTimeout(() => {
                            if (c._reactRoot) {
                                c._reactRoot.unmount();
                                delete c._reactRoot;
                            }
                        }, 100);
                    }
                }
            })

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
                <LegendItem
                    icons={[
                        { color: "green", badge: "A" },
                        { color: "gray", badge: "A" }
                    ]}
                    text={t("legend.auto")}
                />

                <LegendItem
                    icons={[
                        { color: "green", badge: "M" },
                        { color: "gray", badge: "M" }
                    ]}
                    text={t("legend.manual")}
                />

                <LegendItem
                    icons={[{ color: "blue", badge: "A" }]}
                    text={t("legend.disconnect")}
                />

                <LegendItem
                    icons={[
                        { color: "green", badge: "⚡" },
                        { color: "gray", badge: "⚡" }
                    ]}
                    text={t("legend.abnormal")}
                />

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
