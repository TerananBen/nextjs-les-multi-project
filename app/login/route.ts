import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const defaultLocale = (process.env.DEFAULT_LOCALE as "en" | "th") || "th";
  const localeCookie = request.cookies.get("NEXT_LOCALE")?.value;
  const locale = localeCookie === "en" || localeCookie === "th" ? localeCookie : defaultLocale;
  const redirectUrl = new URL(`/${locale}/login`, request.url);
  redirectUrl.search = request.nextUrl.search;
  return NextResponse.redirect(redirectUrl);
}
