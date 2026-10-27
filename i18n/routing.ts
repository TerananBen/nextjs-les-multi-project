import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
    // A list of all locales that are supported (th first as primary default)
    locales: ['th', 'en'],

    // Used when no locale matches, overridden at runtime in middleware
    defaultLocale: 'th',

    // Disable browser Accept-Language auto-detection so default is strictly Thai
    localeDetection: false,
});

// Lightweight wrappers around Next.js' navigation APIs
// that will consider the routing configuration
export const { Link, redirect, usePathname, useRouter, getPathname } =
    createNavigation(routing);
