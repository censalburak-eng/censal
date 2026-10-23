"use client"

import * as React from "react"
import Link from "next/link"
import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
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
} from "lucide-react"

export type AdminTab = "overview" | "settings" | "quotas" | "users" | "payments" | "moderation" | "logs"

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  activeTab?: AdminTab
}

export function AppSidebar({ activeTab = "overview", ...props }: AppSidebarProps) {
  const user = {
    name: "Yönetici",
    email: "admin@sehirodalari.com",
    avatar: "",
  }

  const navItems = [
    {
      title: "Genel Bakış",
      url: "/?tab=overview",
      icon: <LayoutDashboardIcon className="size-4" />,
      isActive: activeTab === "overview",
    },
    {
      title: "Genel Ayarlar & Fiyatlar",
      url: "/?tab=settings",
      icon: <SlidersHorizontalIcon className="size-4" />,
      isActive: activeTab === "settings",
    },
    {
      title: "Oda Kontenjanları (81 İl)",
      url: "/?tab=quotas",
      icon: <MapPinIcon className="size-4" />,
      isActive: activeTab === "quotas",
    },
    {
      title: "Kullanıcı Yönetimi",
      url: "/?tab=users",
      icon: <UsersIcon className="size-4" />,
      isActive: activeTab === "users",
    },
    {
      title: "Ödeme & Ciro Takip Paneli",
      url: "/?tab=payments",
      icon: <CreditCardIcon className="size-4" />,
      isActive: activeTab === "payments",
    },
    {
      title: "İçerik Denetimi & Moderasyon",
      url: "/?tab=moderation",
      icon: <ShieldAlertIcon className="size-4" />,
      isActive: activeTab === "moderation",
    },
    {
      title: "Admin Denetim Logları",
      url: "/?tab=logs",
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

      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
