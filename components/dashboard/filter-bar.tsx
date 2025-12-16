"use client"

import { useState } from "react"
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
import { Printer, Search } from "lucide-react"
import { useTranslations } from "next-intl"

interface FilterBarProps {
    groups: GroupItem[]
    onSearch: (groupCode: string, type: string, date: string) => void
}

export function FilterBar({ groups, onSearch }: FilterBarProps) {
    const t = useTranslations("GroupDashboard.filter")
    const [selectedGroup, setSelectedGroup] = useState<string>("")
    const [selectedType, setSelectedType] = useState<string>("Month")
    const [selectedDate, setSelectedDate] = useState<string>("")

    const handleSearch = () => {
        if (selectedGroup && selectedType && selectedDate) {
            onSearch(selectedGroup, selectedType, selectedDate)
        }
    }

    const getInputType = () => {
        switch (selectedType) {
            case "Month":
                return "month"
            case "Day":
                return "date"
            case "Week":
                return "week"
            case "Year":
                return "number" // Or text with regex
            default:
                return "text"
        }
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

            <Input
                type={getInputType()}
                className="w-[200px]"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                placeholder={selectedType === "Year" ? "YYYY" : ""}
            />

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
