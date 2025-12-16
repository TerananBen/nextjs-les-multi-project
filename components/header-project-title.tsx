import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"

export function HeaderProjectTitle({ className }: { className?: string }) {
    const t = useTranslations()
    const title = t("ProjectName")

    return (
        <h1
            className={cn("text-base font-medium truncate max-w-[300px] md:max-w-[400px]", className)}
            title={title}
        >
            {title}
        </h1>
    )
}
