import type { Metadata } from "next";
import { getFont } from "@/lib/fonts";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import "../globals.css";

const font = getFont();

export const metadata: Metadata = {
  title: "Street Light IoT Web Control",
  description: "Street Light IoT Web Control",
  icons: {
    icon: process.env.APP_ICON || "/logo-le.svg",
  },
};

import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"

// ... (existing imports)

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

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages();

  // Get base font size from env or default to 16
  const baseFontSize = process.env.BASE_FONT_SIZE || 16;

  return (
    <html lang={locale} suppressHydrationWarning style={{ fontSize: `${baseFontSize}px` }}>
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
          <NextIntlClientProvider messages={messages} locale={locale}>
            {children}
            <Toaster />
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
