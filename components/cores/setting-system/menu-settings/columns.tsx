"use client"

import * as React from "react"
import { ColumnDef } from "@tanstack/react-table"
import { MenuData } from "@/types/menu-settings"
import { Switch } from "@/components/ui/switch"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"

export const useMenuSettingsColumns = (
    onToggle: (item: MenuData, field: string, value: string) => void
): ColumnDef<MenuData>[] => {
    const t = useTranslations("MenuSettings")

    return React.useMemo(() => [
        {
            accessorKey: "menu_name",
            header: t("menuName"),
            cell: ({ row }) => {
                const rawName = row.original.menu_name
                const translationKey = `menuNames.txt_list_name_${rawName}`

                return (
                    <span className="font-medium text-foreground">
                        {t(translationKey as never)}
                    </span>
                )
            },
        },
        {
            accessorKey: "readable",
            header: t("readable"),
            size: 140,
            cell: ({ row }) => {
                const isChecked = row.original.readable === "1"
                return (
                    <div className="flex justify-center items-center">
                        <Switch
                            checked={isChecked}
                            onCheckedChange={(checked) => {
                                onToggle(row.original, "readable", checked ? "1" : "0")
                            }}
                            className="cursor-pointer data-[state=checked]:bg-emerald-600"
                        />
                    </div>
                )
            },
        },
        {
            accessorKey: "writable",
            header: t("writable"),
            size: 140,
            cell: ({ row }) => {
                const isChecked = row.original.writable === "1"
                const isReadable = row.original.readable === "1"
                return (
                    <div className="flex justify-center items-center">
                        <Switch
                            checked={isChecked}
                            disabled={!isReadable}
                            onCheckedChange={(checked) => {
                                onToggle(row.original, "writable", checked ? "1" : "0")
                            }}
                            className={cn(
                                isReadable ? "cursor-pointer" : "cursor-not-allowed opacity-40",
                                "data-[state=checked]:bg-emerald-600"
                            )}
                        />
                    </div>
                )
            },
        },
        {
            accessorKey: "control",
            header: t("control"),
            size: 140,
            cell: ({ row }) => {
                const isChecked = row.original.control === "1"
                const isReadable = row.original.readable === "1"
                return (
                    <div className="flex justify-center items-center">
                        <Switch
                            checked={isChecked}
                            disabled={!isReadable}
                            onCheckedChange={(checked) => {
                                onToggle(row.original, "control", checked ? "1" : "0")
                            }}
                            className={cn(
                                isReadable ? "cursor-pointer" : "cursor-not-allowed opacity-40",
                                "data-[state=checked]:bg-emerald-600"
                            )}
                        />
                    </div>
                )
            },
        },
    ], [t, onToggle])
}
