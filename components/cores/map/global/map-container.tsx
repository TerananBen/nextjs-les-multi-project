"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { LatLongData, getDataDetailIMSIAction, ImsiDetail, sendCommandMqttAction, readDataMqttAction } from "@/app/actions/map-actions"
import { GoogleMap, useJsApiLoader, Marker as GoogleMarker, InfoWindow } from "@react-google-maps/api"
import { Loader2, Power, Sun, RefreshCcw, ChevronDown, ChevronUp, PowerOff } from "lucide-react"
import { getLeafletIconUrl, getGoogleMapsIconHtml, MarkerColor, MarkerBadge } from "@/lib/map-icons"
import { useTranslations, useLocale } from "next-intl"
import { createRoot } from "react-dom/client"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { usePermission } from "@/components/providers/permission-provider"
import { isValidGPS } from "./map-utils"
import { cn } from "@/lib/utils"

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
    mode?: "online" | "offline"
    offlineUrl?: string
    defaultLat?: string
    defaultLng?: string
    defaultZoom?: string
    iconScale?: string
    devices: LatLongData[]
    googleMapsApiKey?: string
}

// Helpers
function getMarkerConfig(device: LatLongData, t: (key: string) => string): { color: MarkerColor, badge: MarkerBadge, statusText: string } {
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
            return { color: 'gray', badge: null, statusText: t("legend.unknown") };
    }
}

function getDeviceMode(device: LatLongData, t: (key: string) => string): string {
    if (device.using_sensor && device.using_sensor.toLowerCase() === "false") {
        return t("legend.manual");
    }
    return device.type_schedule || t("legend.auto");
}

