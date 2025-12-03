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
} from "@tabler/icons-react"

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
  "V_Dashboard": { title: "Dashboard", icon: IconDashboard, url: "/Dashboard/Dashboard" },
  "V_AlertStreetLight": { title: "Alerts", icon: IconAlertTriangle, url: "/SettingSystem/Alerts" },
  "V_GroupConfig": { title: "Group Config", icon: IconSettings, url: "/SettingControl/GroupConfig" },
  "V_GroupDashboard": { title: "Group Dashboard", icon: IconDashboard, url: "/Dashboard/GroupDashboard" },
  "V_MaintenanceConfig": { title: "Maintenance Config", icon: IconTool, url: "/Maintenance/MaintenanceConfig" },
  "V_MaintenanceDashboard": { title: "Maintenance Dashboard", icon: IconDashboard, url: "/Maintenance/MaintenanceDashboard" },
  "V_MapDisconnect": { title: "Map Disconnect", icon: IconMap, url: "/Map/MapDisconnect" },
  "V_MapGlobal": { title: "Map Global", icon: IconMap, url: "/Map/MapGlobal" },
  "V_Personal": { title: "Personal", icon: IconUser, url: "/SettingSystem/Personal" },
  "V_SettingMenu": { title: "Menu Settings", icon: IconSettings, url: "/SettingSystem/MenuSettings" },
  "V_SettingSchedule": { title: "Schedule Settings", icon: IconCalendarTime, url: "/SettingControl/ScheduleSettings" },
  "V_StreetLight": { title: "Street Light", icon: IconBulb, url: "/SettingControl/StreetLight" },
  "V_MaintenanceDetail": { title: "Maintenance Detail", icon: IconListDetails, url: "/Maintenance/MaintenanceDetail" },
  "V_MapChangeLamp": { title: "Map Change Lamp", icon: IconReplace, url: "/Map/MapChangeLamp" },
  "V_SettingDevice": { title: "Device Settings", icon: IconDeviceAnalytics, url: "/dashboard/settings-device" },
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
    title: "Dashboard",
    items: ["V_GroupDashboard", "V_Dashboard"],
  },
  {
    title: "Setting & Control",
    items: ["V_StreetLight", "V_GroupConfig", "V_SettingSchedule"],
  },
  {
    title: "Map",
    items: ["V_MapDisconnect", "V_MapGlobal"],
  },
  {
    title: "Maintenance",
    items: ["V_MaintenanceDashboard", "V_MaintenanceConfig", "V_MaintenanceDetail"],
  },
  {
    title: "Setting System",
    items: ["V_SettingMenu", "V_AlertStreetLight", "V_Personal"],
  },
]

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  menuItems?: MenuItem[]
}

export function AppSidebar({ menuItems = [], ...props }: AppSidebarProps) {
  const pathname = usePathname()

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
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link href="#">
                <IconPlugConnected className="!size-5" />
                <span className="text-base font-semibold">L&E Inc.</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
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
              <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {groupItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={pathname === item.url}>
                        <Link href={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
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
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
