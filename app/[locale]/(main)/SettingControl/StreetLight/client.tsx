"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { DeviceGroup, StreetLightDevice } from "@/types/street-light"
import { getListDataGroupAction, searchStreetLightFromGroupAction } from "@/app/actions/street-light"
import { useStreetLightColumns } from "./columns"
import { DataTable } from "./data-table"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Search } from "lucide-react"
import {
    Combobox,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
} from "@/components/ui/combobox"

interface StreetLightClientProps {
    defaultGroupCode?: string
}

export function StreetLightClient({ defaultGroupCode }: StreetLightClientProps) {
    const t = useTranslations("StreetLight")

    // State
    const [groups, setGroups] = React.useState<DeviceGroup[]>([])
    const [selectedGroup, setSelectedGroup] = React.useState<string>("ALL")
    const [devices, setDevices] = React.useState<StreetLightDevice[]>([])
    const [loading, setLoading] = React.useState(false)

    // Local Filter State
    const [searchQuery, setSearchQuery] = React.useState("")

    // Columns
    const columns = useStreetLightColumns()

    // 1. Fetch Groups on Mount
    React.useEffect(() => {
        const fetchGroups = async () => {
            try {
                // setLoading(true) // Optional: don't block UI for initial list load if possible, or use skeleton.
                const data = await getListDataGroupAction()
                if (data && data.length > 0) {
                    // Ensure "ALL" exists or prepend it
                    const hasAll = data.some(g => g.groupName === "ALL")
                    if (!hasAll) {
                        setGroups([{ groupCode: defaultGroupCode || "oPIvy3ef9VITLORALOCAL", groupName: "ALL" }, ...data])
                    } else {
                        setGroups(data)
                    }
                } else {
                    if (process.env.NODE_ENV === 'development') {
                        setGroups([
                            { groupCode: "oPIvy3ef9VITLORALOCAL", groupName: "ALL" }
                        ])
                    }
                }
            } catch (error) {
                console.error("Failed to fetch groups", error)
                toast.error(t("failedToLoadData"))
            }
        }

        fetchGroups()
    }, [t, defaultGroupCode])

    // 2. Fetch Devices when Group Changes (Auto-Search)
    React.useEffect(() => {
        const fetchDevices = async () => {
            if (!selectedGroup) return

            setLoading(true)
            try {
                const data = await searchStreetLightFromGroupAction(selectedGroup)
                if (data) {
                    setDevices(data)
                } else {
                    setDevices([])
                }
            } catch (error) {
                console.error("Failed to fetch devices", error)
                toast.error(t("failedToLoadData"))
                setDevices([])
            } finally {
                setLoading(false)
            }
        }

        fetchDevices()
    }, [selectedGroup, t])


    // 3. Local Filtering
    const filteredDevices = React.useMemo(() => {
        if (!searchQuery) return devices
        const lowerQuery = searchQuery.toLowerCase()
        return devices.filter(device =>
            (device.streetLightName && device.streetLightName.toLowerCase().includes(lowerQuery)) ||
            (device.imeI_Name && device.imeI_Name.toLowerCase().includes(lowerQuery)) ||
            (device.streetLightSerial && device.streetLightSerial.toLowerCase().includes(lowerQuery)) ||
            (device.streetLightGroups && device.streetLightGroups.some(g => g.toLowerCase().includes(lowerQuery))) ||
            (device.streetLightStatus && device.streetLightStatus.toLowerCase().includes(lowerQuery))
        )
    }, [devices, searchQuery])

    return (
        <div className="flex flex-col gap-6 w-full">
            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center w-full">

                {/* Group Selector (Combobox) */}
                <div className="flex-1 w-full">
                    <Combobox value={selectedGroup} onValueChange={setSelectedGroup}>
                        <ComboboxInput className="h-9 rounded-xl bg-white border-gray-200 shadow-sm" placeholder={t("selectGroupPlaceholder")} />
                        <ComboboxContent searchPlaceholder={t("searchGroupPlaceholder")}>
                            <ComboboxEmpty>{t("noGroupFound")}</ComboboxEmpty>
                            <ComboboxList>
                                {groups.map((group) => (
                                    <ComboboxItem key={group.groupCode} value={group.groupName}>
                                        {group.groupName}
                                    </ComboboxItem>
                                ))}
                            </ComboboxList>
                        </ComboboxContent>
                    </Combobox>
                </div>

                {/* Local Search Input */}
                <div className="relative w-full md:w-[400px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={t("searchPlaceholder")}
                        className="pl-9 h-9 rounded-xl bg-white border-gray-200 shadow-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Table Section */}
            <div className="flex-1">
                <DataTable columns={columns} data={filteredDevices} loading={loading} />
            </div>
        </div>
    )
}
