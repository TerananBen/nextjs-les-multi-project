import { headers } from "next/headers"
import { getTranslations } from "next-intl/server"
import { CheckCircle2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

interface StatusPageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: StatusPageProps) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "StatusPage" })
  return {
    title: t("title"),
  }
}

export default async function StatusPage({ params }: StatusPageProps) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "StatusPage" })
  const headerList = await headers()

  const host =
    (headerList.get("x-forwarded-host") || headerList.get("host") || "-")
      .split(",")[0]
      .trim()
  const protocol = (
    headerList.get("x-forwarded-proto") || "http"
  )
    .split(",")[0]
    .trim()
  const environment = process.env.NODE_ENV || "production"
  const serverTime = new Date().toISOString()

  const details = [
    { label: t("environmentLabel"), value: environment },
    { label: t("hostLabel"), value: host },
    { label: t("protocolLabel"), value: protocol.toUpperCase() },
    { label: t("localeLabel"), value: locale.toUpperCase() },
    { label: t("timestampLabel"), value: serverTime },
  ]

  return (
    <main className="min-h-svh w-full flex items-center justify-center p-4 bg-background text-foreground">
      <Card className="w-full max-w-md border border-border bg-card shadow-sm">
        <CardHeader className="text-center space-y-3 pb-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div className="flex items-center justify-center gap-2">
            <CardTitle className="text-xl font-semibold">
              {t("heading")}
            </CardTitle>
            <Badge variant="secondary">{t("statusValue")}</Badge>
          </div>
          <CardDescription className="text-sm text-muted-foreground">
            {t("description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <Separator />
          <dl className="space-y-2.5 text-sm">
            {details.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between gap-4"
              >
                <dt className="text-muted-foreground">{item.label}</dt>
                <dd className="font-mono text-xs text-foreground break-all text-right">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </main>
  )
}
