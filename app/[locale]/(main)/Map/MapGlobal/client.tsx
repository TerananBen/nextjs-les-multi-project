"use client"
import { useState, useEffect, useCallback } from "react"
import dynamic from "next/dynamic"
import FilterSidebar from "./filter-sidebar"
import {
    getListDataGroupAction,
    getListDataIMSIAction,
    getListDataStreetLightNameAction,
    getDataLatLongSearchAction,
    LatLongData
} from "@/app/actions/map-actions"
import { Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"

// Dynamic import for MapContainer to avoid SSR issues with Leaflet
const MapContainerComponent = dynamic(() => import("./map-container"), {
    ssr: false,
    loading: () => <div className="h-full w-full flex items-center justify-center bg-muted/20"><Loader2 className="h-8 w-8 animate-spin" /></div>
})

export default function MapGlobalClient() {
    const t = useTranslations("MapGlobal")
    const [searchType, setSearchType] = useState<"group" | "imsi" | "street_light_name">("group")
    const [searchValue, setSearchValue] = useState<string>("ALL")
    const [statusFilter, setStatusFilter] = useState<string>("all")

    // Data Options
    const [groupOptions, setGroupOptions] = useState<{ groupCode: string, groupName: string }[]>([])
    const [imsiOptions, setImsiOptions] = useState<string[]>([])
    const [nameOptions, setNameOptions] = useState<string[]>([])

    // Map Data
    const [devices, setDevices] = useState<LatLongData[]>([])
    const [isLoading, setIsLoading] = useState(false)

    // Config
    const mapMode = (process.env.NEXT_PUBLIC_MAP_MODE as "online" | "offline") || "online"
    const onlineUrl = process.env.NEXT_PUBLIC_MAP_ONLINE_URL
    const offlineUrl = process.env.NEXT_PUBLIC_MAP_OFFLINE_URL

    // Initial Data Load
    useEffect(() => {
        const loadOptions = async () => {
            const [groups, imsis, names] = await Promise.all([
                getListDataGroupAction(),
                getListDataIMSIAction(),
                getListDataStreetLightNameAction()
            ])
            setGroupOptions(groups)
            setImsiOptions(imsis)
            setNameOptions(names)
        }
        loadOptions()
    }, [])

    const handleSearch = useCallback(async () => {
        setIsLoading(true)
        try {
            const result = await getDataLatLongSearchAction(
                searchType,
                [searchValue], // API expects array
                statusFilter
            )
            setDevices(result)
        } catch (error) {
            console.error("Search failed", error)
        } finally {
            setIsLoading(false)
        }
    }, [searchType, searchValue, statusFilter])

    // Load initial map data on mount (optional - maybe default to all?)
    useEffect(() => {
        handleSearch()
    }, [handleSearch]) // Run once on mount and when handleSearch changes

    const currentOptions = () => {
        switch (searchType) {
            case "group": return groupOptions
            case "imsi": return imsiOptions
            case "street_light_name": return nameOptions
            default: return []
        }
    }

    return (
        <div className="flex flex-col gap-2 h-[calc(100vh-64px)] overflow-hidden">
            {/* Header / Filter Bar */}
            <FilterSidebar
                searchType={searchType}
                setSearchType={(val) => { setSearchType(val); setSearchValue("ALL"); }}
                searchValue={searchValue}
                setSearchValue={setSearchValue}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                onSearch={handleSearch}
                dataOptions={currentOptions()}
                devices={devices}
            />

            {/* Map Area */}
            <div className="flex-1 relative order-2 min-h-0 px-0 pb-0">
                <MapContainerComponent
                    mode={mapMode}
                    onlineUrl={onlineUrl}
                    offlineUrl={offlineUrl}
                    devices={devices}
                />

                {/* Floating Loading Indicator */}
                {isLoading && (
                    <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-[1000] flex items-center justify-center">
                        <div className="bg-background p-4 rounded-lg shadow-lg flex items-center gap-2">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            <span className="font-medium">{t("loading")}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
