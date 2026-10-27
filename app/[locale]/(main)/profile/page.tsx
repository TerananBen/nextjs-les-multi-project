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
    const t = await getTranslations({ locale, namespace: "Sidebar" })
    return {
        title: t("menu.personal"),
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
        <div className="flex flex-col gap-6 p-4 pt-4">
            <ProfileForm initialData={user} />
        </div>
    )
}
