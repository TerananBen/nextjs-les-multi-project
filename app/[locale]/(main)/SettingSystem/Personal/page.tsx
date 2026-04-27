import { getPersonalList } from "@/app/actions/personal"
import { PersonalClient } from "./client"
import { getTranslations } from "next-intl/server"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params
    const t = await getTranslations({ locale, namespace: "Sidebar" })
    return {
        title: t("menu.personal"),
    }
}

export default async function PersonalPage() {
    const data = await getPersonalList()
    const personalList = data?.dataReturn || []
    const roleList = data?.roleList || []

    return (
        <div className="flex flex-1 flex-col gap-4 p-4 md:gap-3 md:p-3">
            <PersonalClient initialData={personalList} roles={roleList} />
        </div>
    )
}
