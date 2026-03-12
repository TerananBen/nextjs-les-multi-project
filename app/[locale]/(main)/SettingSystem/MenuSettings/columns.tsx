"use client"

import { ColumnDef } from "@tanstack/react-table"
import { MenuData } from "@/types/menu-settings"
import { Switch } from "@/components/ui/switch"
import { useTranslations } from "next-intl"

export const useMenuSettingsColumns = (
    onToggle: (item: MenuData, field: string, value: string) => void
): ColumnDef<MenuData>[] => {
    const t = useTranslations("MenuSettings")

    return [
        {
            accessorKey: "menu_name",
            header: t("menuName"),
            cell: ({ row }) => {
                const rawName = row.original.menu_name;
                const translationKey = `menuNames.txt_list_name_${rawName}`;
                // Only try to translate if it looks like a known key pattern, else fallback
                // However, since we have specific keys, we can try to translate.
                // t() will return the key if not found in some setups, or we can check existence.
                // A simple approach: t(key). If it equals key (and key contains dot), it's probably missing.
                // But for safety, let's just use t().

                return (
                    <div className="font-medium">
                        {t(translationKey as never)}
                    </div>
                )
            },
        },
        {
            accessorKey: "readable",
            header: t("readable"),
            cell: ({ row }) => {
                const isChecked = row.original.readable === "1"
                return (
                    <div className="flex items-center">
                        <Switch
                            checked={isChecked}
                            onCheckedChange={(checked) => {
                                onToggle(row.original, 'readable', checked ? "1" : "0")
                            }}
                            className="data-[state=checked]:bg-green-500 cursor-pointer"
                        />
                    </div>
                )
            },
        },
        {
            accessorKey: "writeable",
            header: t("writeable"),
            cell: ({ row }) => {
                const isChecked = row.original.writeable === "1"
                const isReadable = row.original.readable === "1"
                return (
                    <div className="flex items-center">
                        <Switch
                            checked={isChecked}
                            disabled={!isReadable}
                            onCheckedChange={(checked) => {
                                onToggle(row.original, 'writeable', checked ? "1" : "0")
                            }}
                            className={`${isReadable ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'} data-[state=checked]:bg-green-500`}
                        />
                    </div>
                )
            },
        },
        {
            accessorKey: "control",
            header: t("control"),
            cell: ({ row }) => {
                const isChecked = row.original.control === "1"
                const isReadable = row.original.readable === "1"
                return (
                    <div className="flex items-center">
                        <Switch
                            checked={isChecked}
                            disabled={!isReadable}
                            onCheckedChange={(checked) => {
                                onToggle(row.original, 'control', checked ? "1" : "0")
                            }}
                            className={`${isReadable ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'} data-[state=checked]:bg-green-500`}
                        />
                    </div>
                )
            },
        },
    ]
}
