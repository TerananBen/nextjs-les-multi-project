"use client"

import * as React from "react"
import {
  IconLogout,
  IconUserCircle,
} from "@tabler/icons-react"
import { ChevronDown } from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Link } from "@/i18n/routing"
import { toast } from "sonner"
import { useTranslations } from "next-intl"

export interface NavUserProps {
  user?: {
    name: string
    email?: string
    avatar?: string
    role?: string
  }
}

export function NavUser({ user }: NavUserProps) {
  const t = useTranslations("UserMenu")

  if (!user) return null

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="cursor-pointer flex items-center gap-2 h-9 px-2.5 rounded-md hover:bg-accent data-[state=open]:bg-accent"
        >
          <Avatar className="h-7 w-7 rounded-md">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback className="rounded-md text-xs font-semibold">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="hidden md:flex flex-col text-left leading-none">
            <span className="text-xs font-semibold truncate max-w-[120px]">{user.name}</span>
            {user.role && (
              <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                {user.role}
              </span>
            )}
          </div>
          <ChevronDown className="hidden md:block h-3.5 w-3.5 text-muted-foreground shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-56 rounded-lg"
        align="end"
        sideOffset={8}
      >
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2.5 px-2 py-2 text-left text-sm">
            <Avatar className="h-8 w-8 rounded-md">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="rounded-md font-semibold">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold text-foreground">{user.name}</span>
              <span className="text-muted-foreground truncate text-xs">
                {user.role || user.email}
              </span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/profile" className="cursor-pointer flex items-center gap-2 w-full">
              <IconUserCircle className="size-4" />
              <span>{t("account")}</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer text-destructive focus:text-destructive flex items-center gap-2"
          onClick={() => {
            toast.dismiss()
            window.location.href = "/api/auth/logout"
          }}
        >
          <IconLogout className="size-4" />
          <span>{t("logout")}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
