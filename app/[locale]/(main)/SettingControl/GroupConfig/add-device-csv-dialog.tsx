"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { GroupConfigData } from "@/types/group-config"
import { addRtuToGroupAction } from "@/app/actions/group-config"
import { toast } from "sonner"
import { Loader2, FileSpreadsheet, Upload, CheckCircle2, AlertCircle } from "lucide-react"

interface AddDeviceCsvDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    group: GroupConfigData
}

export function AddDeviceCsvDialog({ open, onOpenChange, group }: AddDeviceCsvDialogProps) {
    const t = useTranslations("GroupConfig.csvDialog")
    const [file, setFile] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)
    const [imsis, setImsis] = useState<string[]>([])
    const [progress, setProgress] = useState(0)

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (selectedFile) {
            setFile(selectedFile)
            const text = await selectedFile.text()
            const lines = text.split(/\r\n|\n/)
            // Simple parsing: extract text from each line
            const extractedIds = lines
                .map(line => line.trim())
                .filter(line => line.length > 0)
                // Filter out header row if it exists
                .filter(line => line.toLowerCase() !== "device id" && line.toLowerCase() !== "imsi")
                // Allow alphanumeric (letters and numbers)
                .filter(line => /^[a-zA-Z0-9]+$/.test(line))

            if (extractedIds.length === 0) {
                toast.error(t("noDeviceIdFound"))
                setFile(null)
                setImsis([])
                return
            }

            setImsis(extractedIds)
        }
    }

    const handleUpload = async () => {
        if (!imsis.length) return
        setUploading(true)
        setProgress(0)

        let successCount = 0
        let failureCount = 0

        for (let i = 0; i < imsis.length; i++) {
            const imsi = imsis[i]
            try {
                const result = await addRtuToGroupAction({
                    group_code: group.group_code,
                    group_name: group.group_name,
                    imsi: imsi
                })
                if (result.result) {
                    successCount++
                } else {
                    failureCount++
                }
            } catch (error) {
                console.error("Error adding IMSI:", imsi, error)
                failureCount++
            }
            setProgress(Math.round(((i + 1) / imsis.length) * 100))
            await new Promise(resolve => setTimeout(resolve, 250))
        }

        setUploading(false)
        if (failureCount === 0) {
            toast.success(t("uploadSuccess", { count: successCount }))
            onOpenChange(false)
            setFile(null)
            setImsis([])
        } else {
            toast.warning(t("uploadPartial", { success: successCount, failed: failureCount }))
        }
    }

    const handleDownloadTemplate = () => {
        const csvContent = "Device ID\n123456789012345\n987654321098765"
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
        const link = document.createElement("a")
        const url = URL.createObjectURL(blob)
        link.setAttribute("href", url)
        link.setAttribute("download", "template_devices.csv")
        link.style.visibility = "hidden"
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{t("title")}</DialogTitle>
                    <DialogDescription>
                        {t("description", { groupName: group.group_name })}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    <div className="flex flex-col gap-4">
                        <Label htmlFor="csv-file">{t("selectFile")}</Label>
                        <div className="flex gap-2 items-center">
                            <Input
                                id="csv-file"
                                type="file"
                                accept=".csv,.txt"
                                onChange={handleFileChange}
                                className="cursor-pointer file:cursor-pointer flex-1 h-10"
                                disabled={uploading}
                            />
                            <Button
                                variant="outline"
                                onClick={handleDownloadTemplate}
                                className="text-blue-600 border-blue-200 hover:bg-blue-50 px-3 whitespace-nowrap h-10"
                                title={t("downloadTemplate")}
                            >
                                <FileSpreadsheet className="h-4 w-4" />
                                <span className="ml-2 hidden sm:inline">{t("downloadTemplate")}</span>
                            </Button>
                        </div>
                    </div>

                    {imsis.length > 0 && (
                        <div className="rounded-md bg-muted p-4">
                            <div className="flex items-center gap-2 text-sm font-medium">
                                <FileSpreadsheet className="h-4 w-4" />
                                {t("totalFound", { count: imsis.length })}
                            </div>
                            {uploading && (
                                <div className="mt-4 space-y-2">
                                    <div className="h-2 w-full rounded-full bg-secondary">
                                        <div
                                            className="h-full rounded-full bg-primary transition-all duration-300"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground text-center">{progress}%</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
                        {t("cancel")}
                    </Button>
                    <Button
                        onClick={handleUpload}
                        disabled={!file || imsis.length === 0 || uploading}
                    >
                        {uploading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {t("uploading")}
                            </>
                        ) : (
                            <>
                                <Upload className="mr-2 h-4 w-4" />
                                {t("upload")}
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
