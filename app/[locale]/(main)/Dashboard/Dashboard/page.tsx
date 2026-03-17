import { getTranslations } from "next-intl/server"
import { PageUnavailable } from "@/components/dashboard/page-unavailable"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "Sidebar" })
  return {
    title: t("menu.overview"),
  }
}

export default function DashboardPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
      <PageUnavailable />
    </div>
  )
}

