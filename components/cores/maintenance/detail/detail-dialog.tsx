"use client"

import { useTranslations } from "next-intl"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Wrench, Image as ImageIcon, MapPin } from "lucide-react"
import { MaintenanceDetailRecord, MaintenanceImageRecord, getDetailDataMaintenance, getLoadImage } from "@/app/actions/maintenance"
import dynamic from "next/dynamic"
import { DetailDataTable } from "./detail-table"
import { DetailImage } from "./detail-image"
import { getLeafletIconUrl, MarkerBadge, MarkerColor } from "@/lib/map-icons"

const DetailMap = dynamic(() => import("./detail-map").then(m => ({ default: m.DetailMap })), {
    ssr: false,
    loading: () => (
        <div className="h-full w-full flex items-center justify-center bg-muted/20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
    )
})

interface DetailDialogProps {
    detailId: string | null
    mapMode?: "online" | "offline"
    mapOfflineUrl?: string
    defaultLat?: string
    defaultLng?: string
    defaultZoom?: string
    iconScale?: string
    googleMapsApiKey?: string
    onClose: () => void
}

function LegendItem({ icons, text }: { icons: { color: MarkerColor, badge: MarkerBadge }[], text: string }) {
    return (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-0.5 min-w-[24px]">
                {icons.map((icon, idx) => (
                    <div key={idx} className="flex items-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={getLeafletIconUrl(icon.color, icon.badge)} className="w-5 h-5 object-contain" alt="" />
                        {idx < icons.length - 1 && <span className="text-muted-foreground/40 mx-0.5 text-[10px]">|</span>}
                    </div>
                ))}
            </div>
            <span>{text}</span>
        </div>
    )
}

export function DetailDialog({
    detailId,
    mapMode = "offline",
    mapOfflineUrl = "",
    defaultLat = "13.736717",
    defaultLng = "100.523186",
    defaultZoom = "14",
    iconScale = "1",
    googleMapsApiKey = "",
    onClose
}: DetailDialogProps) {
    const tMap = useTranslations("MapGlobal")
    const tDetail = useTranslations("MaintenanceDetail")
    const [data, setData] = useState<MaintenanceDetailRecord[]>([])
    const [images, setImages] = useState<MaintenanceImageRecord[]>([])
    const [loading, setLoading] = useState(false)
    const [loadingImages, setLoadingImages] = useState(false)
    const [activeTab, setActiveTab] = useState("tasks")

    const [imageRefreshTrigger, setImageRefreshTrigger] = useState(0)

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
                setData(res || [])
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
                setImages(res || [])
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
        <Dialog open={!!detailId} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[95vw] md:max-w-[95vw] lg:max-w-[85vw] xl:max-w-[1240px] h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
                {/* Dialog Header */}
                <DialogHeader className="px-6 py-4 border-b shrink-0 text-left">
                    <DialogTitle className="text-lg font-semibold flex items-center justify-start gap-2 text-left">
                        <Wrench className="h-5 w-5 text-primary shrink-0" />
                        {tDetail("dialog.title")}
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        {tDetail("dialog.title")}
                    </DialogDescription>
                    <div className="text-sm text-muted-foreground text-left">
                        {tDetail("dialog.description")}
                    </div>
                </DialogHeader>

                {/* Dialog Body with Tabs */}
                <div className="p-4 sm:p-6 flex flex-col flex-1 min-h-0 overflow-hidden">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
                        <div className="flex items-center justify-between pb-3 border-b shrink-0">
                            <TabsList className="h-9 p-1 bg-muted/60">
                                <TabsTrigger value="tasks" className="text-xs font-medium cursor-pointer gap-1.5 data-[state=active]:bg-background">
                                    <MapPin className="h-3.5 w-3.5" />
                                    {tDetail("tabs.tasks")}
                                    <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 font-medium">
                                        {data.length}
                                    </Badge>
                                </TabsTrigger>
                                <TabsTrigger value="gallery" className="text-xs font-medium cursor-pointer gap-1.5 data-[state=active]:bg-background">
                                    <ImageIcon className="h-3.5 w-3.5" />
                                    {tDetail("tabs.gallery")}
                                    <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 font-medium">
                                        {images.length}
                                    </Badge>
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        {/* Tab 1: Map & Tasks */}
                        <TabsContent value="tasks" className="flex flex-col flex-1 min-h-0 gap-3 mt-3 outline-none overflow-y-auto">
                            {/* Legend row */}
                            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 px-3 py-1.5 bg-muted/40 rounded-lg border text-xs font-medium shrink-0">
                                <LegendItem icons={[{ color: "blue", badge: "A" }]} text={tMap("legend.disconnect")} />
                                <LegendItem icons={[{ color: "green", badge: "⚡" }]} text={tMap("legend.abnormal")} />
                                <LegendItem icons={[{ color: "red", badge: null }]} text={tMap("legend.failure")} />
                            </div>

                            {/* Map Section */}
                            <div className="h-[240px] lg:h-[260px] rounded-lg overflow-hidden border shrink-0 relative shadow-2xs">
                                <DetailMap
                                    data={data}
                                    mapMode={mapMode}
                                    mapOfflineUrl={mapOfflineUrl}
                                    defaultLat={defaultLat}
                                    defaultLng={defaultLng}
                                    defaultZoom={defaultZoom}
                                    iconScale={iconScale}
                                    googleMapsApiKey={googleMapsApiKey}
                                />
                            </div>

                            {/* Table Section */}
                            <div className="flex-1 min-h-0 relative">
                                {loading ? (
                                    <div className="flex items-center justify-center p-12 bg-muted/20 rounded-lg border text-muted-foreground">
                                        <Loader2 className="animate-spin h-6 w-6 text-primary mr-2" />
                                        <span className="text-xs font-medium">{tDetail("loading")}</span>
                                    </div>
                                ) : (
                                    <DetailDataTable data={data} detailId={detailId} />
                                )}
                            </div>
                        </TabsContent>

                        {/* Tab 2: Gallery */}
                        <TabsContent value="gallery" className="flex flex-col flex-1 min-h-0 mt-3 outline-none overflow-y-auto">
                            {detailId && (
                                <DetailImage
                                    detailId={detailId}
                                    images={images}
                                    loadingImages={loadingImages}
                                    onImagesChanged={() => setImageRefreshTrigger(prev => prev + 1)}
                                />
                            )}
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Dialog Footer */}
                <DialogFooter className="px-6 py-3.5 border-t shrink-0 bg-muted/20 flex flex-row items-center justify-end gap-2.5">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="cursor-pointer shadow-2xs"
                    >
                        {tDetail("dialog.close")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
