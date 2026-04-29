"use client"

import { useState, useMemo, useCallback } from "react"
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { GroupConfigData } from "@/types/group-config"
import { configLatLongLampAndPoleAction } from "@/app/actions/group-config"
import { toast } from "sonner"
import { Loader2, FileSpreadsheet, Upload, ChevronLeft, ChevronRight } from "lucide-react"

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

const PREVIEW_PAGE_SIZE = 5

/**
 * Attempt to decode an ArrayBuffer as UTF-8. If the result contains
 * the Unicode replacement character (U+FFFD), fall back to Windows-874
 * (Thai) encoding. This handles CSV files exported from Excel in Thai
 * locale which use the legacy TIS-620 / Windows-874 code page.
 */
const decodeFileBuffer = (buffer: ArrayBuffer): string => {
    const utf8 = new TextDecoder("utf-8").decode(buffer)

    // U+FFFD appears when the byte sequence is invalid UTF-8
    if (!utf8.includes("\uFFFD")) return utf8

    try {
        return new TextDecoder("windows-874").decode(buffer)
    } catch {
        // If the browser doesn't support windows-874 fall back to UTF-8
        return utf8
    }
}

export function EditDeviceCsvDialog({ open, onOpenChange, group }: EditDeviceCsvDialogProps) {
    const t = useTranslations("GroupConfig.editCsvDialog")
    const [file, setFile] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)
    const [deviceData, setDeviceData] = useState<DeviceUpdateData[]>([])
    const [progress, setProgress] = useState(0)
    const [previewPage, setPreviewPage] = useState(0)

    const previewTotalPages = useMemo(
        () => Math.max(1, Math.ceil(deviceData.length / PREVIEW_PAGE_SIZE)),
        [deviceData.length],
    )

    const paginatedData = useMemo(
        () => deviceData.slice(previewPage * PREVIEW_PAGE_SIZE, (previewPage + 1) * PREVIEW_PAGE_SIZE),
        [deviceData, previewPage],
    )

    const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (!selectedFile) return

        setFile(selectedFile)

        const buffer = await selectedFile.arrayBuffer()
        const text = decodeFileBuffer(buffer)
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
        setPreviewPage(0)
    }, [t])

    const handleUpload = useCallback(async () => {
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
    }, [deviceData, onOpenChange, t])

    const handleDownloadTemplate = useCallback(() => {
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
    }, [])

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[95vw] sm:max-w-[700px] max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-lg">
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
                            <div className="relative flex-1">
                                <Input
                                    id="csv-update-file"
                                    type="file"
                                    accept=".csv,.txt"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 w-full h-full opacity-0 disabled:opacity-0 cursor-pointer z-10"
                                    disabled={uploading}
                                />
                                <div className={`flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background ${uploading ? "opacity-50 cursor-not-allowed" : ""}`}>
                                    <div className="bg-secondary text-secondary-foreground hover:bg-secondary/80 px-3 py-1 rounded-md text-xs font-medium mr-3 whitespace-nowrap transition-colors">
                                        {t("chooseFile")}
                                    </div>
                                    <span className="text-muted-foreground truncate">
                                        {file ? file.name : t("noFileChosen")}
                                    </span>
                                </div>
                            </div>
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
                        <div className="rounded-md bg-muted p-4 space-y-4">
                            <div className="flex items-center gap-2 text-sm font-medium">
                                <FileSpreadsheet className="h-4 w-4" />
                                {t("totalFound", { count: deviceData.length })}
                            </div>

                            {/* Preview Table */}
                            <div className="rounded-md border bg-background">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[40px] text-center">#</TableHead>
                                            <TableHead>{t("previewHeaders.deviceId")}</TableHead>
                                            <TableHead>{t("previewHeaders.latitude")}</TableHead>
                                            <TableHead>{t("previewHeaders.longitude")}</TableHead>
                                            <TableHead>{t("previewHeaders.poleName")}</TableHead>
                                            <TableHead>{t("previewHeaders.govName")}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedData.map((row, idx) => (
                                            <TableRow key={`${row.imsi}-${previewPage}-${idx}`}>
                                                <TableCell className="text-center text-muted-foreground">
                                                    {previewPage * PREVIEW_PAGE_SIZE + idx + 1}
                                                </TableCell>
                                                <TableCell className="font-mono text-xs">{row.imsi}</TableCell>
                                                <TableCell className="text-xs">{row.lat_lamp}</TableCell>
                                                <TableCell className="text-xs">{row.long_lamp}</TableCell>
                                                <TableCell className="text-xs">{row.name_pole}</TableCell>
                                                <TableCell className="text-xs">{row.name_gov}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Pagination */}
                            {previewTotalPages > 1 && (
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span>
                                        {t("previewPagination", {
                                            page: previewPage + 1,
                                            totalPages: previewTotalPages,
                                        })}
                                    </span>
                                    <div className="flex gap-1">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-7 w-7 cursor-pointer"
                                            disabled={previewPage === 0}
                                            onClick={() => setPreviewPage(p => p - 1)}
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-7 w-7 cursor-pointer"
                                            disabled={previewPage >= previewTotalPages - 1}
                                            onClick={() => setPreviewPage(p => p + 1)}
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {uploading && (
                                <div className="space-y-2">
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
