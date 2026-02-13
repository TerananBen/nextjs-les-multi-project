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
import { GroupItem } from "@/app/actions/dashboard"
import { Printer, Search, Calendar as CalendarIcon } from "lucide-react"
import { useTranslations, useLocale } from "next-intl"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { format } from "date-fns"
import { th, enUS } from "date-fns/locale"
import { cn } from "@/lib/utils"

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
    const [date, setDate] = useState<Date | undefined>(undefined)

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
    const [selectedQuarter, setSelectedQuarter] = useState<string>("1")

    // Effect to update the main selectedDate string when sub-values change
    useEffect(() => {
        if (selectedType === "Day" && date) {
            setSelectedDate(format(date, "yyyy-MM-dd"))
        } else if (selectedType === "Month") {
            setSelectedDate(`${selectedYear}-${selectedMonth}`)
        } else if (selectedType === "Quarter") {
            setSelectedDate(`${selectedYear}-Q${selectedQuarter}`)
        } else if (selectedType === "Year") {
            setSelectedDate(selectedYear)
        } else if (selectedType === "Week" && date) {
            // Calculate week number (ISO)
            // We can use a library helper or simple format
            // The API likely expects YYYY-Www or similar. Let's assume typical format.
            // Using 'I' for ISO week year and 'w' for week of year might be safer if supported,
            // but let's stick to simple "YYYY-MM-DD" of the start of the week or just send the date and let API handle it?
            // Re-reading usage: "Week" usually implies sending a specific week identifier.
            // If the previous input was type="week", it sends "2024-W01".
            // We can construct this.
            const weekVal = format(date, "I-'W'ww")
            setSelectedDate(weekVal)
        } else if (selectedType === "Now") {
            setSelectedDate("")
        }
    }, [date, selectedType, selectedMonth, selectedYear, selectedQuarter])


    const handleSearch = () => {
        // For "Now", date might be empty, which is fine
        if (selectedGroup && selectedType) {
            // Add validation if needed
            onSearch(selectedGroup, selectedType, selectedDate)
        }
    }

    const renderDateInput = () => {
        if (selectedType === "Day" || selectedType === "Week") {
            const startOfToday = new Date()
            startOfToday.setHours(0, 0, 0, 0)

            return (
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant={"outline"}
                            className={cn(
                                "w-[240px] pl-3 text-left font-normal",
                                !date && "text-muted-foreground"
                            )}
                        >
                            {date ? (
                                selectedType === "Week"
                                    ? `${t("weekOf")} ${format(date, "PPP", { locale: locale === "th" ? th : enUS })}`
                                    : format(date, "PPP", { locale: locale === "th" ? th : enUS })
                            ) : (
                                <span>{selectedType === "Week" ? t("pickWeek") : t("pickDate")}</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            locale={locale === "th" ? th : enUS}
                            disabled={(date) => date >= startOfToday || date < projectStartDate}
                            initialFocus
                        />
                    </PopoverContent>
                </Popover>
            )
        }

        if (selectedType === "Month") {
            const currentMonthIdx = new Date().getMonth() // 0-11
            return (
                <div className="flex gap-2">
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent>
                            {Array.from({ length: 12 }, (_, i) => {
                                const m = i + 1
                                const mStr = String(m).padStart(2, '0')
                                // Get localized month name
                                const dateForMonth = new Date(2000, i, 1) // Any year works
                                const monthName = format(dateForMonth, "MMMM", { locale: locale === "th" ? th : enUS })

                                // Disable future months in current year
                                const isFuture = Number(selectedYear) === currentYear && i > currentMonthIdx
                                // Disable months before start date in start year
                                const isBeforeStart = Number(selectedYear) === startYear && i < startMonthVal

                                return (
                                    <SelectItem key={m} value={mStr} disabled={isFuture || isBeforeStart}>{monthName}</SelectItem>
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
