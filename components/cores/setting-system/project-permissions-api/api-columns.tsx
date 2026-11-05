"use client"

import * as React from "react"
import { ColumnDef } from "@tanstack/react-table"
import type { ApiMenuSetting } from "@/types/api-settings"
import { Input } from "@/components/ui/input"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"

interface ApiVersionCellProps {
    item: ApiMenuSetting
    onUpdate: (menuId: string, version: number) => void
    disabled?: boolean
    isModified?: boolean
    modifiedText: string
}

function ApiVersionCell({
    item,
    onUpdate,
    disabled = false,
    isModified = false,
    modifiedText
}: ApiVersionCellProps) {
    const [val, setVal] = React.useState<number | string>(item.api_version)

    React.useEffect(() => {
        setVal(item.api_version)
    }, [item.api_version])

    const handleCommit = (newVal: number) => {
        if (!disabled && !isNaN(newVal) && newVal >= 1 && newVal !== item.api_version) {
            onUpdate(item.menu_id, newVal)
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (disabled) return
        const str = e.target.value
        setVal(str)
        const parsed = parseInt(str, 10)
        if (!isNaN(parsed) && parsed >= 1) {
            handleCommit(parsed)
        }
    }

    const handleBlur = () => {
        if (disabled) return
        const parsed = parseInt(String(val), 10)
        if (isNaN(parsed) || parsed < 1) {
            setVal(item.api_version)
        } else if (parsed !== item.api_version) {
            handleCommit(parsed)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (disabled) return
        if (e.key === "Enter") {
            (e.target as HTMLInputElement).blur()
        }
    }

    return (
        <div className="flex justify-center items-center gap-2">
            <Input
                type="number"
                min={1}
                value={val}
                disabled={disabled}
                onChange={handleChange}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                className={cn(
                    "w-20 text-center font-mono h-8 bg-background shadow-2xs focus-visible:ring-1 text-sm transition-colors",
                    isModified && "border-amber-500/60 ring-1 ring-amber-500/30 bg-amber-500/5 font-semibold",
                    disabled && "cursor-not-allowed opacity-60 bg-muted"
                )}
            />
            {isModified && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 shrink-0">
                    {modifiedText}
                </span>
            )}
        </div>
    )
}

export const useApiSettingsColumns = (
    onUpdateVersion: (menuId: string, version: number) => void,
    isModifiedCheck: (item: ApiMenuSetting) => boolean,
    isWritable: boolean = true
): ColumnDef<ApiMenuSetting>[] => {
    const t = useTranslations("ApiSettings")
    const tMenu = useTranslations("MenuSettings")

    return React.useMemo(() => [
        {
            accessorKey: "menu_name",
            header: t("menuName"),
            cell: ({ row }) => {
                const rawName = row.original.menu_name
                const translationKey = `menuNames.txt_list_name_${rawName}`
                let displayName = rawName
                try {
                    displayName = tMenu(translationKey as never)
                } catch {
                    displayName = rawName
                }

                return (
                    <span className="font-medium text-foreground">
                        {displayName || rawName}
                    </span>
                )
            },
        },
        {
            accessorKey: "api_version",
            header: t("apiVersion"),
            size: 200,
            cell: ({ row }) => {
                const isModified = isModifiedCheck(row.original)
                return (
                    <ApiVersionCell
                        item={row.original}
                        onUpdate={onUpdateVersion}
                        disabled={!isWritable}
                        isModified={isModified}
                        modifiedText={t("modified")}
                    />
                )
            },
        },
    ], [t, tMenu, onUpdateVersion, isModifiedCheck, isWritable])
}
