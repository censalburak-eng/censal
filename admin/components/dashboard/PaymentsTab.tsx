"use client";

import * as React from "react";
import { usePayments } from "@/hooks/usePayments";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUpIcon,
  AlertCircleIcon,
  CheckCircle2Icon,
  RefreshCwIcon,
  CreditCardIcon,
  SmartphoneIcon,
  ZapIcon,
  ShieldAlertIcon,
} from "lucide-react";

export function PaymentsTab() {
  const { payments, failedPayments, successPayments, stats, isLoading, refetch } = usePayments();
  const [filterMode, setFilterMode] = React.useState<"all" | "failed" | "success">("all");

  const displayedList = React.useMemo(() => {
    if (filterMode === "failed") return failedPayments;
    if (filterMode === "success") return successPayments;
    return payments;
  }, [filterMode, payments, failedPayments, successPayments]);

  const channelIcons: Record<string, { label: string; color: string; bg: string }> = {
    apple: { label: "Apple IAP", color: "text-neutral-800 dark:text-neutral-200", bg: "bg-neutral-100 dark:bg-neutral-800" },
    google: { label: "Google Play", color: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-50 dark:bg-emerald-950/40" },
    paytr: { label: "PayTR", color: "text-blue-700 dark:text-blue-300", bg: "bg-blue-50 dark:bg-blue-950/40" },
    paycell: { label: "Paycell", color: "text-amber-700 dark:text-amber-300", bg: "bg-amber-50 dark:bg-amber-950/40" },
  };

  const packageLabels: Record<string, string> = {
    monthly: "Aylık Abonelik",
    yearly: "Yıllık Abonelik",
    pin_24h: "24s Sabit İlan",
  };

  return (
    <div className="space-y-6">
      {/* 5.1 Ciro Raporları Kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-emerald-500/10 via-card to-card border-emerald-500/20">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase">
              Günlük Ciro (24 Saat)
            </CardDescription>
            <CardTitle className="text-2xl font-bold font-mono">
              ₺{(stats?.daily_revenue ?? 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground flex items-center gap-1">
            <TrendingUpIcon className="size-3.5 text-emerald-500" />
            Canlı akıştan hesaplandı
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 via-card to-card border-blue-500/20">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase">
              Haftalık Ciro (7 Gün)
            </CardDescription>
            <CardTitle className="text-2xl font-bold font-mono">
              ₺{(stats?.weekly_revenue ?? 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground flex items-center gap-1">
            <TrendingUpIcon className="size-3.5 text-blue-500" />
            Son 7 gün toplamı
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 via-card to-card border-purple-500/20">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase">
              Aylık Ciro (30 Gün)
            </CardDescription>
            <CardTitle className="text-2xl font-bold font-mono">
              ₺{(stats?.monthly_revenue ?? 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground flex items-center gap-1">
            <TrendingUpIcon className="size-3.5 text-purple-500" />
            Son 30 gün toplamı
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-rose-500/10 via-card to-card border-rose-500/20">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase">
              Başarısız Ödemeler
            </CardDescription>
            <CardTitle className="text-2xl font-bold font-mono text-destructive">
              {stats?.failed_count ?? failedPayments.length} <span className="text-xs font-normal text-muted-foreground">işlem</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground flex items-center gap-1">
            <AlertCircleIcon className="size-3.5 text-destructive" />
            Reddedilen & takılan işlemler
          </CardContent>
        </Card>
      </div>

      {/* 5.2 Kanal Bazlı Gelir Raporu */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Kanal Bazlı Gelir Raporu</CardTitle>
          <CardDescription>
            Apple IAP, Google Play Billing, PayTR ve Paycell kanallarının ciro dağılımı.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(["apple", "google", "paytr", "paycell"] as const).map((ch) => {
              const meta = channelIcons[ch];
              const amount = stats?.channel_breakdown?.[ch] ?? 0;
              const total = stats?.total_revenue || 1;
              const percent = Math.round((amount / total) * 100);

              return (
                <div key={ch} className={`p-4 rounded-xl border ${meta.bg} flex flex-col justify-between`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold uppercase ${meta.color}`}>{meta.label}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
                      %{percent}
                    </Badge>
                  </div>
                  <div className="mt-3">
                    <div className="text-xl font-bold font-mono">
                      ₺{amount.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="w-full bg-muted-foreground/20 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div className="bg-primary h-full transition-all" style={{ width: `${Math.min(100, percent)}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 5.3 Canlı İşlem Geçmişi & Başarısız Ödemeler */}
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl">Canlı İşlem Geçmişi & Denetim</CardTitle>
              <Badge variant="outline" className="text-xs">
                {payments.length} Toplam İşlem
              </Badge>
            </div>
            <CardDescription>
              Kim, ne zaman, hangi ödeme yöntemiyle hangi paketi aldı ve varsa red nedenleri.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex border rounded-lg p-0.5 bg-muted">
              <Button
                size="sm"
                variant={filterMode === "all" ? "default" : "ghost"}
                className="text-xs h-7 px-2.5"
                onClick={() => setFilterMode("all")}
              >
                Tümü ({payments.length})
              </Button>
              <Button
                size="sm"
                variant={filterMode === "success" ? "default" : "ghost"}
                className="text-xs h-7 px-2.5"
                onClick={() => setFilterMode("success")}
              >
                <CheckCircle2Icon className="size-3 text-emerald-500 me-1" />
                Başarılı ({successPayments.length})
              </Button>
              <Button
                size="sm"
                variant={filterMode === "failed" ? "destructive" : "ghost"}
                className="text-xs h-7 px-2.5"
                onClick={() => setFilterMode("failed")}
              >
                <ShieldAlertIcon className="size-3 me-1" />
                Başarısız ({failedPayments.length})
              </Button>
            </div>

            <Button size="icon" variant="outline" className="size-8" onClick={() => refetch()} title="Yenile">
              <RefreshCwIcon className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b">
                <tr>
                  <th className="p-3">Kullanıcı</th>
                  <th className="p-3">Ödeme Kanalı</th>
                  <th className="p-3">Paket</th>
                  <th className="p-3">Tutar</th>
                  <th className="p-3">Durum / Hata Nedeni</th>
                  <th className="p-3 text-end">Tarih</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {displayedList.map((item) => {
                  const meta = channelIcons[item.channel] || { label: item.channel, color: "text-foreground", bg: "bg-muted" };
                  const isSuccess = item.status === "success";

                  return (
                    <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-3">
                        <div className="font-medium text-foreground">
                          {item.user_name || "Kullanıcı"}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {item.user_phone || item.user_id?.slice(0, 8) || "-"}
                        </div>
                      </td>

                      <td className="p-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${meta.bg} ${meta.color}`}>
                          <CreditCardIcon className="size-3.5" />
                          {meta.label}
                        </span>
                      </td>

                      <td className="p-3">
                        <Badge variant="outline" className="text-xs">
                          {packageLabels[item.package_type] || item.package_type}
                        </Badge>
                      </td>

                      <td className="p-3 font-mono font-bold text-sm">
                        ₺{Number(item.amount).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                      </td>

                      <td className="p-3">
                        {isSuccess ? (
                          <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-xs">
                            <CheckCircle2Icon className="size-3" /> Başarılı
                          </Badge>
                        ) : (
                          <div className="space-y-0.5">
                            <Badge variant="destructive" className="gap-1 text-xs">
                              <AlertCircleIcon className="size-3" /> Başarısız
                            </Badge>
                            {item.error_reason && (
                              <div className="text-xs text-destructive/90 font-medium">
                                {item.error_reason}
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="p-3 text-end text-xs text-muted-foreground font-mono whitespace-nowrap">
                        {new Date(item.created_at).toLocaleString("tr-TR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {displayedList.length === 0 && (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Kayıt bulunamadı.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
