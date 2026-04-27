"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

// Suppress false-positive React 19 warning for next-themes inline script (FOUC prevention)
// if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
//     const origConsoleError = console.error
//     console.error = (...args: unknown[]) => {
//         if (
//             typeof args[0] === "string" &&
//             args[0].includes("Encountered a script tag")
//         ) {
//             return
//         }
//         origConsoleError.apply(console, args)
//     }
// }

export function ThemeProvider({
    children,
    ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
    return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
