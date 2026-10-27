import type { Metadata } from "next";
import { getFont } from "@/lib/fonts";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { getProjectConfig } from "@/lib/project";
import { getThemeStyle } from "@/lib/theme";
import { ProjectProvider } from "@/components/providers/project-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import "../globals.css";

const font = getFont();

export async function generateMetadata(): Promise<Metadata> {
  const config = await getProjectConfig();
  return {
    title: config.name,
    description: `Street Light IoT Web Control - ${config.name}`,
    icons: {
      icon: config.appIcon,
    },
  };
}

export default async function RootLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Ensure that the incoming `locale` is valid
  if (!routing.locales.includes(locale as never)) {
    notFound();
  }

  const messages = await getMessages();
  const projectConfig = await getProjectConfig();
  const projectThemeStyle = getThemeStyle(projectConfig.color);

  // Get base font size from env or default to 16
  const baseFontSize = process.env.BASE_FONT_SIZE || 16;

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      style={{ fontSize: `${baseFontSize}px`, ...projectThemeStyle }}
    >
      <body
        className={`${font.variable} antialiased font-sans`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme={process.env.DEFAULT_THEME || "skyblue"}
          enableSystem
          disableTransitionOnChange
          themes={["light", "dark", "skyblue"]}
        >
          <ProjectProvider projectId={projectConfig.code || projectConfig.id} config={projectConfig}>
            <NextIntlClientProvider messages={messages} locale={locale}>
              {children}
              <Toaster />
            </NextIntlClientProvider>
          </ProjectProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
