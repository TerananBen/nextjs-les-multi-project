import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';

export default async function proxy(request: NextRequest) {
    const defaultLocale = (process.env.DEFAULT_LOCALE as "en" | "th") || 'th';
    const intlMiddleware = createMiddleware({
        ...routing,
        defaultLocale
    });

    const { pathname } = request.nextUrl;

    // Define public pages that don't require authentication
    // We need to account for the locale prefix (e.g., /th/login, /en/login)
    const isLoginPage = pathname.includes('/login');

    if (isLoginPage) {
        return intlMiddleware(request);
    }

    const token = request.cookies.get('jwt')?.value;
    const apiUrl = process.env.API_URL;

    if (!token) {
        // If no token and not on login page, redirect to login
        // We default to 'th' if no locale is present, or preserve the existing one if possible
        // But for simplicity, let's let next-intl handle the redirect to the localized login page
        // by redirecting to /login (which next-intl might handle if configured) or constructing a localized path.
        // A safer bet is to redirect to /th/login or /en/login.
        // Let's try to infer locale or default to 'th'.
        const locale = request.nextUrl.pathname.split('/')[1] || defaultLocale;
        const loginUrl = new URL(`/${locale}/login`, request.url);
        return NextResponse.redirect(loginUrl);
    }

    if (apiUrl) {
        try {
            const response = await fetch(`${apiUrl}/StreetLight/checkLogin`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
            });

            if (response.status === 401 || !response.ok) {
                // Token is invalid or expired
                const locale = request.nextUrl.pathname.split('/')[1] || defaultLocale;
                const loginUrl = new URL(`/${locale}/login`, request.url);
                const redirectResponse = NextResponse.redirect(loginUrl);

                // Optional: Clear the invalid cookie
                redirectResponse.cookies.delete('jwt');
                redirectResponse.cookies.delete('menuRole');

                return redirectResponse;
            }
        } catch (error) {
            console.error("Middleware auth check failed:", error);
            // In case of error, we might want to allow access or fail safe. 
            // For security, failing safe (redirecting to login) is often better, 
            // but if the API is down, it locks everyone out.
            // Let's assume if we can't reach the auth server, we shouldn't let them in.
            const locale = request.nextUrl.pathname.split('/')[1] || defaultLocale;
            const loginUrl = new URL(`/${locale}/login`, request.url);
            return NextResponse.redirect(loginUrl);
        }
    }

    return intlMiddleware(request);
}

export const config = {
    // Match only internationalized pathnames
    matcher: ['/', '/(th|en)/:path*']
};
