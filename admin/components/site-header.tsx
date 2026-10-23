"use client"

import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import type { AdminTab } from "@/components/app-sidebar"
import { Badge } from "@/components/ui/badge"

const titles: Record<AdminTab, string> = {
  overview: "Genel Bakış & Ciro Özeti",
  settings: "1. Genel Ayarlar & 2. Dinamik Fiyat Yönetimi",
  quotas: "3. Oda Bazlı Sabit İlan Kontenjan Yönetimi",
  users: "4. Kullanıcı Yönetimi & Üye İşlemleri",
  payments: "5. Ödeme ve Ciro Takip Paneli",
  moderation: "6. İçerik Denetimi & Moderasyon Paneli",
  logs: "7. Admin İşlem ve Denetim Logları",
}

import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"

export function SiteHeader({ activeTab = "overview" }: { activeTab?: AdminTab }) {
  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height) px-4 lg:px-6">
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mx-2 h-4" />
          <h1 className="text-base font-semibold">{titles[activeTab] || "Yönetim Paneli"}</h1>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
            Canlı Bağlantı
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              const supabase = (await import("@/lib/client")).createClient()
              await supabase.auth.signOut()
              window.location.href = "/login"
            }}
            className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1.5"
          >
            <LogOut className="h-3.5 w-3.5" />
            Çıkış Yap
          </Button>
        </div>
      </div>
    </header>
  )
}
