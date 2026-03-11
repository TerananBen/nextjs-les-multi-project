"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { SelectedDevice } from "./client"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"

interface SelectedTableProps {
    items: SelectedDevice[]
    onUpdateReason: (imsi: string, reason: string) => void
    onRemoveItem: (imsi: string) => void
}

export function SelectedTable({ items, onUpdateReason, onRemoveItem }: SelectedTableProps) {
    const t = useTranslations("MaintenanceConfig.selectedTable")

    return (
        <div className="flex flex-col h-full bg-white border rounded-md overflow-hidden">
            <div className="flex-1 overflow-auto">
                <table className="w-full text-sm text-center border-collapse">
                    <thead className="bg-[#f8f9fa] sticky top-0 z-10 font-bold border-b text-slate-700">
                        <tr>
                            <th className="py-3 px-2 whitespace-nowrap">{t("poleName")}</th>
                            <th className="py-3 px-2 whitespace-nowrap">{t("deviceNumber")}</th>
                            <th className="py-3 px-2 whitespace-nowrap">{t("coordinates")}</th>
                            <th className="py-3 px-2 whitespace-nowrap w-[30%]">{t("reason")}</th>
                            <th className="py-3 px-2 whitespace-nowrap w-[100px]">{t("cancel")}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="py-8 text-center text-muted-foreground border-b bg-slate-50">
                                    {t("noData")}
                                </td>
                            </tr>
                        ) : (
                            items.map((item, idx) => (
                                <tr key={item.imsi} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                                    <td className="py-3 px-2">{item.street_light_name || "-"}</td>
                                    <td className="py-3 px-2">{item.imsi}</td>
                                    <td className="py-3 px-2">{item.lat}, {item.lng}</td>
                                    <td className="py-2 px-2">
                                        <Input 
                                            value={item.reason} 
                                            onChange={(e) => onUpdateReason(item.imsi, e.target.value)}
                                            className="h-8 w-full"
                                            placeholder="..."
                                        />
                                    </td>
                                    <td className="py-2 px-2">
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={() => onRemoveItem(item.imsi)}
                                            className="h-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                        >
                                            <Trash2 className="w-4 h-4 mr-1" />
                                            {t("cancel")}
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            
        </div>
    )
}
