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
  HourglassIcon,
  CheckIcon,
  XIcon,
  ShieldAlertIcon,
  ClockIcon,
} from "lucide-react";

export function PaymentsTab() {
  const {
    payments,
    requests,
    pendingRequests,
    failedPayments,
    successPayments,
    stats,
    isLoading,
    refetch,
    approvePayment,
    rejectPayment,
  } = usePayments();

  const [processingId, setProcessingId] = React.useState<string | null>(null);
  const [filterMode, setFilterMode] = React.useState<"all" | "failed" | "success">("all");

  const displayedList = React.useMemo(() => {
    if (filterMode === "failed") return failedPayments;
    if (filterMode === "success") return successPayments;
    return payments;
  }, [filterMode, payments, failedPayments, successPayments]);

  const channelIcons: Record<string, { label: string; color: string; bg: string }> = {
    google: { label: "Google Play Store", color: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-50 dark:bg-emerald-950/40" },
    apple: { label: "iOS (App Store)", color: "text-neutral-800 dark:text-neutral-200", bg: "bg-neutral-100 dark:bg-neutral-800" },
    manual: { label: "Yönetici Onaylı / Manuel", color: "text-indigo-700 dark:text-indigo-300", bg: "bg-indigo-50 dark:bg-indigo-950/40" },
  };

  const packageLabels: Record<string, string> = {
    monthly: "Aylık Abonelik",
    yearly: "Yıllık Abonelik",
    pin_24h: "24s Sabit İlan",
  };

  const handleApprove = async (id: string) => {
    try {
      setProcessingId(id);
      await approvePayment(id);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    try {
      setProcessingId(id);
      await rejectPayment(id);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* 5.1 Ciro ve Onay Bekleyen Özet Kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Onay Bekleyenler Kartı */}
        <Card className={`border-2 transition-all ${
          pendingRequests.length > 0
            ? "border-amber-500/60 bg-gradient-to-br from-amber-500/15 via-card to-card shadow-md shadow-amber-500/10"
            : "border-border bg-card"
        }`}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase">
                Onay Bekleyen Ödemeler
              </CardDescription>
              {pendingRequests.length > 0 && (
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                </span>
              )}
            </div>
            <CardTitle className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
              {pendingRequests.length} <span className="text-xs font-normal text-muted-foreground">talep</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground flex items-center gap-1.5">
            <HourglassIcon className="size-3.5 text-amber-500" />
            {pendingRequests.length > 0 ? "Yönetici onayı bekliyor" : "Bekleyen talep yok"}
          </CardContent>
        </Card>

        {/* Günlük Ciro */}
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

        {/* Haftalık Ciro */}
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

        {/* Aylık Ciro */}
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
      </div>

      {/* 5.2 ONAY BEKLEYEN ÖDEME TALEPLERİ (YÖNETİCİ ONAY MASASI) */}
      <Card className="border-amber-500/30">
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 bg-muted/20 rounded-t-xl">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl flex items-center gap-2 text-foreground">
                <HourglassIcon className="size-5 text-amber-500" />
                Onay Bekleyen Ödeme Talepleri
              </CardTitle>
              <Badge variant={pendingRequests.length > 0 ? "default" : "outline"} className={pendingRequests.length > 0 ? "bg-amber-600 hover:bg-amber-700" : ""}>
                {pendingRequests.length} Bekleyen
              </Badge>
            </div>
            <CardDescription className="mt-1">
              Kullanıcı mobilden ödemeye bastığında talep buraya düşer. &quot;Onayla&quot; butonuna bastığınızda kullanıcının üyeliği / sabit ilanı anında satın alınmış gibi aktifleşir.
            </CardDescription>
          </div>

          <Button size="icon" variant="outline" className="size-8" onClick={() => refetch()} title="Yenile">
            <RefreshCwIcon className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </CardHeader>

        <CardContent className="pt-4">
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b">
                <tr>
                  <th className="p-3">Kullanıcı</th>
                  <th className="p-3">Talep Edilen Paket</th>
                  <th className="p-3">Tutar</th>
                  <th className="p-3">Talep Tarihi</th>
                  <th className="p-3 text-end">Onay / Red İşlemi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pendingRequests.map((req) => {
                  const isBusy = processingId === req.id;
                  return (
                    <tr key={req.id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-3">
                        <div className="font-semibold text-foreground">
                          {req.user_name || "Kullanıcı"}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {req.user_phone || req.user_id.slice(0, 8) || "-"}
                        </div>
                      </td>

                      <td className="p-3">
                        <Badge variant="outline" className="text-xs font-medium">
                          {packageLabels[req.package_type] || req.package_type}
                        </Badge>
                      </td>

                      <td className="p-3 font-mono font-bold text-sm text-foreground">
                        ₺{Number(req.amount).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                      </td>

                      <td className="p-3 text-xs text-muted-foreground font-mono whitespace-nowrap">
                        {new Date(req.created_at).toLocaleString("tr-TR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>

                      <td className="p-3 text-end whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 px-3 gap-1.5"
                            disabled={isBusy}
                            onClick={() => handleApprove(req.id)}
                          >
                            <CheckIcon className="size-3.5" />
                            {isBusy ? "Onaylanıyor..." : "Onayla"}
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            className="border-destructive/40 text-destructive hover:bg-destructive/10 text-xs h-8 px-2.5 gap-1"
                            disabled={isBusy}
                            onClick={() => handleReject(req.id)}
                          >
                            <XIcon className="size-3.5" />
                            Reddet
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {pendingRequests.length === 0 && (
              <div className="py-10 text-center text-sm text-muted-foreground flex flex-col items-center justify-center gap-2">
                <CheckCircle2Icon className="size-8 text-emerald-500/60" />
                <span>Onay bekleyen ödeme talebi bulunmamaktadır.</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 5.3 Kanal Bazlı Gelir Raporu */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Kanal Bazlı Gelir Raporu</CardTitle>
          <CardDescription>
            Google Play Store, iOS App Store ve Yönetici onaylı ödeme kanallarının ciro dağılımı.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(["google", "apple", "manual"] as const).map((ch) => {
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

      {/* 5.4 Canlı İşlem Geçmişi & Başarısız Ödemeler */}
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
              Kim, ne zaman, hangi ödeme yöntemiyle hangi paketi aldı ve onay durumları.
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
                  <th className="p-3">Durum / Detay</th>
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
