"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Combobox,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
} from "@/components/ui/combobox"
import { DateRange } from "react-day-picker"
import { GroupItem } from "@/app/actions/dashboard"
import { Printer, Search, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Loader2, X } from "lucide-react"
import { useTranslations, useLocale } from "next-intl"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { differenceInDays, format, startOfWeek, endOfWeek, subDays, subWeeks } from "date-fns"
import { th, enUS } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface FilterBarProps {
    defaultGroupCode?: string
    groups: GroupItem[],
    isLoadingGroups?: boolean,
    startDate?: string,
    onSearch: (groupCode: string, type: string, date: string) => void,
    onPrint?: () => void,
    isGeneratingPdf?: boolean
}

export function FilterBar({ defaultGroupCode, groups, isLoadingGroups, startDate, onSearch, onPrint, isGeneratingPdf }: FilterBarProps) {
    const t = useTranslations("GroupDashboard.filter")
    const locale = useLocale()
    const [selectedGroup, setSelectedGroup] = useState<string>(defaultGroupCode || "")

    const allGroupsLabel = t("allGroups", { defaultValue: "ALL" })
    const groupOptions = useMemo(() => {
        const hasDefault = groups.some(g => (defaultGroupCode && g.group_code === defaultGroupCode) || g.group_name?.toUpperCase() === "ALL" || g.group_name === "ทุกกลุ่ม")
        const rawList = hasDefault
            ? groups.map(g => ((defaultGroupCode && g.group_code === defaultGroupCode) || g.group_name?.toUpperCase() === "ALL" || g.group_name === "ทุกกลุ่ม") ? { ...g, group_name: allGroupsLabel } : g)
            : [
                {
                    group_code: defaultGroupCode || "ALL",
                    group_name: allGroupsLabel,
                    sub_district: "-",
                    total_rtu: "0"
                },
                ...groups
            ]

        // Deduplicate by group_name to prevent duplicate select values and keys
        const seen = new Set<string>()
        const dedupedGroups: typeof rawList = []
        for (const g of rawList) {
            const nameKey = (g.group_name || "").trim().toUpperCase()
            if (nameKey && !seen.has(nameKey)) {
                seen.add(nameKey)
                dedupedGroups.push(g)
            }
        }
        return dedupedGroups
    }, [groups, defaultGroupCode, allGroupsLabel])
    const [selectedType, setSelectedType] = useState<string>("Month")
    // State for Week picker (Single Date) — default: any day in last week
    const [singleDate, setSingleDate] = useState<Date | undefined>(() => subWeeks(new Date(), 1))
    // State for Day picker (Date Range) — default: yesterday
    const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
        const yesterday = subDays(new Date(), 1)
        return { from: yesterday, to: yesterday }
    })

    // Parse Project Start Date
    const projectStartDateStr = startDate || "2020-01-01"
    const projectStartDate = new Date(projectStartDateStr)
    const startYear = projectStartDate.getFullYear()
    const startMonthVal = projectStartDate.getMonth() // 0-11
    // startQuarter is 1-4
    const startQuarter = Math.floor(startMonthVal / 3) + 1

    // Years for dropdown (Current down to Start Year)
    const currentYear = new Date().getFullYear()
    // Ensure we at least show current year if start date is future (edge case) 
    // or if start year is same as current.
    const yearCount = Math.max(1, currentYear - startYear + 1)
    const years = Array.from({ length: yearCount }, (_, i) => currentYear - i)

    // We'll use separate states for complex pickers to make UI handling easier
    // State for Month picker (month range as {from, to} with 1st of month dates)
    const [monthRange, setMonthRange] = useState<{ from?: Date; to?: Date }>({
        from: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    })
    const [monthPickerYear, setMonthPickerYear] = useState(currentYear)

    // State for Quarter picker (quarter range as {from, to} with {year, quarter})
    const currentQuarter = Math.floor(new Date().getMonth() / 3) + 1
    const [quarterRange, setQuarterRange] = useState<{ from?: { year: number; quarter: number }; to?: { year: number; quarter: number } }>({
        from: { year: currentYear, quarter: currentQuarter }
    })
    const [quarterPickerYear, setQuarterPickerYear] = useState(currentYear)

    // State for Year picker (year range as {from, to})
    const [yearRange, setYearRange] = useState<{ from?: number; to?: number }>({
        from: currentYear
    })

    const handleSearch = () => {
        if (selectedGroup && selectedType) {
            let searchDate = ""

            if (selectedType === "Day" && dateRange?.from) {
                const start = format(dateRange.from, "yyyy-MM-dd")
                if (dateRange.to) {
                    const end = format(dateRange.to, "yyyy-MM-dd")
                    if (start === end) {
                        searchDate = start
                    } else {
                        searchDate = `${start},${end}`
                    }
                } else {
                    searchDate = start
                }
            } else if (selectedType === "Now" && monthRange?.from) {
                searchDate = format(new Date(), "yyyy-MM");
            } else if (selectedType === "Month" && monthRange?.from) {
                const startStr = format(monthRange.from, "yyyy-MM")
                if (monthRange.to) {
                    const endStr = format(monthRange.to, "yyyy-MM")
                    if (startStr === endStr) {
                        searchDate = startStr
                    } else {
                        searchDate = `${startStr}_${endStr}`
                    }
                } else {
                    searchDate = startStr
                }
            } else if (selectedType === "Quarter" && quarterRange.from) {
                const fromStr = `${quarterRange.from.year}-Q${quarterRange.from.quarter}`
                if (quarterRange.to) {
                    const toStr = `${quarterRange.to.year}-Q${quarterRange.to.quarter}`
                    searchDate = fromStr === toStr ? fromStr : `${fromStr}_${toStr}`
                } else {
                    searchDate = fromStr
                }
            } else if (selectedType === "Year" && yearRange.from) {
                const fromStr = String(yearRange.from)
                if (yearRange.to) {
                    const toStr = String(yearRange.to)
                    searchDate = fromStr === toStr ? fromStr : `${fromStr}_${toStr}`
                } else {
                    searchDate = fromStr
                }
            } else if (selectedType === "Week" && singleDate) {
                const start = startOfWeek(singleDate, { weekStartsOn: 1 })
                const end = endOfWeek(singleDate, { weekStartsOn: 1 })
                const startStr = format(start, "yyyy-MM-dd")
                const endStr = format(end, "yyyy-MM-dd")
                searchDate = `${startStr}_${endStr}`
            }

            onSearch(selectedGroup, selectedType, searchDate)
        }
    }



    const formatDayDisplay = (d: Date) => {
        if (locale === "th") {
            return d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })
        }
        return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })
    }

    const formatMonthDisplay = (d: Date) => {
        if (locale === "th") {
            const m = d.toLocaleDateString("th-TH", { month: "short" })
            return `${m} ${d.getFullYear() + 543}`
        }
        return d.toLocaleDateString("en-US", { month: "short", year: "numeric" })
    }

    const renderDateInput = () => {
        if (selectedType === "Day") {
            const startOfToday = new Date()
            startOfToday.setHours(0, 0, 0, 0)

            return (
                <div className="flex items-center gap-2 w-full min-w-0">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className={cn(
                                    "cursor-pointer h-9 flex-1 min-w-0 sm:w-auto sm:min-w-[200px] pl-3 pr-2 text-left font-normal bg-background shadow-xs text-sm flex items-center justify-between",
                                    !dateRange && "text-muted-foreground"
                                )}
                            >
                                <span className="truncate mr-2">
                                    {dateRange?.from ? (
                                        dateRange.to ? (
                                            <>
                                                {formatDayDisplay(dateRange.from)} -{" "}
                                                {formatDayDisplay(dateRange.to)}
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
                                onSelect={(val) => {
                                    // Max 15 days logic
                                    if (val?.from && val?.to) {
                                        const days = differenceInDays(val.to, val.from)
                                        if (days >= 15) {
                                            toast.error(t("dateRangeLimit"))
                                            return // Ignore selection > 15 days
                                        }
                                    }
                                    setDateRange(val)
                                }}
                                locale={locale === "th" ? th : enUS}
                                disabled={(date) => date >= startOfToday || date < projectStartDate}
                                initialFocus
                                defaultMonth={dateRange?.from}
                            />
                        </PopoverContent>
                    </Popover>
                    {dateRange && (
                        <Button
                            variant="outline"
                            onClick={() => setDateRange(undefined)}
                            className="cursor-pointer h-9 px-3 sm:px-4 shrink-0 shadow-xs bg-background text-muted-foreground hover:text-foreground"
                        >
                            <X className="w-4 h-4 mr-1.5" />
                            {t("clearButton")}
                        </Button>
                    )}
                </div>
            )
        }

        if (selectedType === "Week") {
            const startOfToday = new Date()
            startOfToday.setHours(0, 0, 0, 0)

            return (
                <div className="flex items-center gap-2 w-full min-w-0">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className={cn(
                                    "cursor-pointer h-9 flex-1 min-w-0 sm:w-auto sm:min-w-[200px] pl-3 pr-2 text-left font-normal bg-background shadow-xs text-sm flex items-center justify-between",
                                    !singleDate && "text-muted-foreground"
                                )}
                            >
                                <span className="truncate mr-2">
                                    {singleDate ? (
                                        `${t("weekOf")} ${formatDayDisplay(singleDate)}`
                                    ) : (
                                        t("pickWeek")
                                    )}
                                </span>
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50 shrink-0" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="range"
                                selected={singleDate ? {
                                    from: startOfWeek(singleDate, { weekStartsOn: 1 }),
                                    to: endOfWeek(singleDate, { weekStartsOn: 1 })
                                } : undefined}
                                onSelect={(_, date) => setSingleDate(date)}
                                locale={locale === "th" ? th : enUS}
                                disabled={(date) => date >= startOfToday || date < projectStartDate}
                                initialFocus
                                defaultMonth={singleDate}
                            />
                        </PopoverContent>
                    </Popover>
                    {singleDate && (
                        <Button
                            variant="outline"
                            onClick={() => setSingleDate(undefined)}
                            className="cursor-pointer h-9 px-3 sm:px-4 shrink-0 shadow-xs bg-background text-muted-foreground hover:text-foreground"
                        >
                            <X className="w-4 h-4 mr-1.5" />
                            {t("clearButton")}
                        </Button>
                    )}
                </div>
            )
        }

        if (selectedType === "Month") {
            const now = new Date()
            const currentMonthDate = new Date(now.getFullYear(), now.getMonth(), 1) // 1st of current month
            const shortMonths = Array.from({ length: 12 }, (_, i) => {
                const d = new Date(2000, i, 1)
                return format(d, "MMM", { locale: locale === "th" ? th : enUS })
            })

            const handleMonthClick = (monthIdx: number) => {
                const clicked = new Date(monthPickerYear, monthIdx, 1)
                // Don't allow future months or before project start
                if (clicked > currentMonthDate || clicked < projectStartDate) return

                if (!monthRange.from || (monthRange.from && monthRange.to)) {
                    // Start new selection
                    setMonthRange({ from: clicked })
                } else {
                    // Complete the range
                    let from = monthRange.from
                    let to = clicked
                    if (to < from) {
                        // Swap if clicked earlier
                        ;[from, to] = [to, from]
                    }
                    // Validate max 12 months
                    const diff = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth())
                    if (diff >= 12) {
                        toast.error(t("monthRangeLimit"))
                        return
                    }
                    setMonthRange({ from, to })
                }
            }

            const isSelected = (monthIdx: number) => {
                const d = new Date(monthPickerYear, monthIdx, 1)
                if (monthRange.from && d.getTime() === monthRange.from.getTime()) return true
                if (monthRange.to && d.getTime() === monthRange.to.getTime()) return true
                return false
            }

            const isInRange = (monthIdx: number) => {
                if (!monthRange.from || !monthRange.to) return false
                const d = new Date(monthPickerYear, monthIdx, 1)
                return d > monthRange.from && d < monthRange.to
            }

            const isDisabled = (monthIdx: number) => {
                const d = new Date(monthPickerYear, monthIdx, 1)
                return d > currentMonthDate || d < projectStartDate
            }

            return (
                <div className="flex items-center gap-2 w-full min-w-0">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className={cn(
                                    "cursor-pointer h-9 flex-1 min-w-0 sm:w-auto sm:min-w-[200px] pl-3 pr-2 text-left font-normal bg-background shadow-xs text-sm flex items-center justify-between",
                                    !monthRange.from && "text-muted-foreground"
                                )}
                            >
                                <span className="truncate mr-2">
                                    {monthRange.from ? (
                                        monthRange.to ? (
                                            <>
                                                {formatMonthDisplay(monthRange.from)} -{" "}
                                                {formatMonthDisplay(monthRange.to)}
                                            </>
                                        ) : (
                                            formatMonthDisplay(monthRange.from)
                                        )
                                    ) : (
                                        t("pickDate")
                                    )}
                                </span>
                                <CalendarIcon className="h-4 w-4 opacity-50 shrink-0" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[280px] p-3" align="start">
                            <div className="flex items-center justify-between mb-3">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="cursor-pointer h-7 w-7"
                                    onClick={() => setMonthPickerYear(y => y - 1)}
                                    disabled={monthPickerYear <= startYear}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="text-sm font-medium">
                                    {locale === "th" ? monthPickerYear + 543 : monthPickerYear}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="cursor-pointer h-7 w-7"
                                    onClick={() => setMonthPickerYear(y => y + 1)}
                                    disabled={monthPickerYear >= currentYear}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="grid grid-cols-3 gap-1.5">
                                {shortMonths.map((name, i) => (
                                    <Button
                                        key={i}
                                        variant={isSelected(i) ? "default" : "ghost"}
                                        size="sm"
                                        disabled={isDisabled(i)}
                                        className={cn(
                                            "cursor-pointer h-9 text-sm",
                                            isInRange(i) && "bg-accent text-accent-foreground",
                                            isSelected(i) && "bg-primary text-primary-foreground hover:bg-primary/90"
                                        )}
                                        onClick={() => handleMonthClick(i)}
                                    >
                                        {name}
                                    </Button>
                                ))}
                            </div>
                        </PopoverContent>
                    </Popover>
                    {monthRange.from && (
                        <Button
                            variant="outline"
                            onClick={() => setMonthRange({})}
                            className="cursor-pointer h-9 px-3 sm:px-4 shrink-0 shadow-xs bg-background text-muted-foreground hover:text-foreground"
                        >
                            <X className="w-4 h-4 mr-1.5" />
                            {t("clearButton")}
                        </Button>
                    )}
                </div>
            )
        }

        if (selectedType === "Quarter") {
            const currentMonthIdx = new Date().getMonth()
            const currentQuarter = Math.floor(currentMonthIdx / 3) + 1

            const handleQuarterClick = (q: number) => {
                const clickedIdx = quarterPickerYear * 4 + q
                const currentIdx = currentYear * 4 + currentQuarter
                const startIdx = startYear * 4 + startQuarter
                if (clickedIdx > currentIdx || clickedIdx < startIdx) return

                if (!quarterRange.from || (quarterRange.from && quarterRange.to)) {
                    setQuarterRange({ from: { year: quarterPickerYear, quarter: q } })
                } else {
                    let from = quarterRange.from
                    let to = { year: quarterPickerYear, quarter: q }
                    const fIdx = from.year * 4 + from.quarter
                    const tIdx = to.year * 4 + to.quarter
                    if (tIdx < fIdx) {
                        ;[from, to] = [to, from]
                    }
                    const diff = (to.year * 4 + to.quarter) - (from.year * 4 + from.quarter)
                    if (diff >= 8) {
                        toast.error(t("quarterRangeLimit"))
                        return
                    }
                    setQuarterRange({ from, to })
                }
            }

            const isQuarterSelected = (q: number) => {
                if (quarterRange.from && quarterRange.from.year === quarterPickerYear && quarterRange.from.quarter === q) return true
                if (quarterRange.to && quarterRange.to.year === quarterPickerYear && quarterRange.to.quarter === q) return true
                return false
            }

            const isQuarterInRange = (q: number) => {
                if (!quarterRange.from || !quarterRange.to) return false
                const idx = quarterPickerYear * 4 + q
                const fromIdx = quarterRange.from.year * 4 + quarterRange.from.quarter
                const toIdx = quarterRange.to.year * 4 + quarterRange.to.quarter
                return idx > fromIdx && idx < toIdx
            }

            const isQuarterDisabled = (q: number) => {
                const idx = quarterPickerYear * 4 + q
                const currentIdx = currentYear * 4 + currentQuarter
                const startIdx = startYear * 4 + startQuarter
                return idx > currentIdx || idx < startIdx
            }

            const getQuarterLabel = () => {
                if (!quarterRange.from) return t("pickQuarter")
                const fromYearDisplay = locale === "th" ? quarterRange.from.year + 543 : quarterRange.from.year
                const fromPrefix = locale === "th" ? "ไตรมาส " : "Q"
                const fromText = `${fromPrefix}${quarterRange.from.quarter} ${fromYearDisplay}`
                if (quarterRange.to) {
                    const toYearDisplay = locale === "th" ? quarterRange.to.year + 543 : quarterRange.to.year
                    const toPrefix = locale === "th" ? "ไตรมาส " : "Q"
                    const toText = `${toPrefix}${quarterRange.to.quarter} ${toYearDisplay}`
                    return fromText === toText ? fromText : `${fromText} - ${toText}`
                }
                return fromText
            }

            return (
                <div className="flex items-center gap-2 w-full min-w-0">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className={cn(
                                    "cursor-pointer h-9 flex-1 min-w-0 sm:w-auto sm:min-w-[200px] pl-3 pr-2 text-left font-normal bg-background shadow-xs text-sm flex items-center justify-between",
                                    !quarterRange.from && "text-muted-foreground"
                                )}
                            >
                                <span className="truncate mr-2">{getQuarterLabel()}</span>
                                <CalendarIcon className="h-4 w-4 opacity-50 shrink-0" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[280px] p-3" align="start">
                            <div className="flex items-center justify-between mb-3">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="cursor-pointer h-7 w-7"
                                    onClick={() => setQuarterPickerYear(y => y - 1)}
                                    disabled={quarterPickerYear <= startYear}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="text-sm font-medium">
                                    {locale === "th" ? quarterPickerYear + 543 : quarterPickerYear}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="cursor-pointer h-7 w-7"
                                    onClick={() => setQuarterPickerYear(y => y + 1)}
                                    disabled={quarterPickerYear >= currentYear}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {[1, 2, 3, 4].map(q => (
                                    <Button
                                        key={q}
                                        variant={isQuarterSelected(q) ? "default" : "ghost"}
                                        size="sm"
                                        disabled={isQuarterDisabled(q)}
                                        className={cn(
                                            "cursor-pointer h-10 text-sm font-medium",
                                            isQuarterInRange(q) && "bg-accent text-accent-foreground",
                                            isQuarterSelected(q) && "bg-primary text-primary-foreground hover:bg-primary/90"
                                        )}
                                        onClick={() => handleQuarterClick(q)}
                                    >
                                        {locale === "th" ? `ไตรมาส ${q}` : `Q${q}`}
                                    </Button>
                                ))}
                            </div>
                        </PopoverContent>
                    </Popover>
                    {quarterRange.from && (
                        <Button
                            variant="outline"
                            onClick={() => setQuarterRange({})}
                            className="cursor-pointer h-9 px-3 sm:px-4 shrink-0 shadow-xs bg-background text-muted-foreground hover:text-foreground"
                        >
                            <X className="w-4 h-4 mr-1.5" />
                            {t("clearButton")}
                        </Button>
                    )}
                </div>
            )
        }

        if (selectedType === "Year") {
            const handleYearClick = (y: number) => {
                if (y > currentYear || y < startYear) return

                if (!yearRange.from || (yearRange.from && yearRange.to)) {
                    setYearRange({ from: y })
                } else {
                    let from = yearRange.from
                    let to = y
                    if (to < from) {
                        ;[from, to] = [to, from]
                    }
                    if (to - from >= 10) {
                        toast.error(t("yearRangeLimit"))
                        return
                    }
                    setYearRange({ from, to })
                }
            }

            const isYearSelected = (y: number) => {
                if (yearRange.from === y) return true
                if (yearRange.to === y) return true
                return false
            }

            const isYearInRange = (y: number) => {
                if (!yearRange.from || !yearRange.to) return false
                return y > yearRange.from && y < yearRange.to
            }

            const getYearLabel = () => {
                if (!yearRange.from) return t("pickYear")
                const fromDisplay = locale === "th" ? yearRange.from + 543 : yearRange.from
                if (yearRange.to) {
                    const toDisplay = locale === "th" ? yearRange.to + 543 : yearRange.to
                    return fromDisplay === toDisplay ? String(fromDisplay) : `${fromDisplay} - ${toDisplay}`
                }
                return String(fromDisplay)
            }

            return (
                <div className="flex items-center gap-2 w-full min-w-0">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className={cn(
                                    "cursor-pointer h-9 flex-1 min-w-0 sm:w-auto sm:min-w-[200px] pl-3 pr-2 text-left font-normal bg-background shadow-xs text-sm flex items-center justify-between",
                                    !yearRange.from && "text-muted-foreground"
                                )}
                            >
                                <span className="truncate mr-2">{getYearLabel()}</span>
                                <CalendarIcon className="h-4 w-4 opacity-50 shrink-0" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[280px] p-3 max-h-[300px] overflow-y-auto" align="start">
                            <div className="grid grid-cols-3 gap-1.5">
                                {years.map(y => (
                                    <Button
                                        key={y}
                                        variant={isYearSelected(y) ? "default" : "ghost"}
                                        size="sm"
                                        className={cn(
                                            "cursor-pointer h-9 text-sm",
                                            isYearInRange(y) && "bg-accent text-accent-foreground",
                                            isYearSelected(y) && "bg-primary text-primary-foreground hover:bg-primary/90"
                                        )}
                                        onClick={() => handleYearClick(y)}
                                    >
                                        {locale === "th" ? y + 543 : y}
                                    </Button>
                                ))}
                            </div>
                        </PopoverContent>
                    </Popover>
                    {yearRange.from && (
                        <Button
                            variant="outline"
                            onClick={() => setYearRange({})}
                            className="cursor-pointer h-9 px-3 sm:px-4 shrink-0 shadow-xs bg-background text-muted-foreground hover:text-foreground"
                        >
                            <X className="w-4 h-4 mr-1.5" />
                            {t("clearButton")}
                        </Button>
                    )}
                </div>
            )
        }

        return null
    }

    const selectedGroupName = groupOptions.find((g) => g.group_code === selectedGroup)?.group_name || selectedGroup;

    return (
        <div className="rounded-xl border border-border/80 bg-muted/40 p-3.5 shadow-xs flex flex-wrap items-center gap-2.5">
            {/* Group Selector */}
            <div className="w-full sm:flex-1 sm:min-w-[180px] xl:w-[220px] xl:flex-initial">
                <Combobox 
                    value={selectedGroupName} 
                    onValueChange={(val) => {
                        const group = groupOptions.find(g => g.group_name === val);
                        if (group) {
                            setSelectedGroup(group.group_code);
                        } else {
                            setSelectedGroup(val);
                        }
                    }}
                >
                    <ComboboxInput className="cursor-pointer h-9 w-full rounded-md bg-background border-input shadow-xs text-sm" placeholder={t("selectGroupPlaceholder")} />
                    <ComboboxContent searchPlaceholder={t("searchGroupPlaceholder")}>
                        {isLoadingGroups ? (
                            <div className="flex items-center justify-center py-4 text-xs text-muted-foreground gap-2">
                                <Loader2 className="size-3.5 animate-spin" />
                                <span>{t("selectGroupPlaceholder")}</span>
                            </div>
                        ) : (
                            <>
                                <ComboboxEmpty>{t("noGroupFound")}</ComboboxEmpty>
                                <ComboboxList>
                                    {groupOptions.map((group, index) => (
                                        <ComboboxItem key={`${group.group_code || "grp"}-${group.group_name}-${index}`} value={group.group_name}>
                                            {group.group_name}
                                        </ComboboxItem>
                                    ))}
                                </ComboboxList>
                            </>
                        )}
                    </ComboboxContent>
                </Combobox>
            </div>

            {/* Type Selector */}
            <div className="w-full sm:w-[130px] shrink-0">
                <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger className="cursor-pointer h-9 w-full bg-background shadow-xs text-sm">
                        <SelectValue placeholder={t("selectTypePlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem className="cursor-pointer" value="Now">{t("types.now")}</SelectItem>
                        <SelectItem className="cursor-pointer" value="Day">{t("types.day")}</SelectItem>
                        <SelectItem className="cursor-pointer" value="Week">{t("types.week")}</SelectItem>
                        <SelectItem className="cursor-pointer" value="Month">{t("types.month")}</SelectItem>
                        <SelectItem className="cursor-pointer" value="Quarter">{t("types.quarter")}</SelectItem>
                        <SelectItem className="cursor-pointer" value="Year">{t("types.year")}</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Date Input */}
            {selectedType !== "Now" && (
                <div className="w-full sm:flex-1 sm:min-w-[200px] xl:w-auto xl:flex-initial">
                    {renderDateInput()}
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2 w-full sm:w-auto xl:ml-auto shrink-0">
                <Button
                    variant="default"
                    onClick={handleSearch}
                    className="cursor-pointer h-9 px-4 flex-1 sm:flex-initial shadow-xs"
                >
                    <Search className="w-4 h-4 mr-1.5" />
                    {t("searchButton")}
                </Button>
                <Button
                    variant="outline"
                    onClick={() => onPrint ? onPrint() : window.print()}
                    disabled={isGeneratingPdf}
                    className="cursor-pointer h-9 px-4 flex-1 sm:flex-initial shadow-xs bg-background"
                >
                    {isGeneratingPdf ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Printer className="w-4 h-4 mr-1.5" />}
                    {t("printButton")}
                </Button>
            </div>
        </div>
    )
}
