"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { DateRange } from "react-day-picker"
import { GroupItem } from "@/app/actions/dashboard"
import { Printer, Search, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"
import { useTranslations, useLocale } from "next-intl"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { differenceInDays, format, startOfWeek, endOfWeek } from "date-fns"
import { th, enUS } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface FilterBarProps {
    groups: GroupItem[]
    onSearch: (groupCode: string, type: string, date: string) => void
}

export function FilterBar({ groups, onSearch }: FilterBarProps) {
    const t = useTranslations("GroupDashboard.filter")
    const locale = useLocale()
    const [selectedGroup, setSelectedGroup] = useState<string>("")
    const [selectedType, setSelectedType] = useState<string>("Month")
    const [selectedDate, setSelectedDate] = useState<string>("")
    // State for Week picker (Single Date)
    const [singleDate, setSingleDate] = useState<Date | undefined>(undefined)
    // State for Day picker (Date Range)
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)

    // Parse Project Start Date
    const projectStartDateStr = process.env.NEXT_PUBLIC_START_DATE_PROJECT || "2020-01-01"
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

    // Update selectedDate based on type and local state
    // We'll use separate states for complex pickers to make UI handling easier
    const [selectedMonth, setSelectedMonth] = useState<string>(String(new Date().getMonth() + 1).padStart(2, '0'))
    const [selectedYear, setSelectedYear] = useState<string>(String(currentYear))
    // State for Month picker (month range as {from, to} with 1st of month dates)
    const [monthRange, setMonthRange] = useState<{ from?: Date; to?: Date }>({})
    const [monthPickerYear, setMonthPickerYear] = useState(currentYear)

    const [selectedQuarter, setSelectedQuarter] = useState<string>("1")

    // Effect to update the main selectedDate string when sub-values change
    useEffect(() => {
        if (selectedType === "Day" && dateRange?.from) {
            const start = format(dateRange.from, "yyyy-MM-dd")
            if (dateRange.to) {
                const end = format(dateRange.to, "yyyy-MM-dd")
                // If same day, just send single date (optional, but cleaner for "Single Day" logic backend?)
                // User said: "Select 1 day -> ... totalUnitPerHour".
                // If start == end, it's 1 day.
                if (start === end) {
                    setSelectedDate(start)
                } else {
                    setSelectedDate(`${start},${end}`)
                }
            } else {
                setSelectedDate(start)
            }
        } else if (selectedType === "Month" && monthRange?.from) {
            const startStr = format(monthRange.from, "yyyy-MM")
            if (monthRange.to) {
                const endStr = format(monthRange.to, "yyyy-MM")
                if (startStr === endStr) {
                    setSelectedDate(startStr)
                } else {
                    setSelectedDate(`${startStr}_${endStr}`)
                }
            } else {
                setSelectedDate(startStr)
            }
        } else if (selectedType === "Quarter") {
            setSelectedDate(`${selectedYear}-Q${selectedQuarter}`)
        } else if (selectedType === "Year") {
            setSelectedDate(selectedYear)
        } else if (selectedType === "Week" && singleDate) {
            // Calculate week range (Monday to Sunday)
            const start = startOfWeek(singleDate, { weekStartsOn: 1 })
            const end = endOfWeek(singleDate, { weekStartsOn: 1 })
            const startStr = format(start, "yyyy-MM-dd")
            const endStr = format(end, "yyyy-MM-dd")
            setSelectedDate(`${startStr}_${endStr}`)
        } else if (selectedType === "Now") {
            setSelectedDate("")
        }
    }, [singleDate, dateRange, monthRange, selectedType, selectedMonth, selectedYear, selectedQuarter])


    const handleSearch = () => {
        // For "Now", date might be empty, which is fine
        if (selectedGroup && selectedType) {
            // Add validation if needed
            // Month range validation is handled in the calendar onSelect

            onSearch(selectedGroup, selectedType, selectedDate)
        }
    }



    const renderDateInput = () => {
        if (selectedType === "Day") {
            const startOfToday = new Date()
            startOfToday.setHours(0, 0, 0, 0)

            return (
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant={"outline"}
                            className={cn(
                                "w-auto min-w-[240px] pl-3 text-left font-normal",
                                !dateRange && "text-muted-foreground"
                            )}
                        >
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
                                <span>{t("pickDate")}</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
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
            )
        }

        if (selectedType === "Week") {
            const startOfToday = new Date()
            startOfToday.setHours(0, 0, 0, 0)

            return (
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant={"outline"}
                            className={cn(
                                "w-auto min-w-[240px] pl-3 text-left font-normal",
                                !singleDate && "text-muted-foreground"
                            )}
                        >
                            {singleDate ? (
                                `${t("weekOf")} ${format(singleDate, "PPP", { locale: locale === "th" ? th : enUS })}`
                            ) : (
                                <span>{t("pickWeek")}</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
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
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant={"outline"}
                            className={cn(
                                "w-auto min-w-[240px] pl-3 text-left font-normal",
                                !monthRange.from && "text-muted-foreground"
                            )}
                        >
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
                                <span>{t("pickDate")}</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[280px] p-3" align="start">
                        <div className="flex items-center justify-between mb-3">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
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
                                className="h-7 w-7"
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
                                        "h-9 text-sm",
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
            )
        }

        if (selectedType === "Quarter") {
            const currentMonthIdx = new Date().getMonth()
            const currentQuarter = Math.floor(currentMonthIdx / 3) + 1

            return (
                <div className="flex gap-2">
                    <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Quarter" />
                        </SelectTrigger>
                        <SelectContent>
                            {[1, 2, 3, 4].map(q => {
                                // Disable future quarters in current year
                                const isFuture = Number(selectedYear) === currentYear && q > currentQuarter
                                // Disable quarters before start date in start year
                                const isBeforeStart = Number(selectedYear) === startYear && q < startQuarter

                                return (
                                    <SelectItem key={q} value={String(q)} disabled={isFuture || isBeforeStart}>
                                        {t("quarter")} {q}
                                    </SelectItem>
                                )
                            })}
                        </SelectContent>
                    </Select>
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger className="w-[100px]">
                            <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                            {years.map(y => (
                                <SelectItem key={y} value={String(y)}>
                                    {locale === "th" ? (y + 543) : y}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )
        }

        if (selectedType === "Year") {
            return (
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                        {years.map(y => (
                            <SelectItem key={y} value={String(y)}>
                                {locale === "th" ? (y + 543) : y}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )
        }

        return null
    }

    return (
        <div className="flex flex-wrap items-center gap-4 p-4 bg-card rounded-lg shadow-sm border">
            <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{t("searchLabel")}</span>
                <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                    <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder={t("selectGroupPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                        {groups.map((group) => (
                            <SelectItem key={group.group_code} value={group.group_code}>
                                {group.group_name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder={t("selectTypePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="Now">{t("types.now")}</SelectItem>
                    <SelectItem value="Day">{t("types.day")}</SelectItem>
                    <SelectItem value="Week">{t("types.week")}</SelectItem>
                    <SelectItem value="Month">{t("types.month")}</SelectItem>
                    <SelectItem value="Quarter">{t("types.quarter")}</SelectItem>
                    <SelectItem value="Year">{t("types.year")}</SelectItem>
                </SelectContent>
            </Select>

            {selectedType !== "Now" && renderDateInput()}

            <div className="flex items-center gap-2 ml-auto">
                <Button
                    variant="destructive"
                    onClick={handleSearch}
                >
                    <Search className="w-4 h-4 mr-2" />
                    {t("searchButton")}
                </Button>
                <Button
                    variant="secondary"
                    onClick={() => window.print()}
                >
                    <Printer className="w-4 h-4 mr-2" />
                    {t("printButton")}
                </Button>
            </div>
        </div>
    )
}
