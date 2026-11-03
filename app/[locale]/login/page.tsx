import fs from "fs"
import path from "path"
import { LoginForm } from "@/components/cores/auth/login-form"
import { LanguageSwitcher } from "@/components/common/language-switcher"
import { ThemeSwitcher } from "@/components/common/theme-switcher"
import { getTranslations } from "next-intl/server"

import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"
import { isKeycloakConfigured, decodeJwtPayload, extractAllProjectIdsFromPayload, extractRolesFromPayload } from "@/lib/keycloak"
import { resolveProjectUuid } from "@/config/projects"

interface LoginPageProps {
    params: Promise<{ locale: string }>
    searchParams?: Promise<{ mode?: string; returnUrl?: string; error?: string; allowed?: string }>
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params
    const t = await getTranslations({ locale, namespace: "LoginForm" })
    return {
        title: t("welcomeTitle"),
    }
}

function isTokenValid(token: string): boolean {
    const payload = decodeJwtPayload(token)
    return payload?.exp ? payload.exp * 1000 > Date.now() : true
}

export default async function LoginPage({ params, searchParams }: LoginPageProps) {
    const { locale } = await params
    const resolvedSearchParams = searchParams ? await searchParams : {}

    // 1. Check if user already has an active session -> redirect to /dashboard/group (if authorized for this project)
    const cookieStore = await cookies()
    const token = cookieStore.get("jwt")?.value
    if (token && isTokenValid(token)) {
        const headerList = await headers()
        const host = (headerList.get("x-forwarded-host") || headerList.get("host") || "").split(",")[0].trim()
        let hostSub: string | undefined
        if (host) {
            const sub = host.split(":")[0].split(".")[0]
            if (sub && sub !== "localhost" && sub !== "www") {
                hostSub = sub.replace(/_/g, "-")
            }
        }
        const hostProjUuid = hostSub ? resolveProjectUuid(hostSub) : undefined
        const payload = decodeJwtPayload(token)
        const roles = extractRolesFromPayload(payload)
        const isSuperAdmin = roles.some((r) => {
            const lower = r.toLowerCase()
            return lower.includes("superadmin") || lower.includes("super_admin") || lower.includes("super-admin")
        })
        const allowedProjects = extractAllProjectIdsFromPayload(payload)
        const allowedUuids = allowedProjects.map((p) => resolveProjectUuid(p))

        const isUnauthorized =
            hostProjUuid &&
            !isSuperAdmin &&
            allowedUuids.length > 0 &&
            !allowedUuids.includes(hostProjUuid) &&
            (!hostSub || !allowedProjects.includes(hostSub))

        if (!isUnauthorized) {
            redirect(`/${locale}/dashboard/group`)
        }
    }

    // 2. If no session, redirect to Keycloak SSO login (skip if error exists or mode === 'local')
    if (isKeycloakConfigured() && resolvedSearchParams.mode !== "local" && !resolvedSearchParams.error) {
        const returnUrl = resolvedSearchParams.returnUrl || `/${locale}/dashboard/group`
        redirect(`/api/auth/login?locale=${locale}&returnUrl=${encodeURIComponent(returnUrl)}`)
    }

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
        <div className="min-h-svh w-full flex flex-col items-center justify-center p-4 md:p-8 relative transition-colors duration-500 bg-background text-foreground overflow-hidden select-none">
            {/* Premium Visual Backdrop Effects */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,var(--primary),transparent_60%)] opacity-15" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_80%,var(--accent),transparent_60%)] opacity-10" />
            <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:32px_32px]" />

            {/* Soft moving ambient glow */}
            <div className="absolute top-1/4 left-1/4 w-[450px] h-[450px] rounded-full bg-primary/15 blur-[100px] pointer-events-none animate-float-blob" />
            <div className="absolute bottom-1/4 right-1/4 w-[450px] h-[450px] rounded-full bg-primary/10 blur-[100px] pointer-events-none animate-float-blob-reverse" />

            {/* Header Switchers (Theming & Language) */}
            <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 p-1 rounded-xl transition-all duration-500 bg-white/40 border border-slate-200/40 text-slate-700 dark:bg-slate-900/40 dark:border-slate-800/60 dark:text-slate-200 skyblue:bg-sky-200/20 skyblue:border-sky-300/30 skyblue:text-sky-800 backdrop-blur-md shadow-sm">
                <ThemeSwitcher />
                <LanguageSwitcher />
            </div>

            {/* Login Form Core Centered */}
            <div className="w-full max-w-md mx-auto flex flex-col gap-4 relative z-10">
                {/* Brand Logo Wrapper (Large & Premium) */}
                <div
                    className="flex flex-col items-center justify-center gap-2 text-center py-2"
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
