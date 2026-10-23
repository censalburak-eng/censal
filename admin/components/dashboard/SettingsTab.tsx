"use client";

import * as React from "react";
import { useAppSettings } from "@/hooks/useSettings";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { SparklesIcon, LockIcon, UnlockIcon, RefreshCwIcon, SaveIcon, CheckCircle2Icon } from "lucide-react";

export function SettingsTab() {
  const { settings, isLoading, isError, updateSettings, isUpdating } = useAppSettings();

  const [freeMode, setFreeMode] = React.useState<boolean>(false);
  const [priceMonthly, setPriceMonthly] = React.useState<string>("99.99");
  const [priceYearly, setPriceYearly] = React.useState<string>("999.99");
  const [pricePin24h, setPricePin24h] = React.useState<string>("199.99");

  React.useEffect(() => {
    if (settings) {
      setFreeMode(Boolean(settings.free_mode));
      setPriceMonthly(String(settings.price_monthly ?? "99.99"));
      setPriceYearly(String(settings.price_yearly ?? "999.99"));
      setPricePin24h(String(settings.price_pin_24h ?? "199.99"));
    }
  }, [settings]);

  const handleSavePrices = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      price_monthly: parseFloat(priceMonthly) || 99.99,
      price_yearly: parseFloat(priceYearly) || 999.99,
      price_pin_24h: parseFloat(pricePin24h) || 199.99,
    });
  };

  const handleToggleFreeMode = (checked: boolean) => {
    setFreeMode(checked);
    updateSettings({
      free_mode: checked,
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
                <CardTitle className="text-lg">1. Ücretsiz Mod Anahtarı (Free Mode)</CardTitle>
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

        {/* 2. Dinamik Fiyat Yönetimi */}
        <Card className="border transition-all duration-200">
          <form onSubmit={handleSavePrices}>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">2. Dinamik Fiyat Yönetimi</CardTitle>
                  <CardDescription className="text-sm">
                    Mobil uygulamadaki abonelik ve sabitleme ücretlerini panelden anlık güncelleyin.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="price-monthly" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Aylık Abonelik Fiyatı
                </Label>
                <div className="relative">
                  <Input
                    id="price-monthly"
                    type="number"
                    step="0.01"
                    min="0"
                    value={priceMonthly}
                    onChange={(e) => setPriceMonthly(e.target.value)}
                    className="font-mono text-base pe-16"
                    placeholder="99.99"
                    required
                  />
                  <span className="absolute end-3 top-2.5 text-xs text-muted-foreground font-semibold">₺ / Ay</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="price-yearly" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Yıllık Abonelik Fiyatı
                </Label>
                <div className="relative">
                  <Input
                    id="price-yearly"
                    type="number"
                    step="0.01"
                    min="0"
                    value={priceYearly}
                    onChange={(e) => setPriceYearly(e.target.value)}
                    className="font-mono text-base pe-16"
                    placeholder="999.99"
                    required
                  />
                  <span className="absolute end-3 top-2.5 text-xs text-muted-foreground font-semibold">₺ / Yıl</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="price-pin" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  24 Saatlik Sabitleme Ücreti (Oda Vitrini)
                </Label>
                <div className="relative">
                  <Input
                    id="price-pin"
                    type="number"
                    step="0.01"
                    min="0"
                    value={pricePin24h}
                    onChange={(e) => setPricePin24h(e.target.value)}
                    className="font-mono text-base pe-20"
                    placeholder="199.99"
                    required
                  />
                  <span className="absolute end-3 top-2.5 text-xs text-muted-foreground font-semibold">₺ / 24 Saat</span>
                </div>
              </div>
            </CardContent>

            <CardFooter className="pt-2 flex justify-end border-t bg-muted/20">
              <Button type="submit" disabled={isUpdating} className="gap-2">
                {isUpdating ? (
                  <RefreshCwIcon className="size-4 animate-spin" />
                ) : (
                  <SaveIcon className="size-4" />
                )}
                Fiyatları Kaydet
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
