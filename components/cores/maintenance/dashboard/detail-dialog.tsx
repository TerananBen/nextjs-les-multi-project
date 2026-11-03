"use client"

import { useTranslations } from "next-intl"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Loader2, X, Image as ImageIcon } from "lucide-react"
import { MaintenanceDetailRecord, MaintenanceImageRecord, getDetailDataMaintenance, getLoadImage } from "@/app/actions/maintenance"
import { DetailDataTable } from "./detail-data-table"
import { useMaintenanceDetailColumns } from "./detail-columns"
import { getLeafletIconUrl, MarkerBadge, MarkerColor } from "@/lib/map-icons"

interface DetailDialogProps {
    detailId: string | null
    onClose: () => void
}

export function DetailDialog({ detailId, onClose }: DetailDialogProps) {
    const t = useTranslations("MaintenanceDashboard")
    const tMap = useTranslations("MapGlobal")
    const columns = useMaintenanceDetailColumns()
    const [data, setData] = useState<MaintenanceDetailRecord[]>([])
    const [images, setImages] = useState<MaintenanceImageRecord[]>([])
    const [loading, setLoading] = useState(false)
    const [loadingImages, setLoadingImages] = useState(false)
    const [previewImage, setPreviewImage] = useState<string | null>(null)

    function LegendItem({ icons, text }: { icons: { color: MarkerColor; badge: MarkerBadge }[]; text: string }) {
        return (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="flex items-center gap-0.5">
                    {icons.map((icon, idx) => (
                        <div key={idx} className="flex items-center">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={getLeafletIconUrl(icon.color, icon.badge)} className="w-4 h-4 object-contain" alt="" />
                            {idx < icons.length - 1 && <span className="text-muted-foreground/60 mx-0.5 text-xs">|</span>}
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
                setData(res || [])
            } catch (err) {
                console.error("Error fetching detail:", err)
                setData([])
            } finally {
                setLoading(false)
            }
        }

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

        fetchDetail()
        fetchImages()
    }, [detailId])

    return (
        <Dialog
            open={!!detailId}
            onOpenChange={(open) => {
                if (!open) onClose()
            }}
        >
            <DialogContent className="w-[95vw] md:max-w-4xl lg:max-w-5xl max-h-[90vh] overflow-y-auto p-0 border border-border/80 bg-background shadow-xl rounded-xl">
                <DialogHeader className="p-4 border-b border-border/80 flex flex-row items-center justify-between bg-muted/30 sticky top-0 z-10">
                    <DialogTitle className="text-lg font-semibold tracking-tight text-foreground">
                        {t("detail.title")}
                    </DialogTitle>
                    <DialogClose asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 !mt-0 text-muted-foreground hover:text-foreground">
                            <X className="h-4 w-4" />
                        </Button>
                    </DialogClose>
                </DialogHeader>

                <div className="p-4 space-y-5">
                    {/* Compact Legend Chips */}
                    <div className="bg-muted/40 border border-border/60 flex flex-wrap items-center gap-4 px-3 py-2 rounded-lg">
                        <span className="text-xs font-semibold text-foreground uppercase tracking-wider">สัญลักษณ์:</span>
                        <LegendItem icons={[{ color: "blue", badge: "A" }]} text={tMap("legend.disconnect")} />
                        <LegendItem icons={[{ color: "green", badge: "⚡" }]} text={tMap("legend.abnormal")} />
                        <LegendItem icons={[{ color: "red", badge: null }]} text={tMap("legend.failure")} />
                    </div>

                    {/* Table */}
                    <div className="relative rounded-lg border border-border/80 overflow-hidden bg-card">
                        {loading && (
                            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-xs">
                                <Loader2 className="animate-spin h-6 w-6 text-primary" />
                            </div>
                        )}
                        <DetailDataTable
                            columns={columns}
                            data={data}
                            loading={loading}
                        />
                    </div>

                    {/* Repair Report Image */}
                    <div className="border-t border-border/80 pt-4">
                        <h4 className="text-sm font-semibold text-foreground mb-3">{t("detail.repairImage")}</h4>
                        {loadingImages ? (
                            <div className="flex items-center justify-center p-8 bg-muted/20 rounded-lg border border-dashed border-border/80">
                                <Loader2 className="animate-spin h-5 w-5 text-primary mr-2" />
                                <span className="text-xs text-muted-foreground">{t("loading")}</span>
                            </div>
                        ) : images.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                {images.map((img) => (
                                    <div
                                        key={img.id_img}
                                        className="relative group rounded-lg overflow-hidden border border-border/80 shadow-xs aspect-video bg-muted/40 cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
                                        onClick={() => setPreviewImage(img.path_img)}
                                    >
                                        <Image
                                            src={img.path_img}
                                            alt={`Repair image ${img.id_img}`}
                                            fill
                                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement
                                                target.onerror = null
                                                target.src = "/placeholder-image.png"
                                            }}
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                            <ImageIcon className="text-white opacity-0 group-hover:opacity-100 h-6 w-6 drop-shadow-md transition-opacity" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center p-6 bg-muted/20 rounded-lg border border-dashed border-border/80 text-muted-foreground">
                                <ImageIcon className="h-8 w-8 mb-1.5 opacity-40" />
                                <span className="text-xs">{t("detail.noImages")}</span>
                            </div>
                        )}
                    </div>

                    {/* Footer Close Button */}
                    <div className="flex justify-end pt-2 border-t border-border/80">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onClose}
                            className="cursor-pointer"
                        >
                            {t("detail.close")}
                        </Button>
                    </div>
                </div>

                {/* Fullscreen Preview Lightbox */}
                {previewImage && (
                    <div
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-xs p-4"
                        onClick={() => setPreviewImage(null)}
                    >
                        <div className="relative w-full max-w-4xl max-h-[85vh] aspect-video">
                            <Image
                                src={previewImage}
                                alt="Preview Fullscreen"
                                fill
                                className="object-contain"
                            />
                            <Button
                                variant="ghost"
                                size="icon"
                                className="cursor-pointer absolute top-2 right-2 h-9 w-9 bg-black/50 hover:bg-black/80 text-white rounded-full transition-colors"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setPreviewImage(null)
                                }}
                            >
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
