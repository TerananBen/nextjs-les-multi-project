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
} from "@tabler/icons-react"
import { ChevronDown } from "lucide-react"
import { useTranslations } from "next-intl"
import { NavUser } from "@/components/layout/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
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

// Map menu_name to icon and title (supporting both new names and legacy V_ aliases)
const menuMapping: Record<string, { title: string; icon: React.ElementType; url: string }> = {
  // New standardized names
  "dashboard_overview": { title: "menu.overview", icon: IconBriefcase, url: "/dashboard/overview" },
  "system_alert": { title: "menu.alerts", icon: IconBell, url: "/setting-system/alerts" },
  "control_group": { title: "menu.groupConfig", icon: IconSettings, url: "/setting-control/group-config" },
  "dashboard_group": { title: "menu.groupDashboard", icon: IconBriefcase, url: "/dashboard/group" },
  "maintenance_request": { title: "menu.maintenanceConfig", icon: IconTool, url: "/maintenance/config" },
  "maintenance_dashboard": { title: "menu.maintenanceDashboard", icon: IconBriefcase, url: "/maintenance/dashboard" },
  "map_disconnect": { title: "menu.mapDisconnect", icon: IconMap2, url: "/map/disconnect" },
  "map_global": { title: "menu.mapGlobal", icon: IconMap2, url: "/map/global" },
  "system_personal": { title: "menu.personal", icon: IconUser, url: "/setting-system/personal" },
  "system_menu_permission": { title: "menu.menuSettings", icon: IconSettings, url: "/setting-system/menu-settings" },
  "system_api_setting": { title: "menu.apiSettings", icon: IconApi, url: "/setting-system/api-settings" },
  "control_schedule": { title: "menu.scheduleSettings", icon: IconCalendarTime, url: "/setting-control/schedule-settings" },
  "control_streetlight": { title: "menu.streetLight", icon: IconBulb, url: "/setting-control/street-light" },
  "maintenance_list": { title: "menu.maintenanceDetail", icon: IconListDetails, url: "/maintenance/detail" },
  "map_changelamp": { title: "menu.mapChangeLamp", icon: IconReplace, url: "/map/change-lamp" },
  "system_device": { title: "menu.deviceSettings", icon: IconDeviceAnalytics, url: "/dashboard/settings-device" },
  "system_project": { title: "menu.projectSettings", icon: IconFolders, url: "/setting-system/project" },

  // Legacy aliases for backward compatibility
  "V_Dashboard": { title: "menu.overview", icon: IconBriefcase, url: "/dashboard/overview" },
  "V_AlertStreetLight": { title: "menu.alerts", icon: IconBell, url: "/setting-system/alerts" },
  "V_GroupConfig": { title: "menu.groupConfig", icon: IconSettings, url: "/setting-control/group-config" },
  "V_GroupDashboard": { title: "menu.groupDashboard", icon: IconBriefcase, url: "/dashboard/group" },
  "V_MaintenanceConfig": { title: "menu.maintenanceConfig", icon: IconTool, url: "/maintenance/config" },
  "V_MaintenanceDashboard": { title: "menu.maintenanceDashboard", icon: IconBriefcase, url: "/maintenance/dashboard" },
  "V_MapDisconnect": { title: "menu.mapDisconnect", icon: IconMap2, url: "/map/disconnect" },
  "V_MapGlobal": { title: "menu.mapGlobal", icon: IconMap2, url: "/map/global" },
  "V_Personal": { title: "menu.personal", icon: IconUser, url: "/setting-system/personal" },
  "V_SettingMenu": { title: "menu.menuSettings", icon: IconSettings, url: "/setting-system/menu-settings" },
  "V_SettingApi": { title: "menu.apiSettings", icon: IconApi, url: "/setting-system/api-settings" },
  "V_SettingSchedule": { title: "menu.scheduleSettings", icon: IconCalendarTime, url: "/setting-control/schedule-settings" },
  "V_StreetLight": { title: "menu.streetLight", icon: IconBulb, url: "/setting-control/street-light" },
  "V_MaintenanceDetail": { title: "menu.maintenanceDetail", icon: IconListDetails, url: "/maintenance/detail" },
  "V_MapChangeLamp": { title: "menu.mapChangeLamp", icon: IconReplace, url: "/map/change-lamp" },
  "V_SettingDevice": { title: "menu.deviceSettings", icon: IconDeviceAnalytics, url: "/dashboard/settings-device" },
  "V_ProjectSetting": { title: "menu.projectSettings", icon: IconFolders, url: "/setting-system/project" },
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
    items: ["system_menu_permission", "system_api_setting", "system_project", "system_alert", "system_personal"],
  },
]

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  menuItems?: MenuItem[]
  user: {
    name: string
    email?: string
    avatar?: string
    role?: string
  }
  sidebarLogo?: string;
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
    const roleLower = (user?.role || "").toLowerCase();
    return roleLower.includes("superadmin") || roleLower.includes("super_admin") || roleLower.includes("super-admin");
  }, [user?.role]);

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
        {menuGroups.map((group) => {
          // Filter items in this group that are readable (or all for SuperAdmin)
          const groupItems = group.items
            .filter((menuName) => isSuperAdmin || readableItems.has(menuName))
            .map((menuName) => {
              const mapping = menuMapping[menuName]
              return {
                title: mapping ? mapping.title : menuName,
                url: mapping ? mapping.url : "#",
                icon: mapping ? mapping.icon : IconListDetails,
              }
            })

          if (groupItems.length === 0) return null

          const isOpen = openGroups[group.title] ?? true

          return (
            <Collapsible
              key={group.title}
              open={isOpen}
              onOpenChange={(open) => handleToggleGroup(group.title, open)}
              className="group/collapsible"
            >
              <SidebarGroup className="py-1">
                <SidebarGroupLabel
                  asChild
                  className="text-sidebar-foreground/80 font-medium text-sm px-3 mb-1 h-9 cursor-pointer hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors select-none"
                >
                  <CollapsibleTrigger className="flex w-full items-center justify-between">
                    <span className="truncate">{t(group.title)}</span>
                    <ChevronDown className="size-4 shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                  </CollapsibleTrigger>
                </SidebarGroupLabel>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {groupItems.map((item) => (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton
                            asChild
                            isActive={pathname === item.url}
                            className="my-0.5"
                          >
                            <Link href={item.url} className="px-4 py-3">
                              <item.icon className="!size-5" />
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
          )
        })}
      </SidebarContent>
      <SidebarFooter className="z-20">
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
