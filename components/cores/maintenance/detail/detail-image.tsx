"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Loader2, X, Image as ImageIcon, Upload, Trash2, Check } from "lucide-react"
import { MaintenanceImageRecord, uploadImageAction, deleteImageAction } from "@/app/actions/maintenance"
import { ConfirmButton } from "@/components/ui/confirm-button"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface DetailImageProps {
    detailId: string
    images: MaintenanceImageRecord[]
    loadingImages: boolean
    canWrite?: boolean
    canControl?: boolean
    onImagesChanged: () => void
}

export function DetailImage({
    detailId,
    images,
    loadingImages,
    canWrite = true,
    canControl = true,
    onImagesChanged
}: DetailImageProps) {
    const t = useTranslations("MaintenanceDashboard")
    const [previewImage, setPreviewImage] = useState<string | null>(null)
    const [uploading, setUploading] = useState(false)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!canWrite) {
            toast.error(t("detail.permissionDenied") || t("messages.permissionDenied", { defaultMessage: "ไม่มีสิทธิ์ในการดำเนินการนี้" }))
            return
        }
        const file = e.target.files?.[0]
        if (!file || !detailId) return

        const allowedTypes = ['image/jpeg', 'image/png']
        if (!allowedTypes.includes(file.type)) {
            toast.error(t("detail.invalidImage", { defaultMessage: "Unsupported image format. Please upload .jpg or .png only." }))
            e.target.value = ''
            return
        }

        setUploading(true)
        try {
            const reader = new FileReader()
            reader.readAsDataURL(file)
            reader.onload = async () => {
                const base64String = reader.result as string

                const res = await uploadImageAction({ id: detailId, img_base64_string: base64String })

                if (res.success) {
                    toast.success(t("detail.uploadSuccess", { defaultMessage: "Image uploaded successfully" }))
                    onImagesChanged()
                } else {
                    toast.error(res.message || t("detail.uploadError", { defaultMessage: "Failed to upload image" }))
                }
                setUploading(false)
                e.target.value = ''
            }
        } catch (error) {
            console.error("Error uploading image:", error)
            toast.error(t("detail.uploadError", { defaultMessage: "Failed to upload image" }))
            setUploading(false)
            e.target.value = ''
        }
    }

    const handleDelete = async (idList: string, idImg: string) => {
        if (!canControl && !canWrite) {
            toast.error(t("detail.permissionDenied") || t("messages.permissionDenied", { defaultMessage: "ไม่มีสิทธิ์ในการดำเนินการนี้" }))
            return
        }
        setDeletingId(idImg)
        try {
            const res = await deleteImageAction({ id_list: idList, id_img: idImg })

            if (res.success) {
                toast.success(t("detail.deleteSuccess", { defaultMessage: "Image deleted successfully" }))
                onImagesChanged()
            } else {
                toast.error(res.message || t("detail.deleteError", { defaultMessage: "Failed to delete image" }))
            }
        } catch (error) {
            console.error("Error deleting image:", error)
            toast.error(t("detail.deleteError", { defaultMessage: "Failed to delete image" }))
        } finally {
            setDeletingId(null)
        }
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">{t("detail.repairImage")}</h3>
                </div>

                <div className="flex items-center gap-2">
                    <label
                        htmlFor={canWrite ? "image-upload" : undefined}
                        className={cn(canWrite ? "cursor-pointer" : "opacity-50 cursor-not-allowed")}
                    >
                        <div className={cn(
                            "flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium shadow-2xs",
                            canWrite ? "hover:bg-primary/90 transition-colors" : "opacity-50 pointer-events-none"
                        )}>
                            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                            {t("detail.addImage", { defaultMessage: "Add Image" })}
                        </div>
                        {canWrite && (
                            <input
                                id="image-upload"
                                type="file"
                                accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                                className="hidden"
                                onChange={handleFileChange}
                                disabled={uploading || !canWrite}
                            />
                        )}
                    </label>
                </div>
            </div>

            {loadingImages ? (
                <div className="flex items-center justify-center p-12 bg-muted/20 rounded-lg border border-dashed text-muted-foreground">
                    <Loader2 className="animate-spin h-6 w-6 text-primary mr-2" />
                    <span className="text-xs">{t("loading")}</span>
                </div>
            ) : images.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                    {images.map((img) => (
                        <div
                            key={img.id_img}
                            className="relative group rounded-lg overflow-hidden border bg-muted/30 shadow-2xs aspect-video cursor-pointer transition-all hover:shadow-md"
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
                                    target.src = '/placeholder-image.png'
                                    target.parentElement?.classList.add('bg-muted')
                                }}
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                <ImageIcon className="text-white opacity-0 group-hover:opacity-100 h-7 w-7 drop-shadow-md transition-opacity" />
                            </div>

                            {/* Delete Button */}
                            <div className="absolute top-2 left-2 z-10" onClick={(e) => e.stopPropagation()}>
                                {canWrite ? (
                                    <ConfirmButton
                                        initialLabel={<Trash2 className="h-3.5 w-3.5" />}
                                        confirmLabel={<Check className="h-3.5 w-3.5" />}
                                        onConfirm={() => handleDelete(img.id_list, img.id_img)}
                                        onCancel={() => toast.info(t("detail.deleteCancelled", { defaultMessage: "Delete cancelled" }))}
                                        variant="destructive"
                                        size="icon"
                                        className="h-7 w-7 rounded-full cursor-pointer shadow-md"
                                        loading={deletingId === img.id_img}
                                    />
                                ) : (
                                    <Button
                                        disabled
                                        variant="destructive"
                                        size="icon"
                                        className="h-7 w-7 rounded-full shadow-md opacity-50 cursor-not-allowed"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center p-12 bg-muted/20 rounded-lg border border-dashed text-muted-foreground">
                    <ImageIcon className="h-9 w-9 mb-2 text-muted-foreground/40" />
                    <span className="text-xs font-medium">{t("detail.noImages", { defaultMessage: "No images available" })}</span>
                </div>
            )}

            {/* Fullscreen Preview */}
            {previewImage && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4"
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
                            className="cursor-pointer absolute -top-10 right-0 h-9 w-9 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
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
        </div>
    )
}
