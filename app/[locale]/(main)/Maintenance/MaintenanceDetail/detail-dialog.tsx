"use client"

import { useTranslations } from "next-intl"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, X } from "lucide-react"
import { MaintenanceDetailRecord, MaintenanceImageRecord, getDetailDataMaintenance, getLoadImage } from "@/app/actions/maintenance"
import dynamic from "next/dynamic"
import { DetailDataTable } from "./detail-table"
import { DetailImage } from "./detail-image"
import { getLeafletIconUrl, MarkerBadge, MarkerColor } from "@/lib/map-icons"

const DetailMap = dynamic(() => import("./detail-map").then(m => ({ default: m.DetailMap })), { ssr: false })

interface DetailDialogProps {
    detailId: string | null
    mapMode?: "online" | "offline" | undefined
    mapOfflineUrl?: string
    defaultLat?: string
    defaultLng?: string
    defaultZoom?: string
    iconScale: string
    googleMapsApiKey?: string
    onClose: () => void
}

export function DetailDialog({ detailId, mapMode, mapOfflineUrl, defaultLat, defaultLng, defaultZoom, iconScale, googleMapsApiKey, onClose }: DetailDialogProps) {
    const t = useTranslations("MaintenanceDashboard")
    const tMap = useTranslations("MapGlobal")
    const [data, setData] = useState<MaintenanceDetailRecord[]>([])
    const [images, setImages] = useState<MaintenanceImageRecord[]>([])
    const [loading, setLoading] = useState(false)
    const [loadingImages, setLoadingImages] = useState(false)

    // Using a counter to force re-fetches when images change
    const [imageRefreshTrigger, setImageRefreshTrigger] = useState(0)

    function LegendItem({ icons, text }: { icons: { color: MarkerColor, badge: MarkerBadge }[], text: string }) {
        return (
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 min-w-[30px]">
                    {icons.map((icon, idx) => (
                        <div key={idx} className="flex items-center">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={getLeafletIconUrl(icon.color, icon.badge)} className="w-6 h-6 object-contain" alt="" />
                            {idx < icons.length - 1 && <span className="text-gray-400 mx-0.5 text-xs">|</span>}
                        </div>
                    ))}
                </div>
                <span>{text}</span>
            </div>
        )
    }

    useEffect(() => {
        if (!detailId) {
            setData([])
            setImages([])
            return
        }

        const fetchDetail = async () => {
            setLoading(true)
            try {
                const res = await getDetailDataMaintenance(detailId)
                if (res) {
                    setData(res)
                } else {
                    setData([])
                }
            } catch (err) {
                console.error("Error fetching detail:", err)
                setData([])
            } finally {
                setLoading(false)
            }
        }

        fetchDetail()
    }, [detailId])

    useEffect(() => {
        if (!detailId) return

        const fetchImages = async () => {
            setLoadingImages(true)
            try {
                const res = await getLoadImage(detailId)
                if (res) {
                    setImages(res)
                } else {
                    setImages([])
                }
            } catch (err) {
                console.error("Error fetching images:", err)
                setImages([])
            } finally {
                setLoadingImages(false)
            }
        }

        fetchImages()
    }, [detailId, imageRefreshTrigger])

    return (
        <Dialog open={!!detailId} onOpenChange={(open) => {
            if (!open) onClose()
        }}>
            <DialogContent className="w-[95vw] md:max-w-[80vw] lg:max-w-[70vw] xl:max-w-[1200px] max-h-[90vh] overflow-y-auto p-0 border shadow-xl">
                <DialogHeader className="p-4 border-b flex flex-row items-center justify-between bg-white sticky top-0 z-10">
                    <DialogTitle className="text-xl text-slate-600 font-medium tracking-wide">
                        {t("detail.title", { defaultMessage: "Maintenance Detail" })}
                    </DialogTitle>
                    <DialogClose asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 !mt-0 relative left-1 text-gray-500 hover:text-black">
                            <X className="h-5 w-5" />
                        </Button>
                    </DialogClose>
                </DialogHeader>

                <div className="p-6">
                    {/* Legend */}
                    <div className="bg-slate-100 flex items-center gap-6 p-3 rounded-md mb-6 w-full text-sm text-gray-500 font-medium">
                        <LegendItem icons={[{ color: "blue", badge: "A" }]} text={tMap("legend.disconnect")} />
                        <LegendItem icons={[{ color: "green", badge: "⚡" }]} text={tMap("legend.abnormal")} />
                        <LegendItem icons={[{ color: "red", badge: null }]} text={tMap("legend.failure")} />
                    </div>

                    {/* Map Section */}
                    <div className="h-[300px] mb-6 rounded-md overflow-hidden border relative z-0">
                        <DetailMap data={data} mapMode={mapMode} mapOfflineUrl={mapOfflineUrl} defaultLat={defaultLat} defaultLng={defaultLng} defaultZoom={defaultZoom} iconScale={iconScale} googleMapsApiKey={googleMapsApiKey} />
                    </div>

                    {/* Table Section */}
                    <div className="min-h-[150px] relative">
                        {loading && (
                            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50">
                                <Loader2 className="animate-spin h-8 w-8 text-slate-400" />
                            </div>
                        )}
                        <DetailDataTable data={data} detailId={detailId} />
                    </div>

                    {/* Image Upload Gallery Section */}
                    {detailId && (
                        <DetailImage
                            detailId={detailId}
                            images={images}
                            loadingImages={loadingImages}
                            onImagesChanged={() => setImageRefreshTrigger(prev => prev + 1)}
                        />
                    )}

                    {/* Footer Close Button */}
                    <div className="flex justify-end pt-4 pb-2">
                        <Button
                            variant="ghost"
                            onClick={onClose}
                            className="font-bold text-gray-700 hover:bg-slate-100"
                        >
                            {t("detail.close", { defaultMessage: "Close" })}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
