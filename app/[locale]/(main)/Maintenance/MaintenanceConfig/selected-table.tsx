"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { SelectedDevice } from "./client"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { getLeafletIconUrl, MarkerColor, MarkerBadge } from "@/lib/map-icons"

interface SelectedTableProps {
    items: SelectedDevice[]
    onUpdateReason: (imsi: string, reason: string) => void
    onRemoveItem: (imsi: string) => void
}

function getMarkerConfig(device: SelectedDevice, tMap: ReturnType<typeof useTranslations>): { color: MarkerColor, badge: MarkerBadge, statusText: string } {
    const status = device.status;
    const isAuto = device.type_schedule !== "manual" && device.using_sensor?.toLowerCase() !== "false";
    const power = parseInt(device.last_power || "0");
    const isPowerAbnormal = power > 5;

    switch (status) {
        case "0":
        case "2":
        case "1":
            return {
                color: status === "1" ? 'green' : 'gray',
                badge: isAuto ? 'A' : 'M',
                statusText: isAuto ? tMap("legend.auto") : tMap("legend.manual")
            };
        case "3":
            return { color: isPowerAbnormal ? 'green' : 'gray', badge: '⚡', statusText: tMap("legend.abnormal") };
        case "4":
            return { color: 'red', badge: null, statusText: tMap("legend.failure") };
        case "5":
        case "6":
            return { color: 'blue', badge: 'A', statusText: tMap("legend.disconnect") };
        default:
            return { color: 'gray', badge: null, statusText: "Unknown" };
    }
}

export function SelectedTable({ items, onRemoveItem }: SelectedTableProps) {
    const t = useTranslations("MaintenanceConfig.selectedTable")
    const tMap = useTranslations("MapGlobal")

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
                            items.map((item) => {
                                const config = getMarkerConfig(item, tMap);
                                return (
                                    <tr key={item.imsi} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                                        <td className="py-3 px-2">{item.street_light_name || "-"}</td>
                                        <td className="py-3 px-2">{item.imsi}</td>
                                        <td className="py-3 px-2">{item.lat}, {item.lng}</td>
                                        <td className="py-2 px-2">
                                            <div className="flex items-center gap-2 justify-center">
                                                <div className="flex flex-none items-center justify-center">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img src={getLeafletIconUrl(config.color, config.badge)} className="w-[30px] h-[30px] object-contain drop-shadow-sm" alt="" />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-2 px-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => onRemoveItem(item.imsi)}
                                                className="h-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                            >
                                                <Trash2 className="w-4 h-4 mr-1" />
                                            </Button>
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>

        </div>
    )
}
