import { redirect } from "@/i18n/routing"

interface ProfilePageProps {
  params: Promise<{
    locale: string
  }>
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { locale } = await params
  redirect({ href: "/dashboard/group", locale })
  return null
}
