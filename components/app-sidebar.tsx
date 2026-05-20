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
} from "@tabler/icons-react"
import { useTranslations } from "next-intl"
import { NavUser } from "@/components/nav-user"
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
import { MenuItem } from "@/app/actions/auth"
import { Link, usePathname } from "@/i18n/routing"

// Map menu_name to icon and title
const menuMapping: Record<string, { title: string; icon: React.ElementType; url: string }> = {
  "V_Dashboard": { title: "menu.overview", icon: IconBriefcase, url: "/Dashboard/Dashboard" },
  "V_AlertStreetLight": { title: "menu.alerts", icon: IconBell, url: "/SettingSystem/Alerts" },
  "V_GroupConfig": { title: "menu.groupConfig", icon: IconSettings, url: "/SettingControl/GroupConfig" },
  "V_GroupDashboard": { title: "menu.groupDashboard", icon: IconBriefcase, url: "/Dashboard/GroupDashboard" },
  "V_MaintenanceConfig": { title: "menu.maintenanceConfig", icon: IconTool, url: "/Maintenance/MaintenanceConfig" },
  "V_MaintenanceDashboard": { title: "menu.maintenanceDashboard", icon: IconBriefcase, url: "/Maintenance/MaintenanceDashboard" },
  "V_MapDisconnect": { title: "menu.mapDisconnect", icon: IconMap2, url: "/Map/MapDisconnect" },
  "V_MapGlobal": { title: "menu.mapGlobal", icon: IconMap2, url: "/Map/MapGlobal" },
  "V_Personal": { title: "menu.personal", icon: IconUser, url: "/SettingSystem/Personal" },
  "V_SettingMenu": { title: "menu.menuSettings", icon: IconSettings, url: "/SettingSystem/MenuSettings" },
  "V_SettingSchedule": { title: "menu.scheduleSettings", icon: IconCalendarTime, url: "/SettingControl/ScheduleSettings" },
  "V_StreetLight": { title: "menu.streetLight", icon: IconBulb, url: "/SettingControl/StreetLight" },
  "V_MaintenanceDetail": { title: "menu.maintenanceDetail", icon: IconListDetails, url: "/Maintenance/MaintenanceDetail" },
  "V_MapChangeLamp": { title: "menu.mapChangeLamp", icon: IconReplace, url: "/Map/MapChangeLamp" },
  "V_SettingDevice": { title: "menu.deviceSettings", icon: IconDeviceAnalytics, url: "/dashboard/settings-device" },
}



// Define menu groups
const menuGroups = [
  {
    title: "groups.streetLight",
    items: ["V_GroupDashboard", "V_Dashboard"],
  },
  {
    title: "groups.controlEdit",
    items: ["V_StreetLight", "V_GroupConfig", "V_SettingSchedule"],
  },
  {
    title: "groups.mapLamp",
    items: ["V_MapDisconnect", "V_MapGlobal"],
  },
  {
    title: "groups.maintenance",
    items: ["V_MaintenanceDashboard", "V_MaintenanceConfig", "V_MaintenanceDetail"],
  },
  {
    title: "groups.systemSettings",
    items: ["V_SettingMenu", "V_AlertStreetLight", "V_Personal"],
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

  // Create a map of readable menu items for easy lookup
  const readableItems = React.useMemo(() => {
    const map = new Map<string, MenuItem>()
    menuItems.forEach((item) => {
      if (item.readable === "1") {
        map.set(item.menu_name, item)
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
          // Filter items in this group that are readable
          const groupItems = group.items
            .filter((menuName) => readableItems.has(menuName))
            .map((menuName) => {
              const mapping = menuMapping[menuName]
              return {
                title: mapping ? mapping.title : menuName,
                url: mapping ? mapping.url : "#",
                icon: mapping ? mapping.icon : IconListDetails,
              }
            })

          if (groupItems.length === 0) return null

          return (
            <SidebarGroup key={group.title}>
              <SidebarGroupLabel className="text-sidebar-foreground/80 font-medium text-sm px-4 mb-2">{t(group.title)}</SidebarGroupLabel>
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
                          {/* Right Arrow for sub-navigation feeling */}
                          {/* <ChevronRight className="ml-auto size-4 opacity-50" /> */}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )
        })}
      </SidebarContent>
      <SidebarFooter className="z-20">
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
