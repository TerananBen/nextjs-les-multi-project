"use client"

import { useTranslations } from "next-intl"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { MaintenanceDetailRecord } from "@/app/actions/maintenance"

interface DetailDataTableProps {
    data: MaintenanceDetailRecord[]
}

export function DetailDataTable({ data }: DetailDataTableProps) {
    const t = useTranslations("MaintenanceDashboard")

    if (!data.length) {
        return (
            <div className="flex justify-center items-center h-48 border rounded-md text-gray-500">
                {t("detail.table.noData")}
            </div>
        )
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader className="bg-slate-50">
                    <TableRow>
                        <TableHead className="w-[50px] text-center">#</TableHead>
                        <TableHead>{t("detail.table.poleName")}</TableHead>
                        <TableHead>{t("detail.table.oldDevice")}</TableHead>
                        <TableHead>{t("detail.table.newDevice")}</TableHead>
                        <TableHead>{t("detail.table.coordinates")}</TableHead>
                        <TableHead>{t("detail.table.issueReason")}</TableHead>
                        <TableHead>{t("detail.table.repairAction")}</TableHead>
                        <TableHead className="text-center">{t("detail.table.status")}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((row, index) => (
                        <TableRow key={row.imsi_befor || index}>
                            <TableCell className="text-center">{index + 1}</TableCell>
                            <TableCell>{row.street_light_name}</TableCell>
                            <TableCell>{row.imsi_befor}</TableCell>
                            <TableCell>
                                <Input
                                    defaultValue={row.imsi_after || ""}
                                    placeholder={t("detail.table.enterNewDevice")}
                                    className="h-8 w-full min-w-[120px]"
                                />
                            </TableCell>
                            <TableCell>
                                <div className="text-xs text-gray-500">
                                    {row.lat}, {row.lng}
                                </div>
                            </TableCell>
                            <TableCell>{row.lamp_case}</TableCell>
                            <TableCell>
                                <Select defaultValue={row.maintenance_case || ""}>
                                    <SelectTrigger className="h-8 w-[140px]">
                                        <SelectValue placeholder={t("detail.table.selectAction")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="change_rtu">{t("detail.table.changeRtu")}</SelectItem>
                                        <SelectItem value="change_lamp">{t("detail.table.changeLamp")}</SelectItem>
                                        <SelectItem value="repair_wiring">{t("detail.table.repairWiring")}</SelectItem>
                                        <SelectItem value="other">{t("detail.table.other")}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </TableCell>
                            <TableCell className="text-center">
                                <Button variant="destructive" size="sm" className="h-8 text-xs bg-red-500 hover:bg-red-600">
                                    {t("detail.table.statusButton")}
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
