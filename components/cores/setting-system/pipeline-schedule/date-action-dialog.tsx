"use client"

import * as React from "react"
import { format } from "date-fns"
import { th, enUS } from "date-fns/locale"
import { DateRange } from "react-day-picker"
import { Calendar as CalendarIcon, Loader2, RotateCcw, Wrench } from "lucide-react"
import { useTranslations, useLocale } from "next-intl"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import type { DashboardPipelineItem, DateActionConfirmPayload } from "@/types/pipeline-schedule"

interface DateActionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: DashboardPipelineItem | null
  actionType: "repair" | "restore"
  onConfirm: (item: DashboardPipelineItem, payload: DateActionConfirmPayload) => Promise<void>
}

export function DateActionDialog({
  open,
  onOpenChange,
  item,
  actionType,
  onConfirm,
}: DateActionDialogProps) {
  const t = useTranslations(
    actionType === "repair" ? "PipelineSchedule.repairDialog" : "PipelineSchedule.restoreDialog"
  )
  const tCommon = useTranslations("PipelineSchedule.dialog")
  const locale = useLocale()
  const [isLoading, setIsLoading] = React.useState(false)
  const [reprocessDashboard, setReprocessDashboard] = React.useState(false)

  // Normalize bounds: minDate to 00:00:00.000 so createdAt day is fully selectable
  const minDate = React.useMemo(() => {
    if (!item?.createdAt) return undefined
    const d = new Date(item.createdAt)
    if (isNaN(d.getTime())) return undefined
    d.setHours(0, 0, 0, 0)
    return d
  }, [item?.createdAt])

  // maxDate to 23:59:59.999
  const maxDate = React.useMemo(() => {
    if (!item?.lastRunAt) {
      const today = new Date()
      today.setHours(23, 59, 59, 999)
      return today
    }
    const d = new Date(item.lastRunAt)
    if (isNaN(d.getTime())) {
      const today = new Date()
      today.setHours(23, 59, 59, 999)
      return today
    }
    d.setHours(23, 59, 59, 999)
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    return d > today ? d : today
  }, [item?.lastRunAt])

  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(() => {
    const today = new Date()
    return { from: today, to: today }
  })

  // Reset date range to current date when dialog opens
  React.useEffect(() => {
    if (open) {
      const today = new Date()
      setDateRange({ from: today, to: today })
      setReprocessDashboard(false)
    }
  }, [open])

  const formatDayDisplay = (d: Date) => {
    if (locale === "th") {
      return d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })
    }
    return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })
  }

  const isDateDisabled = (date: Date) => {
    const check = new Date(date)
    check.setHours(12, 0, 0, 0)
    if (minDate && check < minDate) return true
    if (maxDate && check > maxDate) return true
    return false
  }

  const handleConfirm = async () => {
    if (!item || !dateRange?.from) return
    setIsLoading(true)
    try {
      const startDate = format(dateRange.from, "yyyy-MM-dd")
      const endDate = format(dateRange.to || dateRange.from, "yyyy-MM-dd")
      const isSingleDay =
        !dateRange.to || format(dateRange.from, "yyyy-MM-dd") === format(dateRange.to, "yyyy-MM-dd")
      await onConfirm(item, {
        startDate,
        endDate,
        targetDate: isSingleDay ? startDate : undefined,
        isSingleDay,
        reprocessDashboard: actionType === "restore" ? reprocessDashboard : undefined,
        projectId: item?.projects?.[0]?.id || item?.id,
      })
      onOpenChange(false)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[95vw] p-0 overflow-hidden rounded-xl">
        <DialogHeader className="p-4 sm:p-5 border-b border-border/80 bg-muted/30">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "p-2.5 rounded-lg shrink-0",
                actionType === "repair"
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  : "bg-sky-500/10 text-sky-600 dark:text-sky-400"
              )}
            >
              {actionType === "repair" ? (
                <Wrench className="h-5 w-5" />
              ) : (
                <RotateCcw className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base sm:text-lg font-semibold">{t("title")}</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5 truncate">
                {item?.name}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-4 sm:p-5 space-y-4">
          {/* Top Date Range Info Box (Item 11 & 12) */}
          {(minDate || maxDate) && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 rounded-lg bg-muted/40 border border-border/70 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground font-medium">{t("startDate")}:</span>
                <span className="font-semibold text-foreground">
                  {minDate ? formatDayDisplay(minDate) : "-"}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground font-medium">{t("latestDate")}:</span>
                <span className="font-semibold text-foreground">
                  {maxDate ? formatDayDisplay(maxDate) : "-"}
                </span>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">{t("dateLabel")}</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "cursor-pointer h-10 w-full pl-3 pr-2 text-left font-normal bg-background shadow-xs text-sm flex items-center justify-between",
                    !dateRange?.from && "text-muted-foreground"
                  )}
                >
                  <span className="truncate mr-2">
                    {dateRange?.from ? (
                      dateRange.to &&
                      format(dateRange.from, "yyyy-MM-dd") !==
                        format(dateRange.to, "yyyy-MM-dd") ? (
                        <>
                          {formatDayDisplay(dateRange.from)} - {formatDayDisplay(dateRange.to)}
                        </>
                      ) : (
                        formatDayDisplay(dateRange.from)
                      )
                    ) : (
                      t("pickDate")
                    )}
                  </span>
                  <CalendarIcon className="h-4 w-4 opacity-50 shrink-0" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={setDateRange}
                  locale={locale === "th" ? th : enUS}
                  disabled={isDateDisabled}
                  initialFocus
                  defaultMonth={dateRange?.from || minDate}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Item 2: Reprocess Dashboard Checkbox for Restore */}
          {actionType === "restore" && (
            <div className="flex items-center space-x-2 pt-1">
              <Checkbox
                id="reprocessDashboard"
                checked={reprocessDashboard}
                onCheckedChange={(checked) => setReprocessDashboard(Boolean(checked))}
                className="cursor-pointer"
              />
              <label
                htmlFor="reprocessDashboard"
                className="text-xs font-medium text-foreground cursor-pointer select-none"
              >
                {t("reprocessDashboard")}
              </label>
            </div>
          )}
        </div>

        <DialogFooter className="p-4 sm:px-5 sm:py-3.5 border-t border-border/80 bg-muted/20 flex flex-row items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="cursor-pointer h-9 px-4 text-xs font-medium"
          >
            {tCommon("cancel")}
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading || !dateRange?.from}
            className={cn(
              "cursor-pointer h-9 px-4 text-xs font-medium",
              actionType === "repair"
                ? "bg-amber-600 hover:bg-amber-700 text-white"
                : "bg-sky-600 hover:bg-sky-700 text-white"
            )}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                {t("processing")}
              </>
            ) : (
              t("confirm")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
