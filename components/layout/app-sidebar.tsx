"use client"

import * as React from "react"
import {
  IconUser,
  IconBulb,
  IconListDetails,
  IconCalendarTime,
  IconDeviceAnalytics,
  IconReplace,
  IconBriefcase,
  IconBell,
  IconMap2,
  IconSettings,
  IconTool,
  IconFolders,
  IconApi,
  IconServerCog,
} from "@tabler/icons-react"
import { ChevronDown } from "lucide-react"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { MenuItem } from "@/app/actions/auth"
import { Link, usePathname } from "@/i18n/routing"

// Menu aliases for backward compatibility between old and new names
const MENU_ALIASES: Record<string, string> = {
  "V_GroupDashboard": "dashboard_group",
  "V_Dashboard": "dashboard_overview",
  "V_StreetLight": "control_streetlight",
  "V_GroupConfig": "control_group",
  "V_SettingSchedule": "control_schedule",
  "V_MapDisconnect": "map_disconnect",
  "V_MapGlobal": "map_global",
  "V_MapChangeLamp": "map_changelamp",
  "V_MaintenanceDashboard": "maintenance_dashboard",
  "V_MaintenanceConfig": "maintenance_request",
  "V_MaintenanceDetail": "maintenance_list",
  "V_SettingMenu": "system_menu_permission",
  "V_SettingApi": "system_api_setting",
  "V_ProjectSetting": "system_project",
  "V_AlertStreetLight": "system_alert",
  "V_Personal": "system_personal",
  "V_SettingDevice": "system_device",
  "dashboard_group": "V_GroupDashboard",
  "dashboard_overview": "V_Dashboard",
  "control_streetlight": "V_StreetLight",
  "control_group": "V_GroupConfig",
  "control_schedule": "V_SettingSchedule",
  "map_disconnect": "V_MapDisconnect",
  "map_global": "V_MapGlobal",
  "map_changelamp": "V_MapChangeLamp",
  "maintenance_dashboard": "V_MaintenanceDashboard",
  "maintenance_request": "V_MaintenanceConfig",
  "maintenance_list": "V_MaintenanceDetail",
  "system_menu_permission": "V_SettingMenu",
  "system_api_setting": "V_SettingApi",
  "system_project": "V_ProjectSetting",
  "system_alert": "V_AlertStreetLight",
  "system_personal": "V_Personal",
  "system_device": "V_SettingDevice",
}

