"use client"

import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"
import { useProject } from "@/components/providers/project-provider"

export function HeaderProjectTitle({ className }: { className?: string }) {
    const t = useTranslations()
    const { config } = useProject()
    const title = config?.code || config?.name || t("ProjectName")

    return (
        <h1
            className={cn("text-base font-medium truncate max-w-[300px] md:max-w-[400px]", className)}
            title={title}
        >
            {title}
        </h1>
    )
}
