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

        fetchDetail()
        fetchImages()
    }, [detailId])

    return (
        <Dialog open={!!detailId} onOpenChange={(open) => {
            if (!open) onClose()
        }}>
            <DialogContent className="w-[95vw] md:max-w-[80vw] lg:max-w-[60vw] max-h-[90vh] overflow-y-auto p-0 border shadow-xl">
                <DialogHeader className="p-4 border-b flex flex-row items-center justify-between bg-white sticky top-0 z-10">
                    <DialogTitle className="text-xl text-slate-600 font-medium tracking-wide">
                        {t("detail.title")}
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

                    {/* Table */}
                    <div className="min-h-[200px] mb-8 relative">
                        {loading && (
                            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50">
                                <Loader2 className="animate-spin h-8 w-8 text-slate-400" />
                            </div>
                        )}
                        <DetailDataTable
                            columns={columns}
                            data={data}
                            loading={loading}
                        />
                    </div>

                    {/* Repair Report Image */}
                    <div className="border-t pt-6 mb-8">
                        <h3 className="text-lg text-slate-600 font-medium mb-4">{t("detail.repairImage")}</h3>
                        {loadingImages ? (
                            <div className="flex items-center justify-center p-8 bg-slate-50 rounded-lg border border-dashed">
                                <Loader2 className="animate-spin h-6 w-6 text-slate-400 mr-2" />
                            </div>
                        ) : images.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {images.map((img) => (
                                    <div
                                        key={img.id_img}
                                        className="relative group rounded-lg overflow-hidden border shadow-sm aspect-video bg-slate-100 cursor-pointer transition-all hover:shadow-md"
                                        onClick={() => setPreviewImage(img.path_img)}
                                    >
                                        <Image
                                            src={img.path_img}
                                            alt={`Repair image ${img.id_img}`}
                                            fill
                                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                target.onerror = null;
                                                target.src = '/placeholder-image.png';
                                                target.parentElement?.classList.add('bg-slate-200');
                                            }}
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                            <ImageIcon className="text-white opacity-0 group-hover:opacity-100 h-8 w-8 drop-shadow-md transition-opacity" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center p-8 bg-slate-50 rounded-lg border border-dashed text-gray-400">
                                <ImageIcon className="h-10 w-10 mb-2 opacity-50" />
                                <span className="text-sm">{t("detail.noImages")}</span>
                            </div>
                        )}
                    </div>

                    {/* Footer Close Button */}
                    <div className="flex justify-end pt-4 pb-2">
                        <Button
                            variant="ghost"
                            onClick={onClose}
                            className="font-bold text-gray-700 hover:bg-slate-100"
                        >
                            {t("detail.close")}
                        </Button>
                    </div>
                </div>

                {/* Fullscreen Preview */}
                {previewImage && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80" onClick={() => setPreviewImage(null)}>
                        <div className="relative w-full max-w-4xl max-h-[90vh] aspect-video">
                            <Image
                                src={previewImage}
                                alt="Preview Fullscreen"
                                fill
                                className="object-contain"
                            />
                            <Button
                                variant="ghost"
                                size="icon"
                                className="cursor-pointer absolute top-2 right-2 h-10 w-10 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setPreviewImage(null)
                                }}
                            >
                                <X className="h-6 w-6" />
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