// Map menu_name to icon, title, url and distinct high-contrast colorful accent
const menuMapping: Record<string, { title: string; icon: React.ElementType; url: string; color: string }> = {
  // New standardized names
  "dashboard_overview": { title: "menu.overview", icon: IconBriefcase, url: "/dashboard/overview", color: "text-emerald-600 skyblue:text-emerald-300 dark:text-emerald-400" },
  "system_alert": { title: "menu.alerts", icon: IconBell, url: "/setting-system/alerts", color: "text-red-500 skyblue:text-red-300 dark:text-red-400" },
  "control_group": { title: "menu.groupConfig", icon: IconSettings, url: "/setting-control/group-config", color: "text-purple-600 skyblue:text-purple-300 dark:text-purple-400" },
  "dashboard_group": { title: "menu.groupDashboard", icon: IconBriefcase, url: "/dashboard/group", color: "text-amber-500 skyblue:text-amber-300 dark:text-amber-400" },
  "maintenance_request": { title: "menu.maintenanceConfig", icon: IconTool, url: "/maintenance/config", color: "text-orange-500 skyblue:text-orange-300 dark:text-orange-400" },
  "maintenance_dashboard": { title: "menu.maintenanceDashboard", icon: IconBriefcase, url: "/maintenance/dashboard", color: "text-cyan-600 skyblue:text-cyan-200 dark:text-cyan-300" },
  "map_disconnect": { title: "menu.mapDisconnect", icon: IconMap2, url: "/map/disconnect", color: "text-rose-500 skyblue:text-rose-300 dark:text-rose-400" },
  "map_global": { title: "menu.mapGlobal", icon: IconMap2, url: "/map/global", color: "text-teal-600 skyblue:text-teal-300 dark:text-teal-400" },
  "system_project_permissions_api": { title: "menu.projectPermissionsApi", icon: IconServerCog, url: "/setting-system/project-permissions-api", color: "text-orange-500 skyblue:text-orange-300 dark:text-orange-400" },
  "system_personal": { title: "menu.personal", icon: IconUser, url: "/setting-system/personal", color: "text-teal-600 skyblue:text-teal-300 dark:text-teal-400" },
  "system_menu_permission": { title: "menu.menuSettings", icon: IconSettings, url: "/setting-system/menu-settings", color: "text-amber-600 skyblue:text-amber-300 dark:text-amber-400" },
  "system_api_setting": { title: "menu.apiSettings", icon: IconApi, url: "/setting-system/api-settings", color: "text-emerald-600 skyblue:text-emerald-300 dark:text-emerald-400" },
  "control_schedule": { title: "menu.scheduleSettings", icon: IconCalendarTime, url: "/setting-control/schedule-settings", color: "text-violet-600 skyblue:text-violet-300 dark:text-violet-400" },
  "control_streetlight": { title: "menu.streetLight", icon: IconBulb, url: "/setting-control/street-light", color: "text-yellow-500 skyblue:text-yellow-300 dark:text-yellow-400" },
  "maintenance_list": { title: "menu.maintenanceDetail", icon: IconListDetails, url: "/maintenance/detail", color: "text-pink-600 skyblue:text-pink-300 dark:text-pink-400" },
  "map_changelamp": { title: "menu.mapChangeLamp", icon: IconReplace, url: "/map/change-lamp", color: "text-lime-600 skyblue:text-lime-300 dark:text-lime-400" },
  "system_device": { title: "menu.deviceSettings", icon: IconDeviceAnalytics, url: "/dashboard/settings-device", color: "text-fuchsia-600 skyblue:text-fuchsia-300 dark:text-fuchsia-400" },
  "system_project": { title: "menu.projectSettings", icon: IconFolders, url: "/setting-system/project", color: "text-orange-500 skyblue:text-orange-300 dark:text-orange-400" },

  // Legacy aliases for backward compatibility
  "V_Dashboard": { title: "menu.overview", icon: IconBriefcase, url: "/dashboard/overview", color: "text-emerald-600 skyblue:text-emerald-300 dark:text-emerald-400" },
  "V_AlertStreetLight": { title: "menu.alerts", icon: IconBell, url: "/setting-system/alerts", color: "text-red-500 skyblue:text-red-300 dark:text-red-400" },
  "V_GroupConfig": { title: "menu.groupConfig", icon: IconSettings, url: "/setting-control/group-config", color: "text-purple-600 skyblue:text-purple-300 dark:text-purple-400" },
  "V_GroupDashboard": { title: "menu.groupDashboard", icon: IconBriefcase, url: "/dashboard/group", color: "text-amber-500 skyblue:text-amber-300 dark:text-amber-400" },
  "V_MaintenanceConfig": { title: "menu.maintenanceConfig", icon: IconTool, url: "/maintenance/config", color: "text-orange-500 skyblue:text-orange-300 dark:text-orange-400" },
  "V_MaintenanceDashboard": { title: "menu.maintenanceDashboard", icon: IconBriefcase, url: "/maintenance/dashboard", color: "text-cyan-600 skyblue:text-cyan-200 dark:text-cyan-300" },
  "V_MapDisconnect": { title: "menu.mapDisconnect", icon: IconMap2, url: "/map/disconnect", color: "text-rose-500 skyblue:text-rose-300 dark:text-rose-400" },
  "V_MapGlobal": { title: "menu.mapGlobal", icon: IconMap2, url: "/map/global", color: "text-teal-600 skyblue:text-teal-300 dark:text-teal-400" },
  "V_Personal": { title: "menu.personal", icon: IconUser, url: "/setting-system/personal", color: "text-teal-600 skyblue:text-teal-300 dark:text-teal-400" },
  "V_SettingMenu": { title: "menu.menuSettings", icon: IconSettings, url: "/setting-system/menu-settings", color: "text-amber-600 skyblue:text-amber-300 dark:text-amber-400" },
  "V_SettingApi": { title: "menu.apiSettings", icon: IconApi, url: "/setting-system/api-settings", color: "text-emerald-600 skyblue:text-emerald-300 dark:text-emerald-400" },
  "V_SettingSchedule": { title: "menu.scheduleSettings", icon: IconCalendarTime, url: "/setting-control/schedule-settings", color: "text-violet-600 skyblue:text-violet-300 dark:text-violet-400" },
  "V_StreetLight": { title: "menu.streetLight", icon: IconBulb, url: "/setting-control/street-light", color: "text-yellow-500 skyblue:text-yellow-300 dark:text-yellow-400" },
  "V_MaintenanceDetail": { title: "menu.maintenanceDetail", icon: IconListDetails, url: "/maintenance/detail", color: "text-pink-600 skyblue:text-pink-300 dark:text-pink-400" },
  "V_MapChangeLamp": { title: "menu.mapChangeLamp", icon: IconReplace, url: "/map/change-lamp", color: "text-lime-600 skyblue:text-lime-300 dark:text-lime-400" },
  "V_SettingDevice": { title: "menu.deviceSettings", icon: IconDeviceAnalytics, url: "/dashboard/settings-device", color: "text-fuchsia-600 skyblue:text-fuchsia-300 dark:text-fuchsia-400" },
  "V_ProjectSetting": { title: "menu.projectSettings", icon: IconFolders, url: "/setting-system/project", color: "text-orange-500 skyblue:text-orange-300 dark:text-orange-400" },
}

