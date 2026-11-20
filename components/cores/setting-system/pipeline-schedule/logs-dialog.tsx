"use client"

import * as React from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Search,
    ScrollText,
    ChevronLeft,
    ChevronRight,
    Inbox,
    Loader2,
    CheckCircle2,
    XCircle,
    Minus,
} from "lucide-react"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import { getPipelineLogs } from "@/app/actions/pipeline-schedule"
import type { PipelineLogItem } from "@/types/pipeline-schedule"
import type { ProjectConfig } from "@/config/projects/types"

interface PipelineLogsDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    projects: ProjectConfig[]
}

export function PipelineLogsDialog({
    open,
    onOpenChange,
    projects,
}: PipelineLogsDialogProps) {
    const t = useTranslations("PipelineSchedule.logsDialog")
    const [logs, setLogs] = React.useState<PipelineLogItem[]>([])
    const [isLoading, setIsLoading] = React.useState(false)
    const [searchQuery, setSearchQuery] = React.useState("")
    const [projectFilter, setProjectFilter] = React.useState("ALL")
    // Item 1: Default limit is 50
    const [limit, setLimit] = React.useState<number>(50)
    const [pageIndex, setPageIndex] = React.useState(0)
    const [pageSize, setPageSize] = React.useState(10)

    const fetchLogs = React.useCallback(async () => {
        setIsLoading(true)
        try {
            const projName = projectFilter === "ALL" ? undefined : projectFilter
            const data = await getPipelineLogs(projName, limit)
            setLogs(data)
        } catch (error) {
            console.error("Failed to fetch pipeline logs:", error)
        } finally {
            setIsLoading(false)
        }
    }, [projectFilter, limit])

    React.useEffect(() => {
        if (open) {
            fetchLogs()
        }
    }, [open, fetchLogs])

    const filteredLogs = React.useMemo(() => {
        return logs.filter((log) => {
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase()
                const matchProject = log.projectName?.toLowerCase().includes(q)
                const matchTargetDate = log.targetDate?.toLowerCase().includes(q)
                const matchError = log.errorMessage?.toLowerCase().includes(q)
                const matchStep1 = log.step1Status?.toLowerCase().includes(q)
                const matchStep2 = log.step2Status?.toLowerCase().includes(q)
                const matchStep3 = log.step3Status?.toLowerCase().includes(q)
                if (!matchProject && !matchTargetDate && !matchError && !matchStep1 && !matchStep2 && !matchStep3) {
                    return false
                }
            }
            return true
        })
    }, [logs, searchQuery])

    const pageCount = Math.max(1, Math.ceil(filteredLogs.length / pageSize))
    const current = Math.min(pageIndex, pageCount - 1)

    const paginatedLogs = React.useMemo(() => {
        const start = current * pageSize
        return filteredLogs.slice(start, start + pageSize)
    }, [filteredLogs, current, pageSize])

    const handleSearchChange = (val: string) => {
        setSearchQuery(val)
        setPageIndex(0)
    }

    // Approach 1: Inline Horizontal Badge (Single Line: [Status · Time])
    const renderStepCell = (status?: string, count?: number) => {
        if (!status || status.trim() === "" || status === "-" || status.toUpperCase() === "NONE") {
            return <span className="text-muted-foreground text-xs font-mono">-</span>
        }

        const upper = status.toUpperCase()
        const isSuccess = upper === "SUCCESS" || upper === "COMPLETED"
        const isFailed = upper === "FAILED" || upper === "ERROR"
        const isRunning = upper === "RUNNING" || upper === "PROCESSING"
        const isPending = upper === "PENDING" || upper === "WAITING"
        const isSkipped = upper === "SKIPPED"

        const label = isSuccess
            ? t("success")
            : isFailed
            ? t("failed")
            : isRunning
            ? t("running")
            : isPending
            ? t("pending")
            : isSkipped
            ? t("skipped")
            : status

        const countText = typeof count === "number" ? `${count.toLocaleString()} ms` : null

        return (
            <div className="flex items-center justify-center">
                <Badge
                    variant="outline"
                    className={cn(
                        "inline-flex items-center gap-1.5 h-6 px-2 text-xs font-normal whitespace-nowrap shadow-2xs transition-colors",
                        isSuccess && "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
                        isFailed && "border-destructive/30 bg-destructive/10 text-destructive",
                        isRunning && "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400",
                        (isPending || isSkipped) && "border-border bg-muted/40 text-muted-foreground",
                        !isSuccess && !isFailed && !isRunning && !isPending && !isSkipped && "border-border bg-muted/40 text-foreground"
                    )}
                >
                    {isSuccess && <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-600 dark:text-emerald-400" />}
                    {isFailed && <XCircle className="h-3 w-3 shrink-0 text-destructive" />}
                    {isRunning && <Loader2 className="h-3 w-3 shrink-0 text-sky-600 dark:text-sky-400 animate-spin" />}
                    {isSkipped && <Minus className="h-3 w-3 shrink-0 text-muted-foreground" />}

                    <span className="font-medium">{label}</span>

                    {countText && (
                        <>
                            <span className="opacity-40 select-none">·</span>
                            <span className="font-mono text-[11px] tabular-nums font-normal opacity-90">
                                {countText}
                            </span>
                        </>
                    )}
                </Badge>
            </div>
        )
    }

    const formatTimestamp = (dateStr?: string) => {
        if (!dateStr) return "-"
        try {
            const d = new Date(dateStr)
            if (isNaN(d.getTime())) return dateStr
            return d.toLocaleString("th-TH", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
            })
        } catch {
            return dateStr
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl sm:max-w-6xl w-[95vw] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden rounded-xl">
                {/* Header (No refresh button, No count badge in title) */}
                <DialogHeader className="p-4 sm:p-5 border-b border-border/80 bg-muted/30">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2.5 rounded-lg shrink-0 bg-primary/10 text-primary">
                            <ScrollText className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <DialogTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
                                <span>{t("title")}</span>
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground mt-0.5 truncate">
                                {t("description")}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                {/* Filter and Search Bar with Project and Limit selectors */}
                <div className="p-3.5 sm:px-6 border-b border-border/60 bg-background flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            value={searchQuery}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            placeholder={t("searchPlaceholder")}
                            className="pl-9 h-9 text-xs sm:text-sm bg-background"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Project Filter */}
                        <Select
                            value={projectFilter}
                            onValueChange={(val) => {
                                setProjectFilter(val)
                                setPageIndex(0)
                            }}
                        >
                            <SelectTrigger className="h-9 w-[160px] sm:w-[180px] text-xs cursor-pointer">
                                <SelectValue placeholder={t("allProjects")} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL" className="cursor-pointer text-xs">
                                    {t("allProjects")}
                                </SelectItem>
                                {projects.map((p) => {
                                    const code = p.code || p.name || p.id
                                    return (
                                        <SelectItem key={p.id} value={code} className="cursor-pointer text-xs">
                                            {p.name}
                                        </SelectItem>
                                    )
                                })}
                            </SelectContent>
                        </Select>

                        {/* Limit Select (Default: 50) */}
                        <Select
                            value={String(limit)}
                            onValueChange={(val) => {
                                setLimit(Number(val))
                                setPageIndex(0)
                            }}
                        >
                            <SelectTrigger className="h-9 w-[110px] text-xs cursor-pointer">
                                <SelectValue placeholder={`Limit: ${limit}`} />
                            </SelectTrigger>
                            <SelectContent>
                                {[20, 50, 100, 200, 500].map((l) => (
                                    <SelectItem key={l} value={String(l)} className="cursor-pointer text-xs">
                                        Limit: {l}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Table with generous margin/padding from Dialog edges */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0 bg-muted/10">
                    <div className="rounded-lg border border-border/80 bg-card shadow-2xs overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/50 sticky top-0 z-10">
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="w-12 text-center text-xs">#</TableHead>
                                    <TableHead className="text-xs font-semibold">{t("colExecutedAt")}</TableHead>
                                    <TableHead className="text-xs font-semibold">{t("colProject")}</TableHead>
                                    <TableHead className="text-xs font-semibold">{t("colTargetDate")}</TableHead>
                                    <TableHead className="text-xs font-semibold text-center">{t("colStep1")}</TableHead>
                                    <TableHead className="text-xs font-semibold text-center">{t("colStep2")}</TableHead>
                                    <TableHead className="text-xs font-semibold text-center">{t("colStep3")}</TableHead>
                                    <TableHead className="text-xs font-semibold text-right">{t("colDuration")}</TableHead>
                                    <TableHead className="text-xs font-semibold">{t("colOthers")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="h-48 text-center text-muted-foreground">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                                                <p className="text-xs">{t("description")}...</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : paginatedLogs.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="h-48 text-center text-muted-foreground">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <Inbox className="h-8 w-8 text-muted-foreground/40" />
                                                <p className="text-sm">{t("noData")}</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedLogs.map((log, index) => {
                                        const rowNum = current * pageSize + index + 1
                                        return (
                                            <TableRow key={log.id || `log-${rowNum}`} className="hover:bg-muted/40 transition-colors">
                                                <TableCell className="text-center font-mono text-xs text-muted-foreground">
                                                    {rowNum}
                                                </TableCell>
                                                <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                                                    {formatTimestamp(log.executedAt || log.startedAt || log.createdAt)}
                                                </TableCell>
                                                <TableCell className="text-xs font-medium text-foreground">
                                                    <Badge variant="outline" className="text-xs font-normal bg-background">
                                                        {log.projectName || "-"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="font-mono text-xs text-foreground whitespace-nowrap">
                                                    {log.targetDate || "-"}
                                                </TableCell>
                                                {/* Redesigned Step 1 with status badge & duration badge */}
                                                <TableCell className="text-center">
                                                    {renderStepCell(log.step1Status, log.step1ItemCount)}
                                                </TableCell>
                                                {/* Redesigned Step 2 with status badge & duration badge, or "-" if absent */}
                                                <TableCell className="text-center">
                                                    {renderStepCell(log.step2Status, log.step2ItemCount)}
                                                </TableCell>
                                                {/* Redesigned Step 3 with status badge & duration badge, or "-" if absent */}
                                                <TableCell className="text-center">
                                                    {renderStepCell(log.step3Status, log.step3GroupCount)}
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-xs tabular-nums text-foreground font-medium whitespace-nowrap">
                                                    {typeof log.durationMs === "number" ? `${log.durationMs.toLocaleString()} ms` : "-"}
                                                </TableCell>
                                                <TableCell className="text-xs max-w-[240px] truncate" title={log.errorMessage || ""}>
                                                    {log.errorMessage ? (
                                                        <span className="text-destructive text-xs">{log.errorMessage}</span>
                                                    ) : (
                                                        <span className="text-muted-foreground">-</span>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                {/* Pagination Section (Matching DeviceListDialog from dashboard/group) */}
                <div className="p-3.5 sm:px-6 border-t border-border/80 bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
                    <div className="flex flex-wrap items-center gap-4">
                        <span>
                            {t("totalLogs")} {filteredLogs.length}
                        </span>
                        <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium">{t("rowsPerPage")}</span>
                            <Select
                                value={`${pageSize}`}
                                onValueChange={(value) => {
                                    setPageSize(Number(value))
                                    setPageIndex(0)
                                }}
                            >
                                <SelectTrigger className="h-8 w-[70px] cursor-pointer">
                                    <SelectValue placeholder={pageSize} />
                                </SelectTrigger>
                                <SelectContent side="top">
                                    {[10, 20, 30, 40, 50].map((size) => (
                                        <SelectItem key={size} value={`${size}`} className="cursor-pointer">
                                            {size}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Pagination Controls */}
                    <div className="flex items-center space-x-2">
                        <Button
                            variant="outline"
                            className="h-8 w-8 p-0 cursor-pointer"
                            onClick={() => setPageIndex((prev) => Math.max(0, prev - 1))}
                            disabled={current <= 0}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>

                        <div className="flex items-center gap-1">
                            {(() => {
                                const maxVisible = 5
                                let start = Math.max(0, current - Math.floor(maxVisible / 2))
                                const end = Math.min(pageCount, start + maxVisible)
                                start = Math.max(0, end - maxVisible)

                                const pages: number[] = []
                                for (let i = start; i < end; i++) pages.push(i)

                                return (
                                    <>
                                        {start > 0 && (
                                            <>
                                                <Button
                                                    variant="outline"
                                                    className="h-8 w-8 p-0 cursor-pointer"
                                                    onClick={() => setPageIndex(0)}
                                                >
                                                    1
                                                </Button>
                                                {start > 1 && <span className="text-muted-foreground px-1">...</span>}
                                            </>
                                        )}
                                        {pages.map((p) => (
                                            <Button
                                                key={p}
                                                variant={current === p ? "default" : "outline"}
                                                className="h-8 w-8 p-0 cursor-pointer"
                                                onClick={() => setPageIndex(p)}
                                            >
                                                {p + 1}
                                            </Button>
                                        ))}
                                        {end < pageCount && (
                                            <>
                                                {end < pageCount - 1 && <span className="text-muted-foreground px-1">...</span>}
                                                <Button
                                                    variant="outline"
                                                    className="h-8 w-8 p-0 cursor-pointer"
                                                    onClick={() => setPageIndex(pageCount - 1)}
                                                >
                                                    {pageCount}
                                                </Button>
                                            </>
                                        )}
                                    </>
                                )
                            })()}
                        </div>

                        <Button
                            variant="outline"
                            className="h-8 w-8 p-0 cursor-pointer"
                            onClick={() => setPageIndex((prev) => Math.min(pageCount - 1, prev + 1))}
                            disabled={current >= pageCount - 1}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
