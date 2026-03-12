"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { LatLongData } from "@/app/actions/map-actions"
import { GoogleMap, useJsApiLoader, Marker as GoogleMarker, InfoWindow } from "@react-google-maps/api"
import { Loader2 } from "lucide-react"
import { getLeafletIconUrl, getGoogleMapsIconHtml, MarkerColor, MarkerBadge } from "@/lib/map-icons"
import { useTranslations } from "next-intl"
import { createRoot } from "react-dom/client"
import { Button } from "@/components/ui/button"
import { isValidGPS } from "../../Map/MapGlobal/map-utils"

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
    onSelectDevice: (device: LatLongData) => void
    selectedImsis: string[] // to hide markers that are already selected
}

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

function getIconSizeForZoom(zoom: number) {
    const size = 20 + (zoom - 10) * 5;
    return Math.max(10, Math.min(size, 80));
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
    tMap: any
    tConfig: any
    onSelectDevice: (device: LatLongData) => void
}

function DeviceDetailPopup({ device, tMap, tConfig, onSelectDevice }: DeviceDetailPopupProps) {
    return (
        <div className="font-sans min-w-[250px] text-gray-800 text-sm space-y-4 p-1">
            <div className="space-y-1.5">
                <p><span className="text-gray-500 font-medium">{tMap("popup.group")}</span> {device.group_name || "-"}</p>
                <p><span className="text-gray-500 font-medium">{tMap("popup.imsi")}</span> {device.imsi || "-"}</p>
                <p><span className="text-gray-500 font-medium">{tMap("popup.name")}</span> {device.street_light_name || "-"}</p>
            </div>
            <Button
                variant="default"
                className="w-full bg-green-500 hover:bg-green-600 text-white"
                onClick={() => onSelectDevice(device)}
            >
                {tConfig("map.reportIssue")}
            </Button>
        </div>
    )
}

function GoogleMapComponent({ devices, onSelectDevice, selectedImsis }: { devices: LatLongData[], onSelectDevice: (device: LatLongData) => void, selectedImsis: string[] }) {
    const tMap = useTranslations("MapGlobal");
    const tConfig = useTranslations("MaintenanceConfig");
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

    // Deselect if the selected device was added to the table
    useEffect(() => {
        if (selectedDevice && selectedImsis.includes(selectedDevice.imsi)) {
            setSelectedDevice(null)
        }
    }, [selectedImsis, selectedDevice])

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
            {devices.filter(d => !selectedImsis.includes(d.imsi)).map((device, idx) => {
                if (!isValidGPS(device.lat, device.lng)) return null;
                const config = getMarkerConfig(device, tMap);
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
            {selectedDevice && !selectedImsis.includes(selectedDevice.imsi) && (
                <InfoWindow
                    position={{ lat: parseFloat(selectedDevice.lat), lng: parseFloat(selectedDevice.lng) }}
                    onCloseClick={() => setSelectedDevice(null)}
                >
                    <DeviceDetailPopup device={selectedDevice} tMap={tMap} tConfig={tConfig} onSelectDevice={onSelectDevice} />
                </InfoWindow>
            )}
        </GoogleMap>
    )
}

function LeafletMapComponent({ offlineUrl, devices, onSelectDevice, selectedImsis }: { offlineUrl?: string, devices: LatLongData[], onSelectDevice: (device: LatLongData) => void, selectedImsis: string[] }) {
    const tMap = useTranslations("MapGlobal");
    const tConfig = useTranslations("MaintenanceConfig");
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

    useEffect(() => {
        const map = mapInstanceRef.current
        if (!map) return

        markersRef.current.forEach(marker => marker.remove())
        markersRef.current = []

        const iconSize = getIconSizeForZoom(currentZoom) * ICON_SCALE;

        const visibleDevices = devices.filter(d => !selectedImsis.includes(d.imsi))

        visibleDevices.forEach(device => {
            if (!isValidGPS(device.lat, device.lng)) return;
            const config = getMarkerConfig(device, tMap);
            const markerIcon = customIconLeaflet(config.color, config.badge, iconSize);

            const marker = L.marker([parseFloat(device.lat), parseFloat(device.lng)], { icon: markerIcon })
                .addTo(map)

            const container = document.createElement('div');
            marker.bindPopup(container, { minWidth: 260, className: "maintenance-device-popup" });

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
                        <UseTranslationsProvider>
                            <DeviceDetailPopup
                                device={device}
                                tMap={tMap}
                                tConfig={tConfig}
                                onSelectDevice={(d) => {
                                    onSelectDevice(d);
                                    marker.closePopup();
                                }}
                            />
                        </UseTranslationsProvider>
                    );

                    // Force Leaflet to recalculate the popup size after React 18 async render
                    setTimeout(() => {
                        if (popup.isOpen()) {
                            popup.update();
                        }
                    }, 50);
                }
            });

            marker.on('popupclose', (e) => {
                const popup = e.popup;
                const content = popup.getContent();
                if (content instanceof HTMLElement) {
                    const c = content as any;
                    if (c._reactRoot) {
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
    }, [devices, currentZoom, tMap, tConfig, onSelectDevice, selectedImsis])

    return <div ref={containerRef} className="h-full w-full" style={{ zIndex: 0 }} />
}

// Wrapper for creating root to give it context, but since we pass `t` it's mostly ok
function UseTranslationsProvider({ children }: { children: React.ReactNode }) {
    return <>{children}</>
}

export default function MaintenanceMapComponent({ mode, onlineUrl, offlineUrl, devices, onSelectDevice, selectedImsis }: MapProps) {
    if (mode === "online") {
        return (
            <div className="h-full w-full rounded-lg overflow-hidden border relative">
                <GoogleMapComponent devices={devices} onSelectDevice={onSelectDevice} selectedImsis={selectedImsis} />
            </div>
        )
    }
    return (
        <div className="h-full w-full rounded-lg overflow-hidden border relative z-0">
            <LeafletMapComponent offlineUrl={offlineUrl} devices={devices} onSelectDevice={onSelectDevice} selectedImsis={selectedImsis} />
        </div>
    )
}
