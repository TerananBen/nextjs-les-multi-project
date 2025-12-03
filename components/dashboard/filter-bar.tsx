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

interface FilterBarProps {
    groups: GroupItem[]
    onSearch: (groupCode: string, type: string, date: string) => void
}

export function FilterBar({ groups, onSearch }: FilterBarProps) {
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
        <div className="flex flex-wrap items-center gap-4 p-4 bg-white dark:bg-zinc-900 rounded-lg shadow-sm border">
            <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Search :</span>
                <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                    <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="-- Select Group --" />
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
                    <SelectValue placeholder="Select Type" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="Now">Now</SelectItem>
                    <SelectItem value="Day">Day</SelectItem>
                    <SelectItem value="Week">Week</SelectItem>
                    <SelectItem value="Month">Monthly</SelectItem>
                    <SelectItem value="Quarter">Quarter</SelectItem>
                    <SelectItem value="Year">Year</SelectItem>
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
                    className="bg-red-400 hover:bg-red-500 text-white"
                    onClick={handleSearch}
                >
                    <Search className="w-4 h-4 mr-2" />
                    Search
                </Button>
                <Button
                    className="bg-indigo-500 hover:bg-indigo-600 text-white"
                    onClick={() => window.print()}
                >
                    <Printer className="w-4 h-4 mr-2" />
                    Print
                </Button>
            </div>
        </div>
    )
}
