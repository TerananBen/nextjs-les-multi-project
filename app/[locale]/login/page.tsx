import fs from "fs"
import path from "path"
import { LoginForm } from "@/components/login-form"
import { LanguageSwitcher } from "@/components/language-switcher"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { getTranslations } from "next-intl/server"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params
    const t = await getTranslations({ locale, namespace: "LoginForm" })
    return {
        title: t("welcomeTitle"),
    }
}

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params
    const t = await getTranslations({ locale })

    // Read the SVG logo and make it dynamic/theme-aware
    const logoPath = path.join(process.cwd(), "public/logo-le-full.svg")
    let logoSvg = fs.readFileSync(logoPath, "utf-8")
    logoSvg = logoSvg
        .replace('<svg width="550" height="80"', '<svg class="w-full h-auto select-none text-slate-800 dark:text-slate-100 skyblue:text-sky-900 transition-colors duration-500"')
        .replace('stroke="#cccccc" stroke-width="2"', 'stroke="currentColor" stroke-width="2" stroke-opacity="0.3"')
        .replace('fill="white" font-family="Arial, sans-serif" font-weight="bold"', 'fill="currentColor" font-family="Arial, sans-serif" font-weight="bold"')
        .replace('fill="white" font-family="Arial, sans-serif" font-weight="normal"', 'fill="currentColor" font-family="Arial, sans-serif" font-weight="normal"')

    return (
        <div className="min-h-svh w-full flex flex-col items-center justify-center p-4 md:p-8 relative transition-colors duration-500 bg-gradient-to-br from-slate-50 via-slate-100 to-blue-50 text-slate-800 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 dark:text-slate-100 skyblue:from-sky-100 skyblue:via-blue-50 skyblue:to-indigo-100 skyblue:text-sky-950 overflow-hidden select-none">
            {/* Premium Visual Backdrop Effects */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(99,102,241,0.15),transparent_50%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_80%,rgba(14,165,233,0.1),transparent_50%)]" />
            <div className="absolute inset-0 opacity-[0.02] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:32px_32px]" />

            {/* Soft moving ambient glow */}
            <div className="absolute top-1/4 left-1/4 w-[450px] h-[450px] rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none animate-float-blob" />
            <div className="absolute bottom-1/4 right-1/4 w-[450px] h-[450px] rounded-full bg-sky-500/8 blur-[100px] pointer-events-none animate-float-blob-reverse" />

            {/* Header Switchers (Theming & Language) */}
            <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 p-1 rounded-xl transition-all duration-500 bg-white/40 border border-slate-200/40 text-slate-700 dark:bg-slate-900/40 dark:border-slate-800/60 dark:text-slate-200 skyblue:bg-sky-200/20 skyblue:border-sky-300/30 skyblue:text-sky-800 backdrop-blur-md shadow-sm">
                <ThemeSwitcher />
                <LanguageSwitcher />
            </div>

            {/* Login Form Core Centered */}
            <div className="w-full max-w-md mx-auto flex flex-col gap-6 relative z-10">
                {/* Brand Logo Wrapper (Large & Premium) */}
                <div
                    className="flex flex-col items-center justify-center gap-2 text-center py-4"
                    dangerouslySetInnerHTML={{ __html: logoSvg }}
                />

                <LoginForm className="w-full" />
            </div>

            {/* Simple brand footer for centered layout */}
            <div className="text-center text-xs text-muted-foreground mt-8 relative z-10 transition-colors duration-500">
                <p className="font-semibold text-foreground/80 mb-1 transition-colors duration-500">{t("ProjectName")}</p>
                <p>© 2026 Lighting and Equipment PCL</p>
            </div>
        </div>
    )
}

