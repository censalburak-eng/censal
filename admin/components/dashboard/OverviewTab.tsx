"use client";

import * as React from "react";
import Link from "next/link";
import { useAppSettings } from "@/hooks/useSettings";
import { usePayments } from "@/hooks/usePayments";
import { useModeration } from "@/hooks/useModeration";
import { useUsers } from "@/hooks/useUsers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUpIcon,
  UnlockIcon,
  LockIcon,
  ShieldAlertIcon,
  UsersIcon,
  ArrowRightIcon,
  CreditCardIcon,
  MapPinIcon,
  SlidersHorizontalIcon,
} from "lucide-react";

export function OverviewTab() {
  const { settings } = useAppSettings();
  const { stats, payments } = usePayments();
  const { reports } = useModeration();
  const { users } = useUsers();

  const isFreeMode = Boolean(settings?.free_mode);
  const pendingReports = reports.filter((r) => r.status === "pending");

  return (
    <div className="space-y-6">
      {/* Üst Metrik Kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Free Mode Durumu */}
        <Link href="/?tab=settings" className="block group">
          <Card className="h-full hover:border-primary/50 transition-colors">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-semibold uppercase">Uygulama Modu</CardDescription>
              <CardTitle className="text-xl flex items-center gap-2">
                {isFreeMode ? (
                  <Badge className="bg-emerald-600 text-white text-xs gap-1">
                    <UnlockIcon className="size-3.5" /> ÜCRETSİZ MOD
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-amber-500 text-amber-500 text-xs gap-1">
                    <LockIcon className="size-3.5" /> ABONELİK MODU
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground flex items-center justify-between">
              <span>{isFreeMode ? "Kilitler kaldırıldı" : "Üyelik zorunlu"}</span>
              <ArrowRightIcon className="size-3.5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </CardContent>
          </Card>
        </Link>

        {/* 2. Toplam Ciro */}
        <Link href="/?tab=payments" className="block group">
          <Card className="h-full hover:border-primary/50 transition-colors">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-semibold uppercase">Toplam Ciro</CardDescription>
              <CardTitle className="text-2xl font-bold font-mono">
                ₺{(stats?.total_revenue ?? 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground flex items-center justify-between">
              <span className="flex items-center gap-1 text-emerald-600 font-medium">
                <TrendingUpIcon className="size-3.5" />
                {stats?.success_count ?? 0} başarılı işlem
              </span>
              <ArrowRightIcon className="size-3.5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </CardContent>
          </Card>
        </Link>

        {/* 3. Bekleyen Şikayetler */}
        <Link href="/?tab=moderation" className="block group">
          <Card className="h-full hover:border-primary/50 transition-colors">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-semibold uppercase">Bekleyen Şikayetler</CardDescription>
              <CardTitle className="text-2xl font-bold font-mono text-destructive">
                {pendingReports.length} <span className="text-xs font-normal text-muted-foreground">ihbar</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground flex items-center justify-between">
              <span className="flex items-center gap-1 text-destructive font-medium">
                <ShieldAlertIcon className="size-3.5" />
                İncelenmeyi bekliyor
              </span>
              <ArrowRightIcon className="size-3.5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </CardContent>
          </Card>
        </Link>

        {/* 4. Toplam Üye */}
        <Link href="/?tab=users" className="block group">
          <Card className="h-full hover:border-primary/50 transition-colors">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-semibold uppercase">Kayıtlı Kullanıcılar</CardDescription>
              <CardTitle className="text-2xl font-bold font-mono">
                {users.length} <span className="text-xs font-normal text-muted-foreground">üye</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground flex items-center justify-between">
              <span className="flex items-center gap-1">
                <UsersIcon className="size-3.5" />
                Tüm profiller
              </span>
              <ArrowRightIcon className="size-3.5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Hızlı Erişim Modül Kartları */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Yönetim Modülleri Hızlı Erişim</CardTitle>
          <CardDescription>
            Aşağıdaki kartlardan ilgili yönetim bölümüne doğrudan geçiş yapabilirsiniz.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/?tab=settings" className="block group">
              <div className="p-4 rounded-xl border bg-card hover:bg-muted/30 cursor-pointer transition-all space-y-2 h-full">
                <div className="flex items-center justify-between">
                  <span className="p-2 rounded-lg bg-primary/10 text-primary">
                    <SlidersHorizontalIcon className="size-5" />
                  </span>
                  <ArrowRightIcon className="size-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                </div>
                <div className="font-bold text-sm">1 & 2. Genel Ayarlar & Fiyatlar</div>
                <p className="text-xs text-muted-foreground">
                  Ücretsiz mod anahtarı, aylık/yıllık abonelik fiyatları ve 24s sabitleme ücreti yönetimi.
                </p>
              </div>
            </Link>

            <Link href="/?tab=quotas" className="block group">
              <div className="p-4 rounded-xl border bg-card hover:bg-muted/30 cursor-pointer transition-all space-y-2 h-full">
                <div className="flex items-center justify-between">
                  <span className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
                    <MapPinIcon className="size-5" />
                  </span>
                  <ArrowRightIcon className="size-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                </div>
                <div className="font-bold text-sm">3. 81 İl Kontenjan Yönetimi</div>
                <p className="text-xs text-muted-foreground">
                  Oda bazlı maksimum sabit ilan limitlerini (varsayılan 3) değiştirme ve doluluk takibi.
                </p>
              </div>
            </Link>

            <Link href="/?tab=users" className="block group">
              <div className="p-4 rounded-xl border bg-card hover:bg-muted/30 cursor-pointer transition-all space-y-2 h-full">
                <div className="flex items-center justify-between">
                  <span className="p-2 rounded-lg bg-purple-500/10 text-purple-600">
                    <UsersIcon className="size-5" />
                  </span>
                  <ArrowRightIcon className="size-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                </div>
                <div className="font-bold text-sm">4. Kullanıcı & Abonelik Yönetimi</div>
                <p className="text-xs text-muted-foreground">
                  Üye arama, kullanıcı banlama/kaldırma, hediye abonelik tanımlama ve süre uzatma.
                </p>
              </div>
            </Link>

            <Link href="/?tab=payments" className="block group">
              <div className="p-4 rounded-xl border bg-card hover:bg-muted/30 cursor-pointer transition-all space-y-2 h-full">
                <div className="flex items-center justify-between">
                  <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                    <CreditCardIcon className="size-5" />
                  </span>
                  <ArrowRightIcon className="size-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                </div>
                <div className="font-bold text-sm">5. Ödeme & Ciro Takip Paneli</div>
                <p className="text-xs text-muted-foreground">
                  Canlı işlem geçmişi, günlük/haftalık/aylık ciro, Apple/Google/PayTR dağılımı ve başarısız denemeler.
                </p>
              </div>
            </Link>

            <Link href="/?tab=moderation" className="block group md:col-span-2">
              <div className="p-4 rounded-xl border bg-card hover:bg-muted/30 cursor-pointer transition-all space-y-2 h-full">
                <div className="flex items-center justify-between">
                  <span className="p-2 rounded-lg bg-rose-500/10 text-rose-600">
                    <ShieldAlertIcon className="size-5" />
                  </span>
                  <ArrowRightIcon className="size-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                </div>
                <div className="font-bold text-sm">6. İçerik Denetimi & Moderasyon</div>
                <p className="text-xs text-muted-foreground">
                  Şikayet edilen metin, ses kaydı ve görselleri silme, yasaklı kelime filtresini düzenleme ve odaların sabit ilanlarını kaldırma.
                </p>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Son Canlı İşlemler Özeti */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base font-semibold">Son Canlı İşlemler</CardTitle>
            <CardDescription>Uygulama üzerinden gerçekleşen en son ödemeler.</CardDescription>
          </div>
          <Link href="/?tab=payments">
            <Button variant="ghost" size="sm" className="text-xs">
              Tümünü Gör <ArrowRightIcon className="size-3.5 ms-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border text-sm">
            {payments.slice(0, 5).map((p) => (
              <div key={p.id} className="py-2.5 flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium text-foreground">{p.user_name || "Kullanıcı"}</div>
                  <div className="text-xs text-muted-foreground font-mono">
                    {new Date(p.created_at).toLocaleTimeString("tr-TR")} • {p.channel.toUpperCase()}
                  </div>
                </div>
                <div className="text-end">
                  <div className="font-bold font-mono">₺{Number(p.amount).toFixed(2)}</div>
                  <Badge variant={p.status === "success" ? "default" : "destructive"} className="text-[10px] py-0">
                    {p.status === "success" ? "Başarılı" : "Başarısız"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
