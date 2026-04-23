"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { DeviceGroup, StreetLightDevice } from "@/types/street-light"
import { getListDataGroupAction, searchStreetLightFromGroupAction } from "@/app/actions/street-light"
import { useStreetLightColumns } from "./columns"
import { DataTable } from "./data-table"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Search, FileDown } from "lucide-react"
import { Button } from "@/components/ui/button"
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

    const handleExportExcel = () => {
        if (!devices || devices.length === 0) {
            toast.error(t("noData"))
            return
        }

        const escapeCSV = (val: string | number | null | undefined) => {
            const str = String(val ?? "");
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };

        const headers = [
            t("table.index", { defaultValue: "Index" }),
            t("table.streetLightName", { defaultValue: "Street Light Name" }),
            t("table.gov", { defaultValue: "Group" }),
            t("table.deviceNo", { defaultValue: "Device No" }),
            t("table.groupName", { defaultValue: "Group Name" }),
            t("table.lastUpdate", { defaultValue: "Last Update" }),
            t("table.lifeTime", { defaultValue: "Life Time" }),
            t("table.lastPower", { defaultValue: "Last Power (W)" })
        ]

        const csvContent = [
            headers.join(","),
            ...devices.map((d, index) => [
                index + 1,
                escapeCSV(d.streetLightName),
                escapeCSV(d.streetLightSerial),
                escapeCSV(d.imeI_Name),
                escapeCSV(d.streetLightGroups?.join(", ")),
                escapeCSV(d.streetLightLastUpdate),
                escapeCSV(d.lifeTime),
                escapeCSV(d.lastPower)
            ].join(","))
        ].join("\n")

        const blob = new Blob([`\uFEFF${csvContent}`], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
        const fileName = `device_list_${selectedGroup}_${dateStr}_${timeStr}.csv`;
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    }

    return (
        <div className="flex flex-col gap-6 w-full">
            {/* Filter Bar */}
            <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center w-full">

                {/* Group Selector (Combobox) */}
                <div className="cursor-pointer w-full lg:max-w-[400px]">
                    <Combobox value={selectedGroup} onValueChange={setSelectedGroup}>
                        <ComboboxInput className="cursor-pointer h-9 w-full rounded-xl bg-white border-gray-200 shadow-sm" placeholder={t("selectGroupPlaceholder")} />
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
                <div className="flex flex-col sm:flex-row w-full lg:w-auto items-stretch sm:items-center gap-2 shrink-0">
                    <div className="relative w-full sm:flex-1 lg:w-auto min-w-0 sm:min-w-[200px] lg:w-[300px] xl:w-[350px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={t("searchPlaceholder")}
                            className="pl-9 h-9 w-full rounded-xl bg-white border-gray-200 shadow-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Button
                        variant="outline"
                        className="cursor-pointer h-9 w-full sm:w-auto whitespace-nowrap bg-green-50 text-green-600 hover:bg-green-100 border-green-200 shadow-sm rounded-xl shrink-0"
                        onClick={handleExportExcel}
                        disabled={loading || devices.length === 0}
                    >
                        <FileDown className="h-4 w-4 mr-2" />
                        {t("exportAllExcel")}
                    </Button>
                </div>
            </div>

            {/* Table Section */}
            <div className="flex-1">
                <DataTable columns={columns} data={filteredDevices} loading={loading} />
            </div>
        </div>
    )
}
