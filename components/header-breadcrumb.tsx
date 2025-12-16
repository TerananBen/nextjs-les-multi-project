"use client"

import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { Fragment } from "react"
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

export function HeaderBreadcrumb() {
    const pathname = usePathname()
    const t = useTranslations()

    // Example path: /en/dashboard/group-dashboard
    // Segments: ['', 'en', 'dashboard', 'group-dashboard']
    const segments = pathname.split('/').filter(Boolean)

    // Remove locale from segments (first segment usually)
    // Assuming locale is always the first segment, check if it's 'en' or 'th' or configured locales
    if (segments[0] === 'en' || segments[0] === 'th') {
        segments.shift()
    }

    // Map segments to readable labels
    // We try to find a translation for "Sidebar.[segment]" or fallback to title case
    const getBreadcrumbLabel = (segment: string) => {
        // Try to match Sidebar keys first, then fallback to direct translation or raw text
        // We normalize the segment to allow matching keys like "group-dashboard" -> "GroupDashboard"? 
        // Or just simple mapping.

        // Simple normalization: dashboard -> Dashboard, group-dashboard -> GroupDashboard ??
        // Actually the keys in Sidebar are "dashboard", "documents", "settings".
        // "GroupDashboard" key exists at root level in previous turn.

        const key = `Sidebar.${segment.toLowerCase()}`
        try {
            // This is a naive check. efficient way is to rely on t() to return key if missing?
            // But next-intl throws or returns path depending on config.
            // Let's manually map for known routes or just use the segment key if available

            if (segment.toLowerCase() === 'dashboard') return t('Sidebar.dashboard')
            if (segment.toLowerCase() === 'settings') return t('Sidebar.settings')

            // For GroupDashboard, we used "GroupDashboard" as namespace. 
            // We probably don't have a Breadcrumb specific translation yet.
            // Let's use a Title Case formatter for unknown segments for now, or check specific keys.
            if (segment === 'GroupDashboard' || segment === 'group-dashboard') return "Group Dashboard"

            return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ')
        } catch (e) {
            return segment
        }
    }

    // Custom manual mapping for better UX if needed
    const breadcrumbItems = segments.map((segment, index) => {
        const isLast = index === segments.length - 1
        const href = `/${segments.slice(0, index + 1).join('/')}`

        // Special handling for known segments to get nice translated names
        let label = segment
        if (segment.toLowerCase() === 'dashboard') label = t('Sidebar.dashboard')
        // We can add more mappings here as the app grows
        else if (segment.toLowerCase() === 'groupdashboard') label = "Group Dashboard" // Ideally translate this too
        else if (segment.toLowerCase() === 'personal') label = t('Personal.title')
        else label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ')

        return { href, label, isLast }
    })

    // Root Project Name from Env
    const PROJECT_NAME = process.env.NEXT_PUBLIC_PROJECT_NAME || "Smart City"

    return (
        <Breadcrumb className="hidden md:flex">
            <BreadcrumbList>
                <BreadcrumbItem>
                    <BreadcrumbLink href="/" title={PROJECT_NAME} className="max-w-[150px] truncate block">
                        {PROJECT_NAME}
                    </BreadcrumbLink>
                </BreadcrumbItem>

                {breadcrumbItems.length > 0 && <BreadcrumbSeparator />}

                {breadcrumbItems.map((item, index) => (
                    <Fragment key={item.href}>
                        <BreadcrumbItem>
                            {item.isLast ? (
                                <BreadcrumbPage title={item.label} className="max-w-[200px] truncate block">
                                    {item.label}
                                </BreadcrumbPage>
                            ) : (
                                <BreadcrumbLink href={item.href} title={item.label} className="max-w-[150px] truncate block">
                                    {item.label}
                                </BreadcrumbLink>
                            )}
                        </BreadcrumbItem>
                        {!item.isLast && <BreadcrumbSeparator />}
                    </Fragment>
                ))}
            </BreadcrumbList>
        </Breadcrumb>
    )
}
