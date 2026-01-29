"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { GroupConfigData } from "@/types/group-config"
import { getListDataGroupAllAction, addNewGroupNameAction } from "@/app/actions/group-config"
import { useGroupConfigColumns } from "./columns"
import { DataTable } from "./data-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Search, Plus, Loader2 } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogTrigger,
    DialogClose,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

export function GroupConfigClient() {
    const t = useTranslations("GroupConfig")

    // State
    const [data, setData] = React.useState<GroupConfigData[]>([])
    const [loading, setLoading] = React.useState(false)
    const [searchQuery, setSearchQuery] = React.useState("")

    // Add Group State
    const [isAddGroupOpen, setIsAddGroupOpen] = React.useState(false)
    const [newGroupName, setNewGroupName] = React.useState("")
    const [isAdding, setIsAdding] = React.useState(false)

    const fetchData = async () => {
        setLoading(true)
        try {
            const result = await getListDataGroupAllAction()
            if (result) {
                setData(result)
            }
        } catch (error) {
            console.error("Failed to fetch groups", error)
            toast.error(t("loadFailed"))
        } finally {
            setLoading(false)
        }
    }

    // Columns
    const columns = useGroupConfigColumns(fetchData)

    // Fetch Data on Mount
    React.useEffect(() => {
        fetchData()
    }, [])

    const handleAddGroup = async () => {
        if (!newGroupName.trim()) {
            toast.error(t("dialog.required"))
            return
        }

        setIsAdding(true)
        try {
            const result = await addNewGroupNameAction(newGroupName)
            if (result.result) {
                toast.success(t("dialog.success"))
                setIsAddGroupOpen(false)
                setNewGroupName("")
                fetchData() // Refresh list
            } else {
                toast.error(t("dialog.error"))
            }
        } catch (error) {
            console.error("Error adding group:", error)
            toast.error(t("dialog.error"))
        } finally {
            setIsAdding(false)
        }
    }

    // Local Filtering
    const filteredData = React.useMemo(() => {
        if (!searchQuery) return data
        const lowerQuery = searchQuery.toLowerCase()
        return data.filter(group =>
            group.group_name.toLowerCase().includes(lowerQuery)
        )
    }, [data, searchQuery])

    return (
        <div className="flex flex-col gap-6 w-full">
            {/* Top Bar: Search and Add Button */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center w-full">
                {/* Search Input */}
                <div className="relative w-full md:w-[400px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={t("searchPlaceholder")}
                        className="pl-9 h-12 rounded-xl bg-white border-gray-200 shadow-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Add Group Button */}
                <Dialog open={isAddGroupOpen} onOpenChange={setIsAddGroupOpen}>
                    <DialogTrigger asChild>
                        <Button className="h-12 rounded-xl px-6 bg-primary hover:bg-primary/90 text-white shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]">
                            <Plus className="mr-2 h-4 w-4" />
                            {t("addGroup")}
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>{t("dialog.title")}</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="group-name" className="text-right">
                                    {t("dialog.groupNameLabel")}
                                </Label>
                                <Input
                                    id="group-name"
                                    value={newGroupName}
                                    onChange={(e) => setNewGroupName(e.target.value)}
                                    className="col-span-3"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="secondary">
                                    {t("dialog.cancel")}
                                </Button>
                            </DialogClose>
                            <Button onClick={handleAddGroup} disabled={isAdding}>
                                {isAdding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isAdding ? t("dialog.saving") : t("dialog.save")}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Table Section */}
            <div className="flex-1">
                <DataTable columns={columns} data={filteredData} loading={loading} />
            </div>
        </div>
    )
}
