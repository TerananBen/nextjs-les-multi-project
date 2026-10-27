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
    startDate?: string,
    onSearch: (groupCode: string, type: string, date: string) => void,
    onPrint?: () => void,
    isGeneratingPdf?: boolean
}

export function FilterBar({ defaultGroupCode, groups, startDate, onSearch, onPrint, isGeneratingPdf }: FilterBarProps) {
    const t = useTranslations("GroupDashboard.filter")
    const locale = useLocale()
    const [selectedGroup, setSelectedGroup] = useState<string>(defaultGroupCode || "")

    const allGroupsLabel = t("allGroups", { defaultValue: "ทุกกลุ่ม" })
    const groupOptions = useMemo(() => {
        if (!defaultGroupCode) return groups
        const hasDefault = groups.some(g => g.group_code === defaultGroupCode)
        if (hasDefault) return groups
        return [
            {
                group_code: defaultGroupCode,
                group_name: allGroupsLabel,
                sub_district: "-",
                total_rtu: "0"
            },
            ...groups
        ]
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
    const [selectedYear, setSelectedYear] = useState<string>(String(currentYear))
    // State for Month picker (month range as {from, to} with 1st of month dates)
    const [monthRange, setMonthRange] = useState<{ from?: Date; to?: Date }>({
        from: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    })
    const [monthPickerYear, setMonthPickerYear] = useState(currentYear)

    const [selectedQuarter, setSelectedQuarter] = useState<string>("1")

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
            } else if (selectedType === "Quarter") {
                searchDate = `${selectedYear}-Q${selectedQuarter}`
            } else if (selectedType === "Year") {
                searchDate = selectedYear
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



    const renderDateInput = () => {
        if (selectedType === "Day") {
            const startOfToday = new Date()
            startOfToday.setHours(0, 0, 0, 0)

            return (
                <div className="flex items-center gap-1 w-full min-w-0">
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
                                                {format(dateRange.from, "PPP", { locale: locale === "th" ? th : enUS })} -{" "}
                                                {format(dateRange.to, "PPP", { locale: locale === "th" ? th : enUS })}
                                            </>
                                        ) : (
                                            format(dateRange.from, "PPP", { locale: locale === "th" ? th : enUS })
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
                            variant="ghost"
                            size="icon"
                            className="cursor-pointer h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
                            onClick={() => setDateRange(undefined)}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            )
        }

        if (selectedType === "Week") {
            const startOfToday = new Date()
            startOfToday.setHours(0, 0, 0, 0)

            return (
                <div className="flex items-center gap-1 w-full min-w-0">
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
                                        `${t("weekOf")} ${format(singleDate, "PPP", { locale: locale === "th" ? th : enUS })}`
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
                            variant="ghost"
                            size="icon"
                            className="cursor-pointer h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
                            onClick={() => setSingleDate(undefined)}
                        >
                            <X className="h-4 w-4" />
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
                <div className="flex items-center gap-1 w-full min-w-0">
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
                                                {format(monthRange.from, "MMM yyyy", { locale: locale === "th" ? th : enUS })} -{" "}
                                                {format(monthRange.to, "MMM yyyy", { locale: locale === "th" ? th : enUS })}
                                            </>
                                        ) : (
                                            format(monthRange.from, "MMM yyyy", { locale: locale === "th" ? th : enUS })
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
                            variant="ghost"
                            size="icon"
                            className="cursor-pointer h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
                            onClick={() => setMonthRange({})}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            )
        }

        if (selectedType === "Quarter") {
            const currentMonthIdx = new Date().getMonth()
            const currentQuarter = Math.floor(currentMonthIdx / 3) + 1

            return (
                <div className="flex gap-2 w-full sm:w-auto">
                    <div className="flex-1 sm:flex-initial">
                        <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
                            <SelectTrigger className="cursor-pointer h-9 w-full sm:w-[130px] bg-background shadow-xs text-sm">
                                <SelectValue placeholder="Quarter" />
                            </SelectTrigger>
                            <SelectContent>
                                {[1, 2, 3, 4].map(q => {
                                    // Disable future quarters in current year
                                    const isFuture = Number(selectedYear) === currentYear && q > currentQuarter
                                    // Disable quarters before start date in start year
                                    const isBeforeStart = Number(selectedYear) === startYear && q < startQuarter

                                    return (
                                        <SelectItem className="cursor-pointer" key={q} value={String(q)} disabled={isFuture || isBeforeStart}>
                                            {t("quarter")} {q}
                                        </SelectItem>
                                    )
                                })}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex-1 sm:flex-initial">
                        <Select value={selectedYear} onValueChange={setSelectedYear}>
                            <SelectTrigger className="cursor-pointer h-9 w-full sm:w-[130px] bg-background shadow-xs text-sm">
                                <SelectValue placeholder="Year" />
                            </SelectTrigger>
                            <SelectContent>
                                {years.map(y => (
                                    <SelectItem className="cursor-pointer" key={y} value={String(y)}>
                                        {locale === "th" ? (y + 543) : y}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            )
        }

        if (selectedType === "Year") {
            return (
                <div className="w-full sm:w-auto">
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger className="cursor-pointer h-9 w-full sm:w-[130px] bg-background shadow-xs text-sm">
                            <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                            {years.map(y => (
                                <SelectItem className="cursor-pointer" key={y} value={String(y)}>
                                    {locale === "th" ? (y + 543) : y}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
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
                        <ComboboxEmpty>{t("noGroupFound")}</ComboboxEmpty>
                        <ComboboxList>
                            {groupOptions.map((group, index) => (
                                <ComboboxItem key={`${group.group_code || "grp"}-${group.group_name}-${index}`} value={group.group_name}>
                                    {group.group_name}
                                </ComboboxItem>
                            ))}
                        </ComboboxList>
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
