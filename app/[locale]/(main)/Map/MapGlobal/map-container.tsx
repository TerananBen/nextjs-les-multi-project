"use client"

import { useEffect, useMemo, useState, useCallback, useRef } from "react"
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { LatLongData } from "@/app/actions/map-actions"
import { GoogleMap, useJsApiLoader, Marker as GoogleMarker, InfoWindow } from "@react-google-maps/api"
import { Loader2 } from "lucide-react"

// Environment Defaults
const DEFAULT_LAT = parseFloat(process.env.NEXT_PUBLIC_LAT_PROJECT || "13.736717")
const DEFAULT_LNG = parseFloat(process.env.NEXT_PUBLIC_LNG_PROJECT || "100.523186")
const DEFAULT_ZOOM = parseInt(process.env.NEXT_PUBLIC_ZOOM_PROJECT || "14")
const ICON_SCALE = parseFloat(process.env.NEXT_PUBLIC_SIZE_ICON || "1")

// Leaflet Icon Setup
// Note: Leaflet icon size is typically pixels, not a scale factor like Google Maps.
// We'll trust the user wants some adjustment, but for Leaflet we might need to interpret "SIZE_ICON" 
// differently or just keep standard. If 0.38 is passed, for Google Maps 'scale' it makes sense.
// For Leaflet, standard is 25x41. If we scaled it by 0.38 it would be tiny.
// I will keep standard Leaflet for now unless requested specific scaling logic.

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

// Leaflet Map Controller
function LeafletMapController({ devices }: { devices: LatLongData[] }) {
    const map = useMap()

    // fitBounds logic removed to respect NEXT_PUBLIC environment config
    /*
    useEffect(() => {
        if (devices.length > 0) {
            const validDevices = devices.filter(d => d.lat !== "0" && d.lng !== "0" && !isNaN(parseFloat(d.lat)) && !isNaN(parseFloat(d.lng)));
            if (validDevices.length > 0) {
                const bounds = L.latLngBounds(validDevices.map(d => [parseFloat(d.lat), parseFloat(d.lng)]))
                map.fitBounds(bounds, { padding: [50, 50] })
            }
        }
    }, [devices, map])
    */

    return null
}

const customIconLeaflet = (color: string) => L.divIcon({
    className: "custom-marker",
    html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -8]
})

// --- Google Maps Component ---
const containerStyle = {
    width: '100%',
    height: '100%'
};

const centerDefault = {
    lat: DEFAULT_LAT,
    lng: DEFAULT_LNG
};

