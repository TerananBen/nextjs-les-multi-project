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
import { configLatLongLampAndPoleAction } from "@/app/actions/group-config"
import { toast } from "sonner"
import { Loader2, FileSpreadsheet, Upload } from "lucide-react"

interface EditDeviceCsvDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    group: GroupConfigData
}

interface DeviceUpdateData {
    imsi: string
    lat_lamp: string
    long_lamp: string
    name_pole: string
    name_gov: string
}

export function EditDeviceCsvDialog({ open, onOpenChange, group }: EditDeviceCsvDialogProps) {
    const t = useTranslations("GroupConfig.editCsvDialog")
    const [file, setFile] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)
    const [deviceData, setDeviceData] = useState<DeviceUpdateData[]>([])
    const [progress, setProgress] = useState(0)

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (selectedFile) {
            setFile(selectedFile)
            const text = await selectedFile.text()
            const lines = text.split(/\r\n|\n/)

            const extractedData: DeviceUpdateData[] = []

            // Skip header if it exists (simple check for "Device ID" or similar)
            const startIndex = lines[0]?.toLowerCase().includes("device id") ? 1 : 0

            for (let i = startIndex; i < lines.length; i++) {
                const line = lines[i].trim()
                if (!line) continue

                const parts = line.split(",")
                if (parts.length >= 5) {
                    const [imsi, lat_lamp, long_lamp, name_pole, name_gov] = parts.map(s => s.trim())

                    if (imsi && lat_lamp && long_lamp && name_pole && name_gov) {
                        extractedData.push({
                            imsi,
                            lat_lamp,
                            long_lamp,
                            name_pole,
                            name_gov
                        })
                    }
                }
            }

            if (extractedData.length === 0) {
                toast.error(t("noDataFound"))
                setFile(null)
                setDeviceData([])
                return
            }

            setDeviceData(extractedData)
        }
    }

    const handleUpload = async () => {
        if (!deviceData.length) return
        setUploading(true)
        setProgress(0)

        let successCount = 0
        let failureCount = 0

        for (let i = 0; i < deviceData.length; i++) {
            const data = deviceData[i]
            try {
                const result = await configLatLongLampAndPoleAction(data)
                if (result.result) {
                    successCount++
                } else {
                    failureCount++
                }
            } catch (error) {
                console.error("Error updating device:", data.imsi, error)
                failureCount++
            }
            setProgress(Math.round(((i + 1) / deviceData.length) * 100))
            await new Promise(resolve => setTimeout(resolve, 250))
        }

        setUploading(false)
        if (failureCount === 0) {
            toast.success(t("uploadSuccess", { count: successCount }))
            onOpenChange(false)
            setFile(null)
            setDeviceData([])
        } else {
            toast.warning(t("uploadPartial", { success: successCount, failed: failureCount }))
        }
    }

    const handleDownloadTemplate = () => {
        const header = "Device ID, Latitude, Longitude, Pole Name, Gov Name"
        const row1 = "IMEI000002, 14.030682, 100.321522, LES-SOLAR-01, 0001"
        const csvContent = `${header}\n${row1}`
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
        const link = document.createElement("a")
        const url = URL.createObjectURL(blob)
        link.setAttribute("href", url)
        link.setAttribute("download", "template_update_devices.csv")
        link.style.visibility = "hidden"
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[95vw] sm:max-w-[500px] p-4 sm:p-6 rounded-lg">
                <DialogHeader>
                    <DialogTitle>{t("title")}</DialogTitle>
                    <DialogDescription>
                        {t("description", { groupName: group.group_name })}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    <div className="flex flex-col gap-4">
                        <Label htmlFor="csv-update-file">{t("selectFile")}</Label>
                        <div className="flex gap-2 items-center">
                            <Input
                                id="csv-update-file"
                                type="file"
                                accept=".csv,.txt"
                                onChange={handleFileChange}
                                className="cursor-pointer file:cursor-pointer flex-1 h-10"
                                disabled={uploading}
                            />
                            <Button
                                variant="outline"
                                onClick={handleDownloadTemplate}
                                className="cursor-pointer text-blue-600 border-blue-200 hover:bg-blue-50 px-3 whitespace-nowrap h-10"
                                title={t("downloadTemplate")}
                            >
                                <FileSpreadsheet className="h-4 w-4" />
                                <span className="ml-2 hidden sm:inline">{t("downloadTemplate")}</span>
                            </Button>
                        </div>
                    </div>

                    {deviceData.length > 0 && (
                        <div className="rounded-md bg-muted p-4">
                            <div className="flex items-center gap-2 text-sm font-medium">
                                <FileSpreadsheet className="h-4 w-4" />
                                {t("totalFound", { count: deviceData.length })}
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
                    <Button className="cursor-pointer" variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
                        {t("cancel")}
                    </Button>
                    <Button
                        className="cursor-pointer"
                        onClick={handleUpload}
                        disabled={!file || deviceData.length === 0 || uploading}
                    >
                        {uploading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {t("uploading")}
                            </>
                        ) : (
                            <>
                                <Upload className="cursor-pointer mr-2 h-4 w-4" />
                                {t("upload")}
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
