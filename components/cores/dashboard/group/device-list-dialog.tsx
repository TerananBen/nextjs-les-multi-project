"use client"

import { useState, useMemo } from "react"
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
import { Search, LightbulbOff, WifiOff, ChevronLeft, ChevronRight, Inbox } from "lucide-react"
import { useTranslations } from "next-intl"
import { DashboardDeviceItem } from "@/app/actions/dashboard"

interface DeviceListDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  type: "rtu" | "internet"
  devices: DashboardDeviceItem[]
}

export function DeviceListDialog({
  open,
  onOpenChange,
  title,
  type,
  devices,
}: DeviceListDialogProps) {
  const t = useTranslations("GroupDashboard.summary")
  const [searchQuery, setSearchQuery] = useState("")
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(10)

  const filteredDevices = useMemo(() => {
    if (!searchQuery.trim()) return devices
    const q = searchQuery.toLowerCase()
    return devices.filter(
      (d) =>
        d.SN.toLowerCase().includes(q) ||
        d.street_name.toLowerCase().includes(q) ||
        d.group.toLowerCase().includes(q)
    )
  }, [devices, searchQuery])

  const pageCount = Math.max(1, Math.ceil(filteredDevices.length / pageSize))
  const current = Math.min(pageIndex, pageCount - 1)

  const paginatedDevices = useMemo(() => {
    const start = current * pageSize
    return filteredDevices.slice(start, start + pageSize)
  }, [filteredDevices, current, pageSize])

  const handleSearchChange = (val: string) => {
    setSearchQuery(val)
    setPageIndex(0)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl sm:max-w-6xl w-[95vw] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 sm:p-6 border-b border-border/80 bg-muted/30">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-lg shrink-0 ${
                type === "rtu"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-orange-500/10 text-orange-600 dark:text-orange-400"
              }`}
            >
              {type === "rtu" ? (
                <LightbulbOff className="h-5 w-5" />
              ) : (
                <WifiOff className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
                <span>{title}</span>
                <Badge variant="secondary" className="font-mono text-xs">
                  {filteredDevices.length}
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {t("deviceTable.totalItems", { count: filteredDevices.length })}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Filter and Search Bar */}
        <div className="p-3.5 sm:px-6 border-b border-border/60 bg-background flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder={t("deviceTable.searchPlaceholder")}
              className="pl-9 h-9 text-sm bg-muted/30"
            />
          </div>
        </div>

        {/* Table with generous margin/padding from Dialog edges */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0 bg-muted/10">
          <div className="rounded-lg border border-border/80 bg-card shadow-2xs overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50 sticky top-0 z-10">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-12 text-center text-xs">#</TableHead>
                  <TableHead className="text-xs font-semibold">{t("deviceTable.sn")}</TableHead>
                  <TableHead className="text-xs font-semibold">
                    {t("deviceTable.streetName")}
                  </TableHead>
                  <TableHead className="text-xs font-semibold">{t("deviceTable.group")}</TableHead>
                  <TableHead className="text-xs font-semibold">
                    {t("deviceTable.coordinates")}
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    {t("deviceTable.voltage")}
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    {t("deviceTable.wattage")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedDevices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-48 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Inbox className="h-8 w-8 text-muted-foreground/40" />
                        <p className="text-sm">{t("deviceTable.noData")}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedDevices.map((device, index) => {
                    const rowNum = current * pageSize + index + 1
                    return (
                      <TableRow
                        key={device.SN || `dev-${rowNum}`}
                        className="hover:bg-muted/40 transition-colors"
                      >
                        <TableCell className="text-center font-mono text-xs text-muted-foreground">
                          {rowNum}
                        </TableCell>
                        <TableCell className="font-mono text-xs font-medium text-foreground">
                          {device.SN || "-"}
                        </TableCell>
                        <TableCell className="text-sm text-foreground">
                          {device.street_name || "-"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">
                          {device.group || "-"}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                          {device.lat && device.lat !== "-" ? `${device.lat}, ${device.lng}` : "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs tabular-nums text-foreground">
                          {device.volt}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs tabular-nums text-foreground">
                          {device.watt}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Pagination Section (Matching setting-control/street-light) */}
        <div className="p-3.5 sm:px-6 border-t border-border/80 bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex flex-wrap items-center gap-4">
            <span>
              {t("deviceTable.totalDevice")} {filteredDevices.length}
            </span>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">{t("deviceTable.rowsPerPage")}</span>
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
                        {end < pageCount - 1 && (
                          <span className="text-muted-foreground px-1">...</span>
                        )}
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
