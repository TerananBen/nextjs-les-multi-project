import { LoginForm } from "@/components/login-form"
import { LanguageSwitcher } from "@/components/language-switcher"
import { ThemeSwitcher } from "@/components/theme-switcher"
import Image from "next/image"
import { getTranslations } from "next-intl/server"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params
    const t = await getTranslations({ locale, namespace: "LoginForm" })
    return {
        title: t("welcomeTitle"),
    }
}

export default function LoginPage() {
    const sidebarLogo = process.env.NEXT_PUBLIC_SIDEBAR_LOGO || "/logo-placeholder.png"
    return (
        <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10 relative">
            <div className="absolute top-4 right-4 flex gap-2">
                <ThemeSwitcher />
                <LanguageSwitcher />
            </div>
            <div className="flex w-full max-w-sm flex-col gap-6">
                <a className="flex items-center gap-2 self-center font-medium">
                    <Image width={500} height={500} src={sidebarLogo} alt="L&E" className="h-10 object-contain" />
                </a>
                <LoginForm />
            </div>
        </div>
    )
}