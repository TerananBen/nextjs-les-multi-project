"use client"

import * as React from "react"
import { Moon, Sun, Palette, Check } from "lucide-react"
import { useTheme } from "next-themes"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ThemeSwitcher() {
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = React.useState(false)
    const t = useTranslations("ThemeSwitcher")

    React.useEffect(() => {
        setMounted(true)
    }, [])

    const themeOptions = [
        { key: "skyblue", label: t("primary"), icon: Palette },
        { key: "light", label: t("light"), icon: Sun },
        { key: "dark", label: t("dark"), icon: Moon },
    ]

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button className="cursor-pointer" variant="ghost" size="icon">
                    <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 skyblue:-rotate-90 skyblue:scale-0" />
                    <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 skyblue:rotate-90 skyblue:scale-0" />
                    <Palette className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all skyblue:rotate-0 skyblue:scale-100" />
                    <span className="sr-only">{t("label")}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {themeOptions.map(({ key, label, icon: Icon }) => (
                    <DropdownMenuItem
                        key={key}
                        className="cursor-pointer gap-2"
                        onClick={() => setTheme(key)}
                    >
                        <Icon className="h-4 w-4" />
                        <span>{label}</span>
                        {mounted && theme === key && (
                            <Check className="ml-auto h-4 w-4" />
                        )}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
