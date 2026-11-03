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
import { cn } from "@/lib/utils"

export function ThemeSwitcher() {
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = React.useState(false)
    const t = useTranslations("ThemeSwitcher")

    React.useEffect(() => {
        setMounted(true)
    }, [])

    const themeOptions = [
        {
            key: "skyblue",
            label: t("primary"),
            icon: Palette,
            iconColor: "text-project-primary",
            iconBg: "bg-project-primary/10",
        },
        {
            key: "light",
            label: t("light"),
            icon: Sun,
            iconColor: "text-amber-500 dark:text-amber-400",
            iconBg: "bg-amber-500/10 dark:bg-amber-400/10",
        },
        {
            key: "dark",
            label: t("dark"),
            icon: Moon,
            iconColor: "text-indigo-400 dark:text-indigo-300",
            iconBg: "bg-indigo-500/10 dark:bg-indigo-400/10",
        },
    ]

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button className="cursor-pointer hover:bg-accent/80 transition-colors" variant="ghost" size="icon">
                    <Sun className="h-[1.2rem] w-[1.2rem] text-amber-500 dark:text-amber-400 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 skyblue:-rotate-90 skyblue:scale-0" />
                    <Moon className="absolute h-[1.2rem] w-[1.2rem] text-indigo-400 dark:text-indigo-300 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 skyblue:rotate-90 skyblue:scale-0" />
                    <Palette className="absolute h-[1.2rem] w-[1.2rem] text-project-primary rotate-90 scale-0 transition-all skyblue:rotate-0 skyblue:scale-100" />
                    <span className="sr-only">{t("label")}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[155px] p-1.5">
                {themeOptions.map(({ key, label, icon: Icon, iconColor, iconBg }) => (
                    <DropdownMenuItem
                        key={key}
                        className={cn(
                            "group cursor-pointer gap-2.5 py-1.5 px-2 rounded-md transition-colors",
                            mounted && theme === key && "bg-accent/60 font-medium"
                        )}
                        onClick={() => setTheme(key)}
                    >
                        <div className={cn("flex size-6 shrink-0 items-center justify-center rounded-md transition-transform group-hover:scale-110", iconBg)}>
                            <Icon className={cn("h-3.5 w-3.5", iconColor)} />
                        </div>
                        <span className="text-sm">{label}</span>
                        {mounted && theme === key && (
                            <Check className="ml-auto h-4 w-4 text-project-primary" />
                        )}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
