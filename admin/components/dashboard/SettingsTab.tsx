"use client";

import * as React from "react";
import Link from "next/link";
import { useAppSettings } from "@/hooks/useSettings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { SparklesIcon, LockIcon, UnlockIcon, RefreshCwIcon, TagIcon, ArrowRightIcon, SaveIcon, DollarSignIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAdminTab } from "@/context/AdminTabContext";

export function SettingsTab() {
  const { settings, isLoading, isError, updateSettings, isUpdating } = useAppSettings();
  const { setActiveTab } = useAdminTab();

  const [freeMode, setFreeMode] = React.useState<boolean>(false);
  const [monthlyPrice, setMonthlyPrice] = React.useState<string>("");
  const [yearlyPrice, setYearlyPrice] = React.useState<string>("");
  const [pinPrice, setPinPrice] = React.useState<string>("");

  React.useEffect(() => {
    if (settings) {
      setFreeMode(Boolean(settings.free_mode));
      setMonthlyPrice(settings.price_monthly !== undefined ? String(settings.price_monthly) : "");
      setYearlyPrice(settings.price_yearly !== undefined ? String(settings.price_yearly) : "");
      setPinPrice(settings.price_pin_24h !== undefined ? String(settings.price_pin_24h) : "");
    }
  }, [settings]);

  const handleToggleFreeMode = (checked: boolean) => {
    setFreeMode(checked);
    updateSettings({
      free_mode: checked,
    });
  };

  const handleSavePrices = (e: React.FormEvent) => {
    e.preventDefault();
    const pMonthly = parseFloat(monthlyPrice.replace(",", "."));
    const pYearly = parseFloat(yearlyPrice.replace(",", "."));
    const pPin = parseFloat(pinPrice.replace(",", "."));

    if (isNaN(pMonthly) || pMonthly <= 0) {
      toast.error("Lütfen geçerli bir aylık abonelik fiyatı girin.");
      return;
    }
    if (isNaN(pYearly) || pYearly <= 0) {
      toast.error("Lütfen geçerli bir yıllık abonelik fiyatı girin.");
      return;
    }
    if (isNaN(pPin) || pPin <= 0) {
      toast.error("Lütfen geçerli bir sabitleme fiyatı girin.");
      return;
    }

    updateSettings({
      price_monthly: pMonthly,
      price_yearly: pYearly,
      price_pin_24h: pPin,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCwIcon className="size-6 animate-spin text-muted-foreground" />
        <span className="ms-2 text-sm text-muted-foreground">Ayarlar yükleniyor...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-6 text-destructive">
        Ayarlar getirilirken bir sorun oluştu. Lütfen sayfayı yenileyiniz.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* 1. Ücretsiz Mod Anahtarı (Free Mode Toggle) */}
        <Card className="border transition-all duration-200">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
            <div className="space-y-1 pr-4">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">Ücretsiz Mod Anahtarı (Free Mode)</CardTitle>
              </div>
              <CardDescription className="text-sm">
                Tek tıkla tüm 81 şehir odasının abonelik kilitlerini açın veya yeniden ücretli moda alın.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Switch
                id="free-mode-switch"
                checked={freeMode}
                onCheckedChange={handleToggleFreeMode}
                disabled={isUpdating}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Durum:</span>
              {freeMode ? (
                <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 px-2.5 py-1">
                  <UnlockIcon className="size-3.5" /> Ücretsiz Mod Aktif (Herkes Erişebilir)
                </Badge>
              ) : (
                <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400 gap-1.5 px-2.5 py-1">
                  <LockIcon className="size-3.5" /> Abonelik Modu Devrede
                </Badge>
              )}
            </div>

            <div
              className={`p-4 rounded-xl border text-sm transition-colors ${
                freeMode
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-100"
                  : "bg-muted/50 border-border text-muted-foreground"
              }`}
            >
              <div className="flex items-start gap-2.5">
                <SparklesIcon className="size-4 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  {freeMode
                    ? "Şu anda tüm şehir odaları kullanıcılara ücretsiz olarak açıktır. Kullanıcılar abonelik olmadan mesajları görebilir ve mesaj gönderebilir."
                    : "Standart işleyiş devrede: Kullanıcılar oda mesajlarını görmek ve yazmak için aktif bir abonelik paketine ihtiyaç duyar."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. Google Play Fiyatları Yönlendirme Kartı */}
        <Card className="border transition-all duration-200">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <TagIcon className="size-5 text-primary" />
              Ürün & Abonelik Fiyatları
            </CardTitle>
            <CardDescription className="text-sm">
              Fiyatlandırmalar doğrudan Google Play Developer API üzerinden senkronize edilmektedir.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Abonelik ve tek seferlik sabitleme ücretlerini değiştirmek, fiyat artışı simülasyonu yapmak ve mevcut abonelere fiyat geçişi uygulamak için <strong>Google Play Fiyatları</strong> sekmesini kullanabilirsiniz.
            </p>

            <Button
              variant="outline"
              className="w-full gap-2 justify-between cursor-pointer"
              onClick={() => setActiveTab("pricing")}
            >
              <span className="flex items-center gap-2">
                <TagIcon className="size-4 text-primary" />
                Google Play Fiyat Yönetimine Git
              </span>
              <ArrowRightIcon className="size-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
