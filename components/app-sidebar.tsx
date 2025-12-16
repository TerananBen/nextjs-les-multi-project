"use client"

import * as React from "react"
import {
  IconAlertTriangle,
  IconDashboard,
  IconSettings,
  IconTool,
  IconMap,
  IconUser,
  IconBulb,
  IconListDetails,
  IconPlugConnected,
  IconCalendarTime,
  IconDeviceAnalytics,
  IconReplace,
  IconBriefcase,
  IconBell,
  IconMap2,
} from "@tabler/icons-react"
import { useTranslations } from "next-intl"

import { NavMain } from "@/components/nav-main"
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
const menuMapping: Record<string, { title: string; icon: any; url: string }> = {
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

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
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
}

export function AppSidebar({ menuItems = [], ...props }: AppSidebarProps) {
  const pathname = usePathname()
  const t = useTranslations("Sidebar")

  // Environment variables for personalization
  const sidebarLogo = process.env.NEXT_PUBLIC_SIDEBAR_LOGO || "/logo-placeholder.png"

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
        <div className="flex flex-col items-center">
          {sidebarLogo ? (
            <img src={sidebarLogo} alt="L&E" className="h-10 object-contain" />
          ) : (
            <div className="bg-white/20 p-2 rounded text-lg font-bold border-2 border-white">L&E</div>
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
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
