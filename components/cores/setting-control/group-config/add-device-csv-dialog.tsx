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
import { addRtuToGroupAction } from "@/app/actions/group-config"
import { toast } from "sonner"
import { Loader2, FileSpreadsheet, Upload, ChevronLeft, ChevronRight, Plus } from "lucide-react"

interface AddDeviceCsvDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    group: GroupConfigData
}

const PREVIEW_PAGE_SIZE = 10

/**
 * Attempt to decode an ArrayBuffer as UTF-8. If the result contains
 * the Unicode replacement character (U+FFFD), fall back to Windows-874
 * (Thai) encoding.
 */
const decodeFileBuffer = (buffer: ArrayBuffer): string => {
    const utf8 = new TextDecoder("utf-8").decode(buffer)
    if (!utf8.includes("\uFFFD")) return utf8

    try {
        return new TextDecoder("windows-874").decode(buffer)
    } catch {
        return utf8
    }
}

export function AddDeviceCsvDialog({ open, onOpenChange, group }: AddDeviceCsvDialogProps) {
    const t = useTranslations("GroupConfig.csvDialog")
    const [file, setFile] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)
    const [imsis, setImsis] = useState<string[]>([])
    const [progress, setProgress] = useState(0)
    const [previewPage, setPreviewPage] = useState(0)

    const previewTotalPages = useMemo(
        () => Math.max(1, Math.ceil(imsis.length / PREVIEW_PAGE_SIZE)),
        [imsis.length],
    )

    const paginatedImsis = useMemo(
        () => imsis.slice(previewPage * PREVIEW_PAGE_SIZE, (previewPage + 1) * PREVIEW_PAGE_SIZE),
        [imsis, previewPage],
    )

    const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (!selectedFile) return

        setFile(selectedFile)

        const buffer = await selectedFile.arrayBuffer()
        const text = decodeFileBuffer(buffer)
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
        setPreviewPage(0)
    }, [t])

    const handleUpload = useCallback(async () => {
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
    }, [imsis, group.group_code, group.group_name, onOpenChange, t])

    const handleDownloadTemplate = useCallback(() => {
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
    }, [])

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[520px] max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
                <DialogHeader className="px-6 py-4 border-b shrink-0 text-left">
                    <DialogTitle className="text-lg font-semibold flex items-center justify-start gap-2 text-left">
                        <Plus className="h-5 w-5 text-primary shrink-0" />
                        {t("title")}
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        {t("title")}
                    </DialogDescription>
                    <div className="text-sm text-muted-foreground text-left">
                        {t("groupLabel", { defaultValue: "กลุ่ม" })}: <span className="font-medium text-foreground">{group.group_name}</span>
                        {group.sub_district && group.sub_district !== "-" ? (
                            <span className="text-muted-foreground"> ({group.sub_district})</span>
                        ) : null}
                    </div>
                </DialogHeader>

                <div className="p-6 overflow-y-auto flex-1 space-y-4">
                    <div className="flex flex-col gap-4">
                        <Label htmlFor="csv-file">{t("selectFile")}</Label>
                        <div className="flex gap-2 items-center">
                            <div className="relative flex-1">
                                <Input
                                    id="csv-file"
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
                                className="cursor-pointer px-3 whitespace-nowrap h-10"
                                title={t("downloadTemplate")}
                            >
                                <FileSpreadsheet className="h-4 w-4" />
                                <span className="ml-2 hidden sm:inline">{t("downloadTemplate")}</span>
                            </Button>
                        </div>
                    </div>

                    {imsis.length > 0 && (
                        <div className="rounded-md bg-muted p-4 space-y-4">
                            <div className="flex items-center gap-2 text-sm font-medium">
                                <FileSpreadsheet className="h-4 w-4" />
                                {t("totalFound", { count: imsis.length })}
                            </div>

                            {/* Preview Table */}
                            <div className="rounded-md border bg-background">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[40px] text-center">#</TableHead>
                                            <TableHead>{t("previewHeaders.deviceId")}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedImsis.map((imsi, idx) => (
                                            <TableRow key={`${imsi}-${previewPage}-${idx}`}>
                                                <TableCell className="text-center text-muted-foreground">
                                                    {previewPage * PREVIEW_PAGE_SIZE + idx + 1}
                                                </TableCell>
                                                <TableCell className="font-mono text-xs">{imsi}</TableCell>
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

                <DialogFooter className="px-6 py-4 border-t shrink-0 bg-muted/20">
                    <Button className="cursor-pointer" variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
                        {t("cancel")}
                    </Button>
                    <Button
                        onClick={handleUpload}
                        className="cursor-pointer"
                        disabled={!file || imsis.length === 0 || uploading}
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