function GoogleMapComponent({ devices }: { devices: LatLongData[] }) {
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "",
        language: process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || "th"
    })

    const [map, setMap] = useState<google.maps.Map | null>(null)
    const [selectedDevice, setSelectedDevice] = useState<LatLongData | null>(null)

    const onLoad = useCallback(function callback(map: google.maps.Map) {
        setMap(map)
    }, [])

    const onUnmount = useCallback(function callback(map: google.maps.Map) {
        setMap(null)
    }, [])

    // fitBounds logic removed to respect NEXT_PUBLIC environment config
    /*
    useEffect(() => {
        if (map && devices.length > 0) {
            const bounds = new window.google.maps.LatLngBounds();
            let hasValid = false;
            devices.forEach(d => {
                const lat = parseFloat(d.lat);
                const lng = parseFloat(d.lng);
                if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
                    bounds.extend({ lat, lng });
                    hasValid = true;
                }
            });
            if (hasValid) {
                map.fitBounds(bounds);
            }
        }
    }, [map, devices]);
    */

    if (!isLoaded) return <div className="h-full w-full flex items-center justify-center"><Loader2 className="animate-spin" /></div>

    return (
        <GoogleMap
            mapContainerStyle={containerStyle}
            center={centerDefault}
            zoom={DEFAULT_ZOOM}
            onLoad={onLoad}
            onUnmount={onUnmount}
            options={{
                rotateControl: true, // Assuming ROTATION implies allowing rotation or setting heading
            }}
        >
            {devices.map(device => {
                const lat = parseFloat(device.lat);
                const lng = parseFloat(device.lng);
                if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) return null;

                return (
                    <GoogleMarker
                        key={`${device.id}-${device.imsi}`}
                        position={{ lat, lng }}
                        icon={{
                            path: window.google.maps.SymbolPath.CIRCLE,
                            fillColor: getDeviceColor(device.status),
                            fillOpacity: 1,
                            strokeWeight: 2,
                            strokeColor: "white",
                            scale: 6 * ICON_SCALE // Apply scale factor here for Google Maps
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
                    <div className="p-2 space-y-1 text-sm text-black">
                        <p><strong>Name:</strong> {selectedDevice.name_pole || selectedDevice.street_light_name || "N/A"}</p>
                        <p><strong>IMSI:</strong> {selectedDevice.imsi}</p>
                        <p><strong>Group:</strong> {selectedDevice.group_name || "N/A"}</p>
                        <p><strong>Status:</strong> {getDeviceStatus(selectedDevice.status)}</p>
                    </div>
                </InfoWindow>
            )}
        </GoogleMap>
    )
}

// --- Main Map Container ---

// --- Leaflet Map Implementation (Vanilla) ---
function LeafletMapComponent({ offlineUrl, devices }: { offlineUrl?: string, devices: LatLongData[] }) {
    const mapContainerRef = useState<HTMLDivElement | null>(null)[1] // Callback ref for cleaner init? No, use useRef + useEffect is standard
    const containerRef = useRef<HTMLDivElement>(null)
    const mapInstanceRef = useRef<L.Map | null>(null)
    const markersRef = useRef<L.Marker[]>([])

    // Initialize Map
    useEffect(() => {
        if (!containerRef.current || mapInstanceRef.current) return

        const map = L.map(containerRef.current).setView([DEFAULT_LAT, DEFAULT_LNG], DEFAULT_ZOOM)

        L.tileLayer(offlineUrl || "http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; OpenStreetMap',
            maxZoom: 20
        }).addTo(map)

        mapInstanceRef.current = map

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove()
                mapInstanceRef.current = null
            }
        }
    }, [offlineUrl])

    // Update Markers
    useEffect(() => {
        const map = mapInstanceRef.current
        if (!map) return

        // Clear existing markers
        markersRef.current.forEach(marker => marker.remove())
        markersRef.current = []

        // Add new markers
        devices.forEach(device => {
            const lat = parseFloat(device.lat)
            const lng = parseFloat(device.lng)

            if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) return

            const color = getDeviceColor(device.status)
            const statusText = getDeviceStatus(device.status)
            const name = device.name_pole || device.street_light_name || "N/A"
            const group = device.group_name || "N/A"

            const markerIcon = customIconLeaflet(color)

            const marker = L.marker([lat, lng], { icon: markerIcon })
                .bindPopup(`
                    <div class="p-2 space-y-1 text-sm font-sans">
                        <p><strong>Name:</strong> ${name}</p>
                        <p><strong>IMSI:</strong> ${device.imsi}</p>
                        <p><strong>Group:</strong> ${group}</p>
                        <p><strong>Status:</strong> ${statusText}</p>
                    </div>
                `)
                .addTo(map)

            markersRef.current.push(marker)
        })

    }, [devices])

    return <div ref={containerRef} className="h-full w-full" style={{ zIndex: 0 }} />
}

export default function MapContainerComponent({ mode, onlineUrl, offlineUrl, devices }: MapProps) {
    // If Mode is Online, use Google Maps
    if (mode === "online") {
        return (
            <div className="h-full w-full rounded-lg overflow-hidden border">
                <GoogleMapComponent devices={devices} />
            </div>
        )
    }

    // Default / Offline Mode uses Leaflet (Vanilla)
    return (
        <div className="h-full w-full rounded-lg overflow-hidden border relative z-0">
            <LeafletMapComponent offlineUrl={offlineUrl} devices={devices} />
        </div>
    )
}

function getDeviceColor(status: string) {
    switch (status) {
        case "3": return "#EAB308" // Yellow
        case "4": return "#EF4444" // Red
        case "5": return "#F97316" // Orange
        default: return "#22C55E" // Green
    }
}

function getDeviceStatus(status: string) {
    switch (status) {
        case "3": return "Warning"
        case "4": return "Power Failure"
        case "5": return "Comm. Failure"
        default: return "Normal"
    }
}
