import fs from "fs"
import path from "path"
import { getTranslations } from "next-intl/server"
import { AlertTriangle, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { LanguageSwitcher } from "@/components/common/language-switcher"
import { ThemeSwitcher } from "@/components/common/theme-switcher"

interface UnauthorizedPageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "UnauthorizedPage" })
  return {
    title: t("title"),
  }
}

export default async function UnauthorizedPage({
  params,
}: UnauthorizedPageProps) {
  const { locale } = await params
  const t = await getTranslations({ locale })

  // Read the SVG logo and make it dynamic/theme-aware (matching Keycloak brand logo)
  const logoPath = path.join(process.cwd(), "public/logo-le-full.svg")
  let logoSvg = ""
  try {
    logoSvg = fs.readFileSync(logoPath, "utf-8")
    logoSvg = logoSvg
      .replace(
        '<svg width="550" height="80"',
        '<svg class="w-full h-auto select-none text-slate-800 dark:text-slate-100 skyblue:text-sky-900 transition-colors duration-500"'
      )
      .replace(
        'stroke="#cccccc" stroke-width="2"',
        'stroke="currentColor" stroke-width="2" stroke-opacity="0.3"'
      )
      .replace(
        'fill="white" font-family="Arial, sans-serif" font-weight="bold"',
        'fill="currentColor" font-family="Arial, sans-serif" font-weight="bold"'
      )
      .replace(
        'fill="white" font-family="Arial, sans-serif" font-weight="normal"',
        'fill="currentColor" font-family="Arial, sans-serif" font-weight="normal"'
      )
  } catch {
    logoSvg = ""
  }

  const restartLoginUrl = `/api/auth/login?prompt=login&locale=${locale}`

  return (
    <div className="min-h-svh w-full flex flex-col items-center justify-center p-4 md:p-8 relative transition-colors duration-500 bg-background text-foreground overflow-hidden select-none">
      {/* Visual Ambient Glow & Effects (Keycloak theme styles) */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,var(--primary),transparent_60%)] opacity-15 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_80%,var(--accent),transparent_60%)] opacity-10 pointer-events-none" />
      <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      {/* Header Switcher Controls (Top-Right) */}
      <div className="absolute top-4 right-4 z-30 flex items-center gap-1.5 p-1 rounded-xl transition-all duration-500 bg-white/40 border border-slate-200/40 text-slate-700 dark:bg-slate-900/40 dark:border-slate-800/60 dark:text-slate-200 skyblue:bg-sky-200/20 skyblue:border-sky-300/30 skyblue:text-sky-800 backdrop-blur-md shadow-sm">
        <ThemeSwitcher />
        <LanguageSwitcher />
      </div>

      {/* Login Container (Keycloak .login-container max-w-[28rem]) */}
      <div className="w-full max-w-[28rem] mx-auto flex flex-col gap-4 relative z-20">
        {/* Brand Logo Wrapper */}
        {logoSvg && (
          <div
            className="flex flex-col items-center justify-center gap-2 text-center py-2"
            dangerouslySetInnerHTML={{ __html: logoSvg }}
          />
        )}

        {/* Glassmorphism Card (Keycloak .login-card without any top border line) */}
        <Card className="border border-border/40 bg-card/30 backdrop-blur-md shadow-xl rounded-2xl overflow-hidden py-6">
          <CardHeader className="text-center pt-2 pb-3 px-6">
            {/* Warning Icon Circle (Keycloak .warning-icon-circle) */}
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/35 text-amber-500 shadow-[0_0_24px_-4px_rgba(245,158,11,0.35)] animate-pulse">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              {t("UnauthorizedPage.title")}
            </h2>
          </CardHeader>

          <CardContent className="px-6 pb-2">
            {/* Error Message Box (Keycloak .error-message-box) */}
            <div className="rounded-xl border border-border/40 bg-muted/30 p-4 text-center text-sm text-muted-foreground leading-relaxed mb-6">
              {t("UnauthorizedPage.description")}
            </div>

            {/* Action Button (Keycloak .btn-submit) */}
            <Button
              className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold gap-2 shadow-md hover:bg-primary/90 transition-all cursor-pointer"
              size="lg"
              asChild
            >
              <a href={restartLoginUrl}>
                <RefreshCw className="h-4 w-4" />
                <span>{t("UnauthorizedPage.loginAnotherAccount")}</span>
              </a>
            </Button>

            <p className="text-xs text-muted-foreground text-center mt-4 opacity-80">
              © 2026 Lighting and Equipment PCL
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Page Footer (Keycloak .page-footer) */}
      <div className="text-center text-xs text-muted-foreground mt-8 relative z-20 transition-colors duration-500">
        <p className="font-semibold text-foreground/85 mb-1 transition-colors duration-500">
          {t("ProjectName")}
        </p>
        <p>© 2026 Lighting and Equipment PCL</p>
      </div>
    </div>
  )
}
