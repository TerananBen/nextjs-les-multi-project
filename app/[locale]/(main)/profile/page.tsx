import { getCurrentUser } from "@/app/actions/auth"
import { ProfileForm } from "@/components/cores/profile/profile-form"
import { redirect } from "@/i18n/routing"
import { getTranslations } from "next-intl/server"

interface ProfilePageProps {
    params: Promise<{
        locale: string
    }>
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params
    const t = await getTranslations({ locale, namespace: "Personal" })
    return {
        title: t("form.profileHeader"),
    }
}

export default async function ProfilePage({ params }: ProfilePageProps) {
    const { locale } = await params
    const user = await getCurrentUser()

    if (!user) {
        redirect({ href: "/login", locale })
        return null
    }

    return (
        <div className="flex flex-1 flex-col gap-2.5 p-2.5 sm:p-3">
            <ProfileForm initialData={user} />
        </div>
    )
}