// Define menu groups
const menuGroups = [
  {
    title: "groups.streetLight",
    items: ["dashboard_group", "dashboard_overview"],
  },
  {
    title: "groups.controlEdit",
    items: ["control_streetlight", "control_group", "control_schedule"],
  },
  {
    title: "groups.mapLamp",
    items: ["map_disconnect", "map_global"],
  },
  {
    title: "groups.maintenance",
    items: ["maintenance_dashboard", "maintenance_request", "maintenance_list"],
  },
  {
    title: "groups.systemSettings",
    items: ["system_personal", "system_project_permissions_api", "system_alert"],
  },
]

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  menuItems?: MenuItem[]
  user?: {
    name: string
    email?: string
    avatar?: string
    role?: string
  }
  sidebarLogo?: string
}

export function AppSidebar({ menuItems = [], user, sidebarLogo, ...props }: AppSidebarProps) {
  const pathname = usePathname()
  const t = useTranslations("Sidebar")
  const [svgContent, setSvgContent] = React.useState<string>("")

  // Open / Collapse state per menu group
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    menuGroups.forEach((group) => {
      initial[group.title] = true
    })
    return initial
  })

  // Load persisted collapse state from localStorage on mount
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("sidebar_group_state")
      if (saved) {
        const parsed = JSON.parse(saved) as Record<string, boolean>
        if (parsed && typeof parsed === "object") {
          setOpenGroups((prev) => ({ ...prev, ...parsed }))
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [])

  // Auto-expand group that contains the current active route
  React.useEffect(() => {
    menuGroups.forEach((group) => {
      const hasActiveItem = group.items.some((menuName) => {
        const mapping = menuMapping[menuName]
        return mapping && (pathname === mapping.url || pathname.startsWith(mapping.url + "/"))
      })
      if (hasActiveItem) {
        setOpenGroups((prev) => {
          if (prev[group.title]) return prev
          return { ...prev, [group.title]: true }
        })
      }
    })
  }, [pathname])

  const handleToggleGroup = React.useCallback((title: string, isOpen: boolean) => {
    setOpenGroups((prev) => {
      const updated = { ...prev, [title]: isOpen }
      try {
        localStorage.setItem("sidebar_group_state", JSON.stringify(updated))
      } catch {
        // Ignore localStorage errors
      }
      return updated
    })
  }, [])

  React.useEffect(() => {
    const logoUrl = sidebarLogo || "/logo-le-full.svg"
    if (logoUrl.endsWith(".svg")) {
      fetch(logoUrl)
        .then((res) => res.text())
        .then((text) => {
          const processed = text
            .replace('<svg width="550" height="80"', '<svg class="h-10 w-auto select-none text-sidebar-foreground transition-colors duration-500"')
            .replace('stroke="#cccccc" stroke-width="2"', 'stroke="currentColor" stroke-width="2" stroke-opacity="0.3"')
            .replace('fill="white" font-family="Arial, sans-serif" font-weight="bold"', 'fill="currentColor" font-family="Arial, sans-serif" font-weight="bold"')
            .replace('fill="white" font-family="Arial, sans-serif" font-weight="normal"', 'fill="currentColor" font-family="Arial, sans-serif" font-weight="normal"')
          setSvgContent(processed)
        })
        .catch((err) => console.error("Error loading sidebar logo:", err))
    }
  }, [sidebarLogo])

  const isSuperAdmin = React.useMemo(() => {
    const roleLower = (user?.role || "").toLowerCase()
    return roleLower.includes("superadmin") || roleLower.includes("super_admin") || roleLower.includes("super-admin")
  }, [user?.role])

  // Create a map of readable menu items for easy lookup (supporting aliases)
  const readableItems = React.useMemo(() => {
    const map = new Map<string, MenuItem>()
    menuItems.forEach((item) => {
      if (item.readable === "1") {
        map.set(item.menu_name, item)
        const alias = MENU_ALIASES[item.menu_name]
        if (alias) {
          map.set(alias, item)
        }
      }
    })
    return map
  }, [menuItems])

  // Filter visible items for each group and ignore empty groups
  const visibleGroups = React.useMemo(() => {
    return menuGroups
      .map((group) => {
        const groupItems = group.items
          .filter((menuName) => {
            if (isSuperAdmin) return true
            if (menuName === "system_project_permissions_api") {
              return (
                readableItems.has("system_project") ||
                readableItems.has("system_menu_permission") ||
                readableItems.has("system_api_setting")
              )
            }
            return readableItems.has(menuName)
          })
          .map((menuName) => {
            const mapping = menuMapping[menuName]
            return {
              title: mapping ? mapping.title : menuName,
              url: mapping ? mapping.url : "#",
              icon: mapping ? mapping.icon : IconListDetails,
              color: mapping?.color || "text-muted-foreground",
            }
          })
        return {
          title: group.title,
          items: groupItems,
        }
      })
      .filter((group) => group.items.length > 0)
  }, [isSuperAdmin, readableItems])

  return (
    <Sidebar collapsible="offcanvas" {...props} className="border-r-0">
      <SidebarHeader className="flex items-center justify-center py-4 z-20">
        {/* Logo Area */}
        <div className="flex flex-col items-center w-full px-4">
          {sidebarLogo && !sidebarLogo.endsWith(".svg") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={sidebarLogo} alt="L&E" className="h-10 object-contain" />
          ) : svgContent ? (
            <div
              className="flex flex-col items-center justify-center text-center"
              dangerouslySetInnerHTML={{ __html: svgContent }}
            />
          ) : (
            <div className="h-10 w-full max-w-[200px] animate-pulse bg-muted/20 rounded-md" />
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="z-20 pt-4 no-scrollbar">
        {visibleGroups.map((group, index) => {
          const isOpen = openGroups[group.title] ?? true
          const isGroupActive = group.items.some((item) => {
            return pathname === item.url || (item.url !== "#" && pathname.startsWith(item.url + "/"))
          })

          return (
            <React.Fragment key={group.title}>
              {index > 0 && <SidebarSeparator className="my-1 mx-3 bg-sidebar-foreground/25 h-px" />}
              <Collapsible
                open={isOpen}
                onOpenChange={(open) => handleToggleGroup(group.title, open)}
                className="group/collapsible"
              >
                <SidebarGroup className="py-1">
                  <SidebarGroupLabel
                    asChild
                    className={cn(
                      "text-sm px-3 mb-1 h-9 cursor-pointer transition-all select-none rounded-lg",
                      isGroupActive
                        ? "bg-sidebar-accent/70 text-sidebar-foreground font-semibold shadow-2xs"
                        : "text-sidebar-foreground/60 font-medium hover:bg-sidebar-accent/30 hover:text-sidebar-foreground"
                    )}
                  >
                    <CollapsibleTrigger className="flex w-full items-center justify-between">
                      <span className="truncate">
                        {t(group.title)}
                      </span>
                      <ChevronDown className={cn(
                        "size-4 shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180",
                        isGroupActive ? "text-sidebar-foreground" : "text-sidebar-foreground/60"
                      )} />
                    </CollapsibleTrigger>
                  </SidebarGroupLabel>
                  <CollapsibleContent>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {group.items.map((item) => (
                          <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton
                              asChild
                              isActive={pathname === item.url}
                              className="my-0.5"
                            >
                              <Link href={item.url} className="px-3 py-2 flex items-center gap-2.5">
                                <div className="flex size-6.5 shrink-0 items-center justify-center rounded-md bg-black/10 dark:bg-white/10 skyblue:bg-white/20 shadow-2xs transition-transform duration-200 group-hover/menu-button:scale-110">
                                  <item.icon className={cn("size-4 shrink-0", item.color)} />
                                </div>
                                <span className="font-medium text-[15px]">{t(item.title)}</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </SidebarGroup>
              </Collapsible>
            </React.Fragment>
          )
        })}
      </SidebarContent>
    </Sidebar>
  )
}
