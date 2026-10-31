"use client"

import * as React from "react"
import Link from "next/link"
import { NavMain } from "@/components/nav-main"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  LayoutDashboardIcon,
  SlidersHorizontalIcon,
  MapPinIcon,
  UsersIcon,
  CreditCardIcon,
  ShieldAlertIcon,
  Building2Icon,
  HistoryIcon,
  TagIcon,
} from "lucide-react"
import { useAdminTab } from "@/context/AdminTabContext"

export type AdminTab = "overview" | "settings" | "pricing" | "quotas" | "users" | "payments" | "moderation" | "logs"

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  activeTab?: AdminTab
}

export function AppSidebar({ activeTab: propActiveTab, ...props }: AppSidebarProps) {
  let activeTab: AdminTab = propActiveTab || "overview"
  let setActiveTab: ((tab: AdminTab) => void) | undefined

  try {
    const tabContext = useAdminTab()
    activeTab = tabContext.activeTab
    setActiveTab = tabContext.setActiveTab
  } catch {
    // Context dışındaysa fallback
  }

  const navItems = [
    {
      title: "Genel Bakış",
      url: "/?tab=overview",
      tabKey: "overview" as AdminTab,
      icon: <LayoutDashboardIcon className="size-4" />,
      isActive: activeTab === "overview",
    },
    {
      title: "Genel Ayarlar",
      url: "/?tab=settings",
      tabKey: "settings" as AdminTab,
      icon: <SlidersHorizontalIcon className="size-4" />,
      isActive: activeTab === "settings",
    },
    {
      title: "Google Play Fiyatları",
      url: "/?tab=pricing",
      tabKey: "pricing" as AdminTab,
      icon: <TagIcon className="size-4" />,
      isActive: activeTab === "pricing",
    },
    {
      title: "Oda Kontenjanları (81 İl)",
      url: "/?tab=quotas",
      tabKey: "quotas" as AdminTab,
      icon: <MapPinIcon className="size-4" />,
      isActive: activeTab === "quotas",
    },
    {
      title: "Kullanıcı Yönetimi",
      url: "/?tab=users",
      tabKey: "users" as AdminTab,
      icon: <UsersIcon className="size-4" />,
      isActive: activeTab === "users",
    },
    {
      title: "Ödeme & Ciro Takip Paneli",
      url: "/?tab=payments",
      tabKey: "payments" as AdminTab,
      icon: <CreditCardIcon className="size-4" />,
      isActive: activeTab === "payments",
    },
    {
      title: "İçerik Denetimi & Moderasyon",
      url: "/?tab=moderation",
      tabKey: "moderation" as AdminTab,
      icon: <ShieldAlertIcon className="size-4" />,
      isActive: activeTab === "moderation",
    },
    {
      title: "Admin Denetim Logları",
      url: "/?tab=logs",
      tabKey: "logs" as AdminTab,
      icon: <HistoryIcon className="size-4" />,
      isActive: activeTab === "logs",
    },
  ]

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="data-[slot=sidebar-menu-button]:p-2"
              onClick={(e) => {
                if (!e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
                  e.preventDefault()
                  setActiveTab?.("overview")
                }
              }}
              render={<Link href="/?tab=overview" />}
            >
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
                <Building2Icon className="size-5" />
              </div>
              <div className="flex flex-col text-start">
                <span className="text-sm font-bold tracking-tight">81 Şehir Odası</span>
                <span className="text-[11px] text-muted-foreground">Yönetim Paneli</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="pt-2">
        <NavMain items={navItems} />
      </SidebarContent>
    </Sidebar>
  )
}
