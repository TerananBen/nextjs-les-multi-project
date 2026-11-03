"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { SelectedDevice } from "./client"
import { Button } from "@/components/ui/button"
import { Trash2, MapPin } from "lucide-react"
import { getLeafletIconUrl, MarkerColor, MarkerBadge } from "@/lib/map-icons"

interface SelectedTableProps {
    items: SelectedDevice[]
    onUpdateReason?: (imsi: string, reason: string) => void
    onRemoveItem: (imsi: string) => void
}

function getMarkerConfig(device: SelectedDevice, tMap: ReturnType<typeof useTranslations>): { color: MarkerColor, badge: MarkerBadge, statusText: string } {
    const status = device.status;
    const isAuto = device.type_schedule !== "manual" && device.using_sensor?.toLowerCase() !== "false";
    const power = parseInt(device.last_power || "0", 10);
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
            return { color: 'gray', badge: null, statusText: tMap("legend.unknown") };
    }
}

export function SelectedTable({ items, onRemoveItem }: SelectedTableProps) {
    const t = useTranslations("MaintenanceConfig.selectedTable")
    const tMap = useTranslations("MapGlobal")

    return (
        <div className="flex flex-col h-full bg-background overflow-hidden">
            <div className="flex-1 overflow-auto">
                <table className="w-full text-sm text-center border-collapse">
                    <thead className="bg-muted/50 sticky top-0 z-10 text-xs font-semibold text-muted-foreground border-b">
                        <tr>
                            <th className="py-2.5 px-2 text-left font-semibold whitespace-nowrap">{t("poleName")}</th>
                            <th className="py-2.5 px-2 text-left font-semibold whitespace-nowrap">{t("deviceNumber")}</th>
                            <th className="py-2.5 px-2 text-center font-semibold whitespace-nowrap">{t("coordinates")}</th>
                            <th className="py-2.5 px-2 text-center font-semibold whitespace-nowrap">{t("reason")}</th>
                            <th className="py-2.5 px-2 text-center font-semibold whitespace-nowrap w-12">{t("cancel")}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                        {items.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="py-12 text-center text-muted-foreground">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <div className="p-3 rounded-full bg-muted/60 text-muted-foreground/60">
                                            <MapPin className="h-6 w-6" />
                                        </div>
                                        <p className="text-sm font-medium text-foreground">{t("noData")}</p>
                                        <p className="text-xs text-muted-foreground max-w-xs">{t("hintEmpty")}</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            items.map((item) => {
                                const config = getMarkerConfig(item, tMap);
                                return (
                                    <tr key={item.imsi} className="hover:bg-muted/30 transition-colors">
                                        <td className="py-2 px-2 text-left font-medium text-foreground">{item.street_light_name || "-"}</td>
                                        <td className="py-2 px-2 text-left font-mono text-xs text-muted-foreground">{item.imsi}</td>
                                        <td className="py-2 px-2 text-center text-xs text-muted-foreground">{item.lat}, {item.lng}</td>
                                        <td className="py-1.5 px-2 text-center">
                                            <div className="flex items-center justify-center">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={getLeafletIconUrl(config.color, config.badge)} className="w-6 h-6 object-contain drop-shadow-2xs" alt={config.statusText} />
                                            </div>
                                        </td>
                                        <td className="py-1.5 px-2 text-center">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => onRemoveItem(item.imsi)}
                                                className="h-7 w-7 p-0 cursor-pointer text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                title={t("cancel")}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
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