function formatServiceData(text: string, t: (key: string) => string): string {
    if (!text) return "-";
    let formatted = text;
    formatted = formatted.replace(/เปิด/g, t("serviceStatus.on"));
    formatted = formatted.replace(/ปิด/g, t("serviceStatus.off"));
    formatted = formatted.replace(/สว่าง/g, t("serviceStatus.brightness"));
    return formatted;
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

interface DeviceDetailPopupProps {
    device: LatLongData
    t: (key: string) => string
    onUpdatePosition?: () => void
    canControl: boolean
}

function DeviceDetailPopup({ device, t, onUpdatePosition, canControl }: DeviceDetailPopupProps) {
    const [detail, setDetail] = useState<ImsiDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)
    const [sending, setSending] = useState(false)
    const [reading, setReading] = useState(false)
    const [dimValue, setDimValue] = useState<number>(() => {
        const initialPower = parseInt(device.last_power || "0", 10)
        return (device.status === "1" || initialPower > 5) ? 100 : 0
    })

    const fetchDetail = useCallback(async () => {
        setLoading(true)
        setError(false)
        try {
            const res = await getDataDetailIMSIAction(device.imsi)
            if (res) {
                setDetail(res)
                const isOff = res.last_command === "ปิด" || res.last_status === "ปิด" || res.last_status?.startsWith("ปิด")
                if (isOff) {
                    setDimValue(0)
                } else if (res.last_status) {
                    const match = res.last_status.match(/(\d+)\s*%/)
                    if (match) {
                        setDimValue(parseInt(match[1], 10))
                    } else {
                        setDimValue(100)
                    }
                }
            } else {
                setError(true)
            }
        } catch {
            setError(true)
        } finally {
            setLoading(false)
            if (onUpdatePosition) onUpdatePosition()
        }
    }, [device.imsi, onUpdatePosition])

    useEffect(() => {
        fetchDetail()
    }, [fetchDetail])

    const handleCommand = async (commandType: "0" | "1", dim: number) => {
        if (!canControl) {
            toast.error(t("control.permissionDenied") || t("control.error"))
            return
        }
        setSending(true)
        const res = await sendCommandMqttAction(device.imsi, commandType, dim.toString())
        setSending(false)

        if (res.success) {
            toast.success(t("control.success"))
            fetchDetail()
        } else {
            toast.error(res.message || t("control.error"))
        }
    }

    const handleReadPower = async () => {
        if (!canControl) {
            toast.error(t("control.permissionDenied") || t("control.error"))
            return
        }
        if (!device.gateway_id) {
            toast.error(t("control.noGatewayId"))
            return
        }
        setReading(true)
        const res = await readDataMqttAction(device.gateway_id, device.imsi)
        setReading(false)

        if (res.success) {
            toast.success(t("control.readSuccess"))
            fetchDetail()
        } else {
            toast.error(res.message || t("control.readError"))
        }
    }

    if (loading && !detail) {
        return (
            <div className="flex flex-col items-center justify-center py-6 gap-2 min-w-[280px]">
                <Loader2 className="animate-spin h-6 w-6 text-primary" />
                <span className="text-xs text-muted-foreground">{t("loading")}</span>
            </div>
        )
    }

    if (error || !detail) {
        return (
            <div className="space-y-2 min-w-[280px] p-1">
                <h3 className="font-semibold text-base text-foreground">{device.name_pole || device.street_light_name || "-"}</h3>
                <p className="text-xs text-muted-foreground">{t("popup.imsi")} {device.imsi}</p>
                <p className="text-destructive text-xs">{t("popup.failedToLoadDetailedData")}</p>
                <Button variant="outline" size="sm" onClick={fetchDetail} className="h-8 text-xs cursor-pointer">
                    <RefreshCcw className="w-3.5 h-3.5 mr-1.5" />
                    {t("popup.retry")}
                </Button>
            </div>
        )
    }

    const commandText = formatServiceData(detail.last_command, t);
    const statusText = formatServiceData(detail.last_status, t);
    const modeText = getDeviceMode(device, t);
    const isManual = modeText === t("legend.manual");
    const config = getMarkerConfig(device, t);

    return (
        <div className="font-sans min-w-[280px] max-w-[340px] text-foreground space-y-3">
            {/* Header */}
            <div className="border-b border-border/60 pb-1.5 mb-2">
                <h3 className="font-semibold text-base text-foreground leading-tight truncate m-0" title={detail.street_light_name || device.name_pole || device.street_light_name || t("popup.name")}>
                    {detail.street_light_name || device.name_pole || device.street_light_name || t("popup.name")}
                </h3>
                <p className="text-xs text-muted-foreground m-0 mt-0.5">
                    {t("popup.imsi")} <span className="font-mono">{detail.imsi || device.imsi}</span>
                </p>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                <div className="flex flex-col min-w-0">
                    <span className="text-muted-foreground text-[11px]">{t("popup.group")}</span>
                    <span className="font-medium truncate" title={detail.group_name || "-"}>{detail.group_name || "-"}</span>
                </div>
                <div className="flex flex-col min-w-0">
                    <span className="text-muted-foreground text-[11px]">{t("popup.govName")}</span>
                    <span className="font-medium truncate" title={detail.number_gov || "-"}>{detail.number_gov || "-"}</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-muted-foreground text-[11px]">{t("popup.mode")}</span>
                    <span className={cn("font-medium", isManual ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400")}>
                        {modeText}
                    </span>
                </div>
                <div className="flex flex-col">
                    <span className="text-muted-foreground text-[11px]">{t("popup.status")}</span>
                    <span className="font-medium text-foreground">{config.statusText}</span>
                </div>
            </div>

            {/* Status Box */}
            <div className="bg-muted/40 p-2.5 rounded-lg border border-border/60 text-xs space-y-1.5">
                <div className="flex justify-between items-center gap-2">
                    <span className="text-muted-foreground shrink-0">{t("popup.lastCommand")}:</span>
                    <span className="font-medium text-right truncate">{commandText}</span>
                </div>
                <div className="flex justify-between items-center gap-2">
                    <span className="text-muted-foreground shrink-0">{t("popup.lastStatus")}:</span>
                    <span className="font-medium text-right truncate">{statusText}</span>
                </div>
            </div>

            {/* Control Section */}
            <div className="space-y-2.5 pt-1">
                <div className="flex justify-between items-center">
                    <span className="font-semibold text-xs text-foreground">{t("control.title")}</span>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                        onClick={handleReadPower}
                        disabled={reading || sending}
                    >
                        {reading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RefreshCcw className="w-3 h-3 mr-1" />}
                        {t("control.readPower")}
                    </Button>
                </div>

                {/* On/Off Buttons */}
                <div className="grid grid-cols-2 gap-2">
                    <Button
                        size="sm"
                        onClick={() => handleCommand("1", 100)}
                        disabled={sending || reading}
                        className="h-8 cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-600 dark:hover:bg-emerald-700 shadow-2xs font-medium text-xs"
                    >
                        {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Power className="w-3.5 h-3.5 mr-1.5" />}
                        {t("control.on")}
                    </Button>
                    <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleCommand("0", 0)}
                        disabled={sending || reading}
                        className="h-8 cursor-pointer shadow-2xs font-medium text-xs"
                    >
                        {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <PowerOff className="w-3.5 h-3.5 mr-1.5" />}
                        {t("control.off")}
                    </Button>
                </div>

                {/* Brightness Slider */}
                <div className="bg-muted/30 p-2 rounded-lg border border-border/60 space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                        <span className="flex items-center gap-1 text-muted-foreground text-[11px]">
                            <Sun className="w-3 h-3" /> {t("control.dim")}
                        </span>
                        <span className="font-semibold tabular-nums text-xs">{dimValue}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex-1 relative">
                            {!canControl && (
                                <div
                                    className="absolute inset-0 z-10 cursor-not-allowed"
                                    onClick={() => toast.error(t("control.permissionDenied") || t("control.error"))}
                                />
                            )}
                            <Slider
                                value={[dimValue]}
                                onValueChange={(vals) => setDimValue(vals[0])}
                                max={100}
                                step={1}
                                className={cn(canControl ? "cursor-pointer" : "cursor-not-allowed opacity-50")}
                                disabled={sending || reading || !canControl}
                            />
                        </div>
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2.5 text-xs font-medium cursor-pointer shrink-0"
                            disabled={sending || reading}
                            onClick={() => handleCommand("1", dimValue)}
                        >
                            {t("control.set")}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="text-[11px] text-muted-foreground text-right pt-2 border-t border-border/60">
                {t("popup.lastUpdate")} {detail.last_update || "-"}
            </div>
        </div>
    )
}

let loadedMapLang: string | null = null;

// Google Map Component
function GoogleMapComponent({ googleMapsApiKey, devices, defaultLat, defaultLng, defaultZoom, iconScale }: { googleMapsApiKey?: string, devices: LatLongData[], defaultLat?: string, defaultLng?: string, defaultZoom?: string, iconScale?: string }) {
    const t = useTranslations("MapGlobal");
    const { getPermission } = usePermission();
    const { control: canControl } = getPermission("V_MapGlobal");
    const locale = useLocale();
    const mapLang = loadedMapLang || locale;
    
    useEffect(() => {
        if (loadedMapLang === null) {
            loadedMapLang = locale;
        }
    }, [locale]);

    const { isLoaded } = useJsApiLoader({ id: 'google-map-script', googleMapsApiKey: googleMapsApiKey || "", language: mapLang })
    const [map, setMap] = useState<google.maps.Map | null>(null)
    const [zoom, setZoom] = useState(parseFloat(defaultZoom || "13"))
    const [selectedDevice, setSelectedDevice] = useState<LatLongData | null>(null)

    const onLoad = useCallback((map: google.maps.Map) => {
        setMap(map)
    }, [])

    const onZoomChanged = useCallback(() => {
        if (!map) return;
        const z = map.getZoom();
        if (z) setZoom(z);
    }, [map])

    const onUnmount = useCallback(() => setMap(null), [])

    if (!isLoaded) return <div className="h-full w-full flex items-center justify-center"><Loader2 className="animate-spin text-muted-foreground" /></div>

    const iconSize = getIconSizeForZoom(zoom) * parseFloat(iconScale || "1");

    return (
        <GoogleMap
            mapContainerStyle={containerStyle}
            center={{ lat: parseFloat(defaultLat || "13.736717"), lng: parseFloat(defaultLng || "100.523186") }}
            zoom={parseFloat(defaultZoom || "13")}
            onLoad={onLoad}
            onUnmount={onUnmount}
            onZoomChanged={onZoomChanged}
            options={{ rotateControl: true }}
        >
            {devices.map((device, idx) => {
                if (!isValidGPS(device.lat, device.lng)) return null;
                const config = getMarkerConfig(device, t);
                const markerKey = device.SN || device.imsi || device.id || String(idx);
                return (
                    <GoogleMarker
                        key={`${markerKey}-${idx}`}
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
                    <DeviceDetailPopup device={selectedDevice} t={t} canControl={canControl} />
                </InfoWindow>
            )}
        </GoogleMap>
    )
}

function LeafletMapComponent({ offlineUrl, devices, defaultLat, defaultLng, defaultZoom, iconScale }: { offlineUrl?: string, devices: LatLongData[], defaultLat?: string, defaultLng?: string, defaultZoom?: string, iconScale?: string }) {
    const t = useTranslations("MapGlobal");
    const { getPermission } = usePermission();
    const { control: canControl } = getPermission("V_MapGlobal");
    const containerRef = useRef<HTMLDivElement>(null)
    const mapInstanceRef = useRef<L.Map | null>(null)
    const markersRef = useRef<L.Marker[]>([])
    const [currentZoom, setCurrentZoom] = useState(parseFloat(defaultZoom || "13"))

    useEffect(() => {
        if (!containerRef.current || mapInstanceRef.current) return
        const map = L.map(containerRef.current).setView([parseFloat(defaultLat || "13.736717"), parseFloat(defaultLng || "100.523186")], parseFloat(defaultZoom || "13"))
        L.tileLayer(offlineUrl || "http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: '&copy; OpenStreetMap', maxZoom: 20 }).addTo(map)

        map.on('zoomend', () => {
            setCurrentZoom(map.getZoom())
        })

        mapInstanceRef.current = map
        return () => { if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null } }
    }, [offlineUrl, defaultLat, defaultLng, defaultZoom])

    // Update Markers when Devices or Zoom changes
    useEffect(() => {
        const map = mapInstanceRef.current
        if (!map) return

        markersRef.current.forEach(marker => marker.remove())
        markersRef.current = []

        const iconSize = getIconSizeForZoom(currentZoom) * parseFloat(iconScale || "1");

        devices.forEach(device => {
            if (!isValidGPS(device.lat, device.lng)) return;
            const config = getMarkerConfig(device, t);
            const markerIcon = customIconLeaflet(config.color, config.badge, iconSize);

            const marker = L.marker([parseFloat(device.lat), parseFloat(device.lng)], { icon: markerIcon })
                .addTo(map)

            const container = document.createElement('div');
            marker.bindPopup(container);

            marker.on('popupopen', (e) => {
                const popup = e.popup;
                const content = popup.getContent();

                if (content instanceof HTMLElement) {
                    const c = content as HTMLElement & { _reactRoot?: import('react-dom/client').Root };
                    let root = c._reactRoot;

                    if (!root) {
                        root = createRoot(c);
                        c._reactRoot = root;
                    }

                    root.render(
                        <DeviceDetailPopup
                            device={device}
                            t={t}
                            canControl={canControl}
                            onUpdatePosition={() => {
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
                    const c = content as HTMLElement & { _reactRoot?: import('react-dom/client').Root };
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
    }, [devices, currentZoom, t, canControl, iconScale])

    return <div ref={containerRef} className="h-full w-full" style={{ zIndex: 0 }} />
}

export default function MapContainerComponent({ mode, offlineUrl, devices, defaultLat, defaultLng, defaultZoom, iconScale, googleMapsApiKey }: MapProps) {
    if (mode === "online") {
        return (
            <div className="h-full w-full relative">
                <GoogleMapComponent googleMapsApiKey={googleMapsApiKey} devices={devices} defaultLat={defaultLat} defaultLng={defaultLng} defaultZoom={defaultZoom} iconScale={iconScale} />
                <MapLegend />
            </div>
        )
    }
    return (
        <div className="h-full w-full relative z-0">
            <LeafletMapComponent offlineUrl={offlineUrl} devices={devices} defaultLat={defaultLat} defaultLng={defaultLng} defaultZoom={defaultZoom} iconScale={iconScale} />
            <MapLegend />
        </div>
    )
}

function MapLegend() {
    const t = useTranslations("MapGlobal");
    const [isExpanded, setIsExpanded] = useState(true);

    return (
        <div className="absolute bottom-3 left-3 bg-background/95 text-foreground backdrop-blur-md rounded-lg shadow-lg border border-border/60 text-xs z-[1000] max-w-[280px] sm:max-w-[320px] transition-all duration-200">
            {/* Header / Toggle */}
            <div
                className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-muted/50 rounded-t-lg select-none"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <h4 className="font-semibold text-foreground text-xs m-0">{t("legend.title")}</h4>
                <Button variant="ghost" size="sm" className="h-5 w-5 p-0 hover:bg-transparent text-muted-foreground">
                    {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
                </Button>
            </div>

            {/* Content */}
            {isExpanded && (
                <div className="px-3 pb-2.5 space-y-1.5 max-h-[180px] overflow-y-auto border-t border-border/60">
                    <div className="pt-1.5 space-y-1">
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
            )}
        </div>
    )
}

function LegendItem({ icons, text }: { icons: { color: MarkerColor, badge: MarkerBadge }[], text: string }) {
    return (
        <div className="flex items-center gap-2 py-0.5 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1 min-w-[46px] shrink-0">
                {icons.map((icon, idx) => (
                    <div key={idx} className="flex items-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={getLeafletIconUrl(icon.color, icon.badge)} className="w-5 h-5 drop-shadow-xs" alt="" />
                        {idx < icons.length - 1 && <span className="text-muted-foreground/50 mx-0.5">|</span>}
                    </div>
                ))}
            </div>
            <span className="truncate">{text}</span>
        </div>
    )
}
