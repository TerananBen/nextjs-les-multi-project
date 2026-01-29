"use client"

import * as React from "react"
import { Button, ButtonProps } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

interface ConfirmButtonProps extends ButtonProps {
    onConfirm: () => void
    onCancel?: () => void
    confirmDuration?: number
    initialLabel: React.ReactNode
    confirmLabel?: React.ReactNode
    loading?: boolean
}

export function ConfirmButton({
    onConfirm,
    onCancel,
    confirmDuration = 3000,
    initialLabel,
    confirmLabel = "Confirm",
    loading = false,
    className,
    ...props
}: ConfirmButtonProps) {
    const [isConfirming, setIsConfirming] = React.useState(false)
    const [countdown, setCountdown] = React.useState(0)
    const timerRef = React.useRef<NodeJS.Timeout | null>(null)
    const intervalRef = React.useRef<NodeJS.Timeout | null>(null)

    React.useEffect(() => {
        return () => {
            const timer = timerRef.current
            const interval = intervalRef.current
            if (timer) clearTimeout(timer)
            if (interval) clearInterval(interval)
        }
    }, [])

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault()
        e.stopPropagation()

        if (loading) return

        if (isConfirming) {
            // Second click: Confirm action
            onConfirm()
            reset()
        } else {
            // First click: Start countdown
            setIsConfirming(true)
            setCountdown(confirmDuration / 1000)

            // Decrement countdown every second
            intervalRef.current = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        const currentInterval = intervalRef.current
                        if (currentInterval) clearInterval(currentInterval)
                        return 0
                    }
                    return prev - 1
                })
            }, 1000)

            // Reset after duration
            timerRef.current = setTimeout(() => {
                reset()
                onCancel?.()
            }, confirmDuration)
        }
    }

    const reset = () => {
        setIsConfirming(false)
        setCountdown(0)
        const timer = timerRef.current
        const interval = intervalRef.current
        if (timer) clearTimeout(timer)
        if (interval) clearInterval(interval)
        timerRef.current = null
        intervalRef.current = null
    }

    const radius = 10
    const circumference = 2 * Math.PI * radius

    return (
        <Button
            className={`${className} relative`}
            onClick={handleClick}
            disabled={loading}
            {...props}
        >
            {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : isConfirming ? (
                <div className="relative flex items-center justify-center">
                    <svg
                        className="absolute inset-0 -rotate-90 transform"
                        width="100%"
                        height="100%"
                        viewBox="0 0 24 24"
                    >
                        {/* Background Circle */}
                        <circle
                            className="text-muted/20"
                            strokeWidth="2"
                            stroke="currentColor"
                            fill="transparent"
                            r={radius}
                            cx="12"
                            cy="12"
                        />
                        {/* Progress Circle */}
                        <circle
                            strokeWidth="2"
                            strokeDasharray={circumference}
                            strokeDashoffset={0}
                            strokeLinecap="round"
                            stroke="currentColor"
                            fill="transparent"
                            r={radius}
                            cx="12"
                            cy="12"
                            style={{
                                animation: `countdown ${confirmDuration}ms linear forwards`,
                            }}
                        />
                        <style jsx>{`
                            @keyframes countdown {
                                from {
                                    stroke-dashoffset: 0;
                                }
                                to {
                                    stroke-dashoffset: ${circumference};
                                }
                            }
                        `}</style>
                    </svg>
                    <div className="z-10">{confirmLabel}</div>
                </div>
            ) : (
                initialLabel
            )}
        </Button>
    )
}
