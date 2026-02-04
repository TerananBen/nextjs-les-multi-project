import { getCurrentUser } from "@/app/actions/auth"
import { ProfileForm } from "@/components/profile-form"
import { redirect } from "@/i18n/routing"

interface ProfilePageProps {
    params: Promise<{
        locale: string
    }>
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
