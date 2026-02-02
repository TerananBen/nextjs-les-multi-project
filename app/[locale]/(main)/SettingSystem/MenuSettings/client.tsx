"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { MenuData } from "@/types/menu-settings"
import { getDataMenuAction, settingMenuAction } from "@/app/actions/menu-settings"
import { useMenuSettingsColumns } from "./columns"
import { DataTable } from "./data-table"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Search } from "lucide-react"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

export function MenuSettingsClient() {
    const t = useTranslations("MenuSettings")

    // Roles Definition
    const roles = [
        { id: "1", name: "Admin Management" },
        { id: "5", name: "Privilege" },
        { id: "4", name: "Admin" },
        { id: "2", name: "Management" },
        { id: "3", name: "Operator" },
    ]

    // State
    const [selectedRole, setSelectedRole] = React.useState<string>("1")
    const [data, setData] = React.useState<MenuData[]>([])
    const [loading, setLoading] = React.useState(false)
    const [searchQuery, setSearchQuery] = React.useState("")

    const handleToggle = async (item: MenuData, field: string, value: string) => {
        // Optimistic update could happen here, but requirements say "Wait for response"
        // So we just call API. If slow, we might want a loading state for that row/switch?
        // User said: "Should wait for response" and "If not success, alert and do not change".
        // This implies pessimistic update: change only after success.

        try {
            // Construct JSON for the single changed item
            // We need to send the object exactly as requested: [{ menu_id, readable, writeable, control }]
            // BUT updated with the NEW value for the specific field.

            const updatedItem = { ...item, [field]: value }

            const payload = [{
                menu_id: updatedItem.menu_id,
                readable: updatedItem.readable,
                writeable: updatedItem.writeable,
                control: updatedItem.control
            }]

            const jsonValue = JSON.stringify(payload)

            const result = await settingMenuAction(selectedRole, jsonValue)

            if (result && result.result) {
                // Success: Update local state
                setData(prevData => prevData.map(d =>
                    d.menu_id === item.menu_id ? updatedItem : d
                ))
                toast.success(t("saveSuccess"))
            } else {
                toast.error(t("saveError"))
            }

        } catch (error) {
            console.error("Toggle error", error)
            toast.error(t("saveError"))
        }
    }

    // Columns
    const columns = useMenuSettingsColumns(handleToggle)

    // Fetch Data
    React.useEffect(() => {
        const fetchData = async () => {
            if (!selectedRole) return
            setLoading(true)
            try {
                // Assuming user_id is handled by server action default or context if avail.
                // Action defaults to "8" if not passed.
                const result = await getDataMenuAction(selectedRole)
                setData(result)
            } catch (error) {
                console.error("Failed to fetch menu data", error)
                toast.error(t("fetchError"))
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [selectedRole, t])

    // Filter Data
    const filteredData = React.useMemo(() => {
        if (!searchQuery) return data
        const lowerQuery = searchQuery.toLowerCase()
        return data.filter(item =>
            item.menu_name.toLowerCase().includes(lowerQuery)
        )
    }, [data, searchQuery])

    return (
        <div className="flex flex-col gap-6 w-full">
            {/* Top Bar: Role Select and Search */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center w-full">
                {/* Role Selector */}
                <div className="w-full md:w-[300px]">
                    <Select value={selectedRole} onValueChange={setSelectedRole}>
                        <SelectTrigger className="w-full h-9 rounded-lg bg-white border-gray-200 shadow-sm text-foreground">
                            <SelectValue placeholder={t("selectRole")} />
                        </SelectTrigger>
                        <SelectContent>
                            {roles.map((role) => (
                                <SelectItem key={role.id} value={role.id}>
                                    {role.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Search Input */}
                <div className="relative w-full md:w-[400px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={t("searchPlaceholder")}
                        className="pl-9 h-9 rounded-lg bg-white border-gray-200 shadow-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Table Section */}
            <div className="flex-1">
                <DataTable columns={columns} data={filteredData} loading={loading} />
            </div>
        </div>
    )
}
