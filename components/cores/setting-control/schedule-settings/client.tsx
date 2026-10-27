"use client"

import * as React from "react"
import { ScheduleItem } from "@/types/schedule-settings"
import { getDataScheduleAction } from "@/app/actions/schedule-settings"
import { useScheduleColumns } from "./columns"
import { DataTable } from "./data-table"
import { toast } from "sonner"
import { getListDataGroupAction } from "@/app/actions/street-light"
import { DeviceGroup } from "@/types/street-light"
import { EditScheduleDialog } from "./edit-dialog"
import { ResponseDialog } from "./response-dialog"
import { Loader2, Search, X, Plus } from "lucide-react"
import { useTranslations } from "next-intl"
import { deleteScheduleAction } from "@/app/actions/schedule-settings"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface ScheduleSettingsClientProps {
    versionLightSensor: string
}

export function ScheduleSettingsClient({ versionLightSensor }: ScheduleSettingsClientProps) {
    const t = useTranslations("ScheduleSettings")
    const [data, setData] = React.useState<ScheduleItem[]>([])
    const [groups, setGroups] = React.useState<DeviceGroup[]>([])
    const [loading, setLoading] = React.useState(true)

    // Filter states
    const [searchQuery, setSearchQuery] = React.useState("")
    const [typeFilter, setTypeFilter] = React.useState<string>("ALL")

    // Dialog State
    const [openDialog, setOpenDialog] = React.useState(false)
    const [selectedSchedule, setSelectedSchedule] = React.useState<ScheduleItem | null>(null)

    // Response Dialog State
    const [openResponseDialog, setOpenResponseDialog] = React.useState(false)
    const [responseScheduleCode, setResponseScheduleCode] = React.useState<string | null>(null)
    const [responseScheduleName, setResponseScheduleName] = React.useState<string | null>(null)
    const [responseTypeSchedule, setResponseTypeSchedule] = React.useState<string | null>(null)

    // Delete State
    const [openDeleteDialog, setOpenDeleteDialog] = React.useState(false)
    const [scheduleToDelete, setScheduleToDelete] = React.useState<ScheduleItem | null>(null)
    const [isDeleting, setIsDeleting] = React.useState(false)

    const columns = useScheduleColumns({
        onEdit: (item) => {
            setSelectedSchedule(item)
            setOpenDialog(true)
        },
        onDelete: (item) => {
            setScheduleToDelete(item)
            setOpenDeleteDialog(true)
        },
        onFeedback: (item) => {
            setResponseScheduleCode(item.groupCode) // Using groupCode as code_name as per API requirement usually
            setResponseScheduleName(item.scheduleName)
            setResponseTypeSchedule(item.typeSchedule)
            setOpenResponseDialog(true)
        }
    })

    const handleAdd = () => {
        setSelectedSchedule(null) // Ensure we are in "Add" mode
        setOpenDialog(true)
    }

    const handleDeleteConfirm = async () => {
        if (!scheduleToDelete) return

        setIsDeleting(true)
        try {
            const result = await deleteScheduleAction(scheduleToDelete.groupCode)
            if (result.success) {
                toast.success(t("deleteDialog.success"))
                setOpenDeleteDialog(false)
                // Refresh data
                window.location.reload()
            } else {
                toast.error(t("deleteDialog.error") + (result.message ? `: ${result.message}` : ""))
            }
        } catch (error) {
            console.error(error)
            toast.error(t("deleteDialog.error"))
        } finally {
            setIsDeleting(false)
            setScheduleToDelete(null)
        }
    }

    React.useEffect(() => {
        const fetchData = async () => {
            try {
                const [scheduleResult, groupsResult] = await Promise.all([
                    getDataScheduleAction(),
                    getListDataGroupAction()
                ])
                setData(scheduleResult)
                setGroups(groupsResult)
            } catch (error) {
                console.error("Failed to fetch data", error)
                toast.error(t("failedToLoadData"))
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [t])

    // Filtering
    const filteredData = React.useMemo(() => {
        let result = data

        if (typeFilter !== "ALL") {
            result = result.filter((item) => item.typeSchedule === typeFilter)
        }

        if (searchQuery.trim()) {
            const lowerQuery = searchQuery.toLowerCase().trim()
            result = result.filter((item) =>
                (item.scheduleName && item.scheduleName.toLowerCase().includes(lowerQuery)) ||
                (item.groupCode && item.groupCode.toLowerCase().includes(lowerQuery))
            )
        }

        return result
    }, [data, typeFilter, searchQuery])

    return (
        <div className="flex flex-1 flex-col gap-4 w-full h-full">
            {/* Filter Controls Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 p-2 rounded-lg border bg-card text-card-foreground shadow-2xs">
                {/* Type Filter Select */}
                <div className="w-full sm:w-[180px]">
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger className="h-9 text-sm w-full bg-background cursor-pointer">
                            <SelectValue placeholder={t("filter.allTypes", { defaultValue: "All Types" })} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL" className="cursor-pointer text-sm">
                                {t("filter.allTypes", { defaultValue: "All Types" })}
                            </SelectItem>
                            <SelectItem value="time" className="cursor-pointer text-sm">
                                {t("types.time")}
                            </SelectItem>
                            <SelectItem value="light" className="cursor-pointer text-sm">
                                {t("types.light")}
                            </SelectItem>
                            <SelectItem value="manual" className="cursor-pointer text-sm">
                                {t("types.manual")}
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Search & Actions Row */}
                <div className="flex items-center gap-2 flex-1 min-w-0 w-full sm:w-auto">
                    {/* Search Input */}
                    <div className="relative flex-1 min-w-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                            placeholder={t("filter.searchPlaceholder", { defaultValue: "Search schedule..." })}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 pr-9 h-9 text-sm bg-background w-full shadow-2xs"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    {/* Add Schedule Button */}
                    <Button
                        onClick={handleAdd}
                        className="cursor-pointer shrink-0 h-9 px-4 text-sm font-medium shadow-2xs"
                    >
                        <Plus className="mr-1.5 h-4 w-4" />
                        {t("buttons.add")}
                    </Button>
                </div>
            </div>

            {/* Middle & Bottom Table Section */}
            <div className="flex-1 flex flex-col min-h-0">
                <DataTable columns={columns} data={filteredData} loading={loading} />
            </div>

            <EditScheduleDialog
                versionLightSensor={versionLightSensor}
                open={openDialog}
                onOpenChange={setOpenDialog}
                schedule={selectedSchedule}
                groups={groups}
            />

            <ResponseDialog
                open={openResponseDialog}
                onOpenChange={setOpenResponseDialog}
                codeName={responseScheduleCode}
                scheduleName={responseScheduleName}
                typeSchedule={responseTypeSchedule}
            />

            <AlertDialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("deleteDialog.title")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("deleteDialog.description", { name: scheduleToDelete?.scheduleName || "" })}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="cursor-pointer" disabled={isDeleting}>
                            {t("deleteDialog.cancel")}
                        </AlertDialogCancel>
                        <Button
                            variant="destructive"
                            className="cursor-pointer"
                            onClick={(e) => {
                                e.preventDefault()
                                handleDeleteConfirm()
                            }}
                            disabled={isDeleting}
                        >
                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isDeleting ? t("deleteDialog.deleting") : t("deleteDialog.confirm")}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
