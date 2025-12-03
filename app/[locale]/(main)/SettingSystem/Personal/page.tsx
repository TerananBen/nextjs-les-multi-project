import { getPersonalList } from "@/app/actions/personal"
import { PersonalClient } from "./client"
import { getTranslations } from "next-intl/server"

export default async function PersonalPage() {
    const data = await getPersonalList()
    const t = await getTranslations('Personal')

    const personalList = data?.dataReturn || []
    const roleList = data?.roleList || []

    return (
        <div className="flex flex-col gap-4 p-4 md:p-8">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">{t('title')}</h2>
                    <p className="text-muted-foreground">
                        {t('subtitle')}
                    </p>
                </div>
            </div>
            <PersonalClient initialData={personalList} roles={roleList} />
        </div>
    )
}
