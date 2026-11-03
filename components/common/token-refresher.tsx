"use client"

import { useEffect, useCallback } from "react"
import { refreshTokenAction } from "@/app/actions/auth"

export function TokenRefresher() {
    const handleRefresh = useCallback(async () => {
        try {
            await refreshTokenAction()
        } catch {
            // Silently ignore background refresh errors
        }
    }, [])

    useEffect(() => {
        // Run check every 60 seconds
        const interval = setInterval(() => {
            void handleRefresh()
        }, 60000)

        return () => clearInterval(interval)
    }, [handleRefresh])

    return null
}
