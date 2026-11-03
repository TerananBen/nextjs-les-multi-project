import { getLocale, getTranslations } from "next-intl/server"
import { Link2Off } from "lucide-react"

export async function PageUnavailable() {
    const locale = await getLocale()
    const t = await getTranslations({ locale, namespace: "PageUnavailable" })

    return (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 rounded-xl border border-dashed border-border bg-muted/20 p-12 text-center min-h-[60vh]">
            <div className="flex items-center justify-center w-24 h-24 rounded-full bg-muted/50">
                <Link2Off className="w-12 h-12 text-muted-foreground" strokeWidth={1.5} />
            </div>
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                    {t("title")}
                </h1>
                <p className="text-sm text-muted-foreground max-w-sm">
                    {t("description")}
                </p>
            </div>
        </div>
    )
}
