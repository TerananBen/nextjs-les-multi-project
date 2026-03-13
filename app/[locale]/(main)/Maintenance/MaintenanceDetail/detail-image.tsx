"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Loader2, X, Image as ImageIcon, Upload, Trash2 } from "lucide-react"
import { MaintenanceImageRecord, uploadImageAction, deleteImageAction } from "@/app/actions/maintenance"
import { toast } from "sonner"

interface DetailImageProps {
    detailId: string
    images: MaintenanceImageRecord[]
    loadingImages: boolean
    onImagesChanged: () => void
}

export function DetailImage({ detailId, images, loadingImages, onImagesChanged }: DetailImageProps) {
    const t = useTranslations("MaintenanceDashboard")
    const [previewImage, setPreviewImage] = useState<string | null>(null)
    const [uploading, setUploading] = useState(false)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !detailId) return

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

    const handleDelete = async (e: React.MouseEvent, idList: string, idImg: string) => {
        e.stopPropagation()
        if (!confirm(t("detail.confirmDelete", { defaultMessage: "Are you sure you want to delete this image?" }))) {
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
        <div className="border-t pt-6 mb-8 mt-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg text-slate-600 font-medium">{t("detail.repairImage")}</h3>
                
                <div className="flex items-center gap-2">
                    <label htmlFor="image-upload" className="cursor-pointer">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors border border-blue-200 text-sm font-medium">
                            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                            {t("detail.addImage", { defaultMessage: "Add Image" })}
                        </div>
                        <input 
                            id="image-upload" 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={handleFileChange}
                            disabled={uploading}
                        />
                    </label>
                </div>
            </div>

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
                            
                            {/* Delete Button */}
                            <Button
                                variant="destructive"
                                size="icon"
                                className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => handleDelete(e, img.id_list, img.id_img)}
                                disabled={deletingId === img.id_img}
                            >
                                {deletingId === img.id_img ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                    <Trash2 className="h-3 w-3" />
                                )}
                            </Button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center p-8 bg-slate-50 rounded-lg border border-dashed text-gray-400">
                    <ImageIcon className="h-10 w-10 mb-2 opacity-50" />
                    <span className="text-sm">{t("detail.noImages", { defaultMessage: "No images available" })}</span>
                </div>
            )}

            {/* Fullscreen Preview */}
            {previewImage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={() => setPreviewImage(null)}>
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
                            className="absolute top-2 right-2 h-10 w-10 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
                            onClick={(e) => {
                                e.stopPropagation();
                                setPreviewImage(null);
                            }}
                        >
                            <X className="h-6 w-6" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
