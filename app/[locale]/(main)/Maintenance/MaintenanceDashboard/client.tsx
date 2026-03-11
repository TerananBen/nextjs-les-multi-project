"use client"

import { useTranslations } from "next-intl"
import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { DataTable } from "./data-table"
import { useMaintenanceColumns } from "./columns"
import { DetailDialog } from "./detail-dialog"
import { Search, Info, AlertCircle, Clock, CheckCircle, CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

import {
    OperatorAndAdminData,
    MaintenanceDashboardData,
    getDataListAllMaintenanceDashboard
} from "@/app/actions/maintenance"

interface ClientProps {
    initialUsersData: OperatorAndAdminData | null
}

export default function MaintenanceDashboardClient({ initialUsersData }: ClientProps) {
    const t = useTranslations("MaintenanceDashboard")
    const [selectedDetailId, setSelectedDetailId] = useState<string | null>(null)
    const columns = useMaintenanceColumns(setSelectedDetailId)
    const [dateStart, setDateStart] = useState<Date | undefined>(undefined)
    const [dateEnd, setDateEnd] = useState<Date | undefined>(undefined)
    const [technician, setTechnician] = useState("ALL")
    const [supervisor, setSupervisor] = useState("ALL")
    const [data, setData] = useState<MaintenanceDashboardData | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    const fetchData = useCallback(async () => {
        setIsLoading(true)
        try {
            const formattedStart = dateStart ? format(dateStart, "dd-MM-yyyy") : "ALL"
            const formattedEnd = dateEnd ? format(dateEnd, "dd-MM-yyyy") : "ALL"

            const result = await getDataListAllMaintenanceDashboard({
                id_admin: supervisor,
                id_operator: technician,
                date_start: formattedStart,
                date_end: formattedEnd
            })
            setData(result)
        } catch (error) {
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }, [dateStart, dateEnd, technician, supervisor])

    useEffect(() => {
        fetchData()
    }, [])

    return (
        <div>
            {/* Filter Bar */}
            <Card className="mb-4">
                <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                    <div className="flex flex-col gap-2">
                        <Label>{t("filter.startDate")}</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !dateStart && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateStart ? format(dateStart, "dd-MM-yyyy") : <span>{t("filter.all")}</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={dateStart}
                                    onSelect={setDateStart}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="flex flex-col gap-2">
                        <Label>{t("filter.endDate")}</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !dateEnd && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateEnd ? format(dateEnd, "dd-MM-yyyy") : <span>{t("filter.all")}</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={dateEnd}
                                    onSelect={setDateEnd}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="flex flex-col gap-2">
                        <Label>{t("filter.technician")}</Label>
                        <Select value={technician} onValueChange={setTechnician}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder={t("filter.all")} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">{t("filter.all")}</SelectItem>
                                {initialUsersData?.name_operator?.map(op => (
                                    <SelectItem key={op.id} value={op.id}>{op.full_name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex flex-col gap-2">
                        <Label>{t("filter.supervisor")}</Label>
                        <Select value={supervisor} onValueChange={setSupervisor}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder={t("filter.all")} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">{t("filter.all")}</SelectItem>
                                {initialUsersData?.name_admin?.map(ad => (
                                    <SelectItem key={ad.id} value={ad.id}>{ad.full_name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button
                        onClick={fetchData}
                        disabled={isLoading}
                        className="bg-[#e91e63] hover:bg-[#d81b60] text-white w-full lg:w-auto mt-auto"
                    >
                        <Search className="w-4 h-4 mr-2" />
                        {t("filter.search")}
                    </Button>
                </CardContent>
            </Card>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <Card className="shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">
                                {t("summary.reportedTitle", { count: data?.total_lamp_waste || 0 })}
                            </h3>
                            <p className="text-xs text-sky-600">
                                {t("summary.totalReported", { count: data?.total_lamp_waste || 0 })}
                            </p>
                            <div className="h-1 w-full bg-red-500 mt-3 rounded-full" />
                        </div>
                        <AlertCircle className="w-8 h-8 text-red-400 opacity-80" />
                    </CardContent>
                </Card>

                <Card className="shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">
                                {t("summary.pendingTitle", { count: data?.total_wait_repair || 0 })}
                            </h3>
                            <p className="text-xs text-sky-600">
                                {t("summary.totalPending", { count: data?.total_lamp_waste || 0 })}
                            </p>
                            <div className="h-1 w-full bg-orange-400 mt-3 rounded-full" />
                        </div>
                        <Clock className="w-8 h-8 text-orange-400 opacity-80" />
                    </CardContent>
                </Card>

                <Card className="shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">
                                {t("summary.repairedTitle", { count: data?.total_repair_all || 0 })}
                            </h3>
                            <p className="text-xs text-sky-600">
                                {t("summary.fromRepaired", { count: data?.total_lamp_waste || 0 })}
                            </p>
                            <div className="h-1 w-full bg-green-500 mt-3 rounded-full" />
                        </div>
                        <CheckCircle className="w-8 h-8 text-green-500 opacity-80" />
                    </CardContent>
                </Card>
            </div>

            {/* Data Table */}
            <DataTable
                columns={columns}
                data={data?.list_imsi_all || []}
                loading={isLoading}
            />

            {/* Detail Modal */}
            <DetailDialog 
                detailId={selectedDetailId} 
                onClose={() => setSelectedDetailId(null)} 
            />
        </div>
    )
}
