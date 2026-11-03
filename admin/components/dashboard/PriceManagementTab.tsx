"use client";

import * as React from "react";
import { usePlayPricing } from "@/hooks/usePlayPricing";
import type { PlayProductItem } from "@/lib/playAuth";
import type { PriceChangeLogItem } from "@/api/playApi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  RefreshCwIcon,
  SearchIcon,
  TagIcon,
  SparklesIcon,
  ShoppingBagIcon,
  AlertTriangleIcon,
  CheckCircle2Icon,
  ClockIcon,
  EyeIcon,
  ArrowRightIcon,
  ShieldCheckIcon,
  XCircleIcon,
  InfoIcon,
} from "lucide-react";
import { toast } from "sonner";

export function PriceManagementTab() {
  const {
    products,
    isMock,
    packageName,
    isLoadingProducts,
    isRefetchingProducts,
    refetchProducts,
    logs,
    isLoadingLogs,
    refetchLogs,
    updatePrice,
    isUpdating,
  } = usePlayPricing();

  const [search, setSearch] = React.useState("");
  const [filterType, setFilterType] = React.useState<"all" | "subscription" | "onetime">("all");

  // Her ürün satırı için girilen yeni fiyat state'i (productId:basePlanId -> string)
  // Aynı ürünün farklı planları/seçenekleri birbirinin input'unu doldurmasın diye plan da anahtara dahil
  const [priceInputs, setPriceInputs] = React.useState<Record<string, string>>({});
  const getPriceKey = (p: PlayProductItem) => `${p.productId}:${p.basePlanId ?? ""}`;

  // Onay modalı state'i
  const [selectedProduct, setSelectedProduct] = React.useState<PlayProductItem | null>(null);
  const [targetNewPrice, setTargetNewPrice] = React.useState<number | null>(null);
  const [applyToExisting, setApplyToExisting] = React.useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = React.useState(false);

  // Dry-run önizleme sonucu state'i
  const [previewResult, setPreviewResult] = React.useState<{
    productId: string;
    message: string;
    oldPrice: number | null;
    newPrice: number;
    units?: string;
    nanos?: number;
  } | null>(null);

  // Arama ve filtreleme
  const filteredProducts = React.useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        search === "" ||
        p.productId.toLowerCase().includes(search.toLowerCase()) ||
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        (p.basePlanId && p.basePlanId.toLowerCase().includes(search.toLowerCase()));

      const matchFilter =
        filterType === "all" ||
        (filterType === "subscription" && p.type === "subscription") ||
        (filterType === "onetime" && p.type === "onetime");

      return matchSearch && matchFilter;
    });
  }, [products, search, filterType]);

  const handlePriceInputChange = (priceKey: string, val: string) => {
    // Sadece rakam ve nokta/virgül girişine izin ver
    const sanitized = val.replace(",", ".");
    if (/^\d*\.?\d{0,2}$/.test(sanitized)) {
      setPriceInputs((prev) => ({ ...prev, [priceKey]: sanitized }));
    }
  };

  const getEnteredPrice = (product: PlayProductItem): number | null => {
    const raw = priceInputs[getPriceKey(product)];
    if (!raw) return null;
    const num = parseFloat(raw);
    if (!Number.isFinite(num) || num <= 0 || num > 10000) return null;
    return Math.round(num * 100) / 100;
  };

  // 1. Dry-Run (Önizleme)
  const handleDryRun = async (product: PlayProductItem) => {
    const newPrice = getEnteredPrice(product);
    if (!newPrice) {
      toast.error("Lütfen geçerli bir pozitif fiyat girin (maksimum 10.000 TL, en fazla 2 ondalık).");
      return;
    }

    try {
      const res = await updatePrice({
        type: product.type,
        productId: product.productId,
        basePlanId: product.basePlanId,
        price: newPrice,
        dryRun: true,
        applyToExisting: false,
      });

      setPreviewResult({
        productId: product.productId,
        message: res.message,
        oldPrice: res.details?.oldPrice ?? product.currentPrice,
        newPrice,
        units: res.details?.units,
        nanos: res.details?.nanos,
      });

      toast.info("Önizleme başarıyla oluşturuldu.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Önizleme başarısız oldu.");
    }
  };

  // 2. Uygula butonuna basıldığında onay modalını aç
  const handleOpenConfirm = (product: PlayProductItem) => {
    const newPrice = getEnteredPrice(product);
    if (!newPrice) {
      toast.error("Lütfen geçerli bir pozitif fiyat girin (maksimum 10.000 TL, en fazla 2 ondalık).");
      return;
    }

    setSelectedProduct(product);
    setTargetNewPrice(newPrice);
    setApplyToExisting(false);
    setIsConfirmOpen(true);
  };

  // 3. Modaldan onaylandığında gerçek güncelleme yap
  const handleExecuteUpdate = async () => {
    if (!selectedProduct || targetNewPrice === null) return;

    try {
      const res = await updatePrice({
        type: selectedProduct.type,
        productId: selectedProduct.productId,
        basePlanId: selectedProduct.basePlanId,
        price: targetNewPrice,
        dryRun: false,
        applyToExisting: selectedProduct.type === "subscription" ? applyToExisting : false,
      });

      toast.success(res.message || "Fiyat başarıyla güncellendi.");
      setIsConfirmOpen(false);
      setSelectedProduct(null);
      setTargetNewPrice(null);
      setPreviewResult(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fiyat güncellenirken hata oluştu.");
    }
  };

  const formatDate = (isoString: string) => {
    try {
      return new Intl.DateTimeFormat("tr-TR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(isoString));
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Üst Bilgi Kartı */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-xl flex items-center gap-2">
                <TagIcon className="size-5 text-primary" />
                Google Play Fiyat Yönetimi
              </CardTitle>

            </div>
            <CardDescription className="text-sm">
              Google Play Console üzerindeki aboneliklerin ve tek seferlik ürünlerin Türkiye (TRY) fiyatlarını doğrudan güncelleyin.
            </CardDescription>
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground font-mono">
              <span>Paket Adı: <strong className="text-foreground">{packageName || "Tanımlanmamış"}</strong></span>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchProducts();
              refetchLogs();
              toast.info("Veriler yenileniyor...");
            }}
            disabled={isLoadingProducts || isRefetchingProducts}
            className="gap-2 shrink-0"
          >
            <RefreshCwIcon className={`size-3.5 ${isRefetchingProducts ? "animate-spin" : ""}`} />
            Yenile
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Önizleme (Dry-Run) Bildirim Kartı */}
          {previewResult && (
            <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 text-xs space-y-2 text-foreground">
              <div className="flex items-center justify-between font-semibold text-blue-600 dark:text-blue-400">
                <span className="flex items-center gap-1.5 text-sm">
                  <EyeIcon className="size-4" />
                  Önizleme (Dry-Run) Simülasyon Sonucu
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setPreviewResult(null)}
                >
                  Kapat
                </Button>
              </div>
              <p className="font-medium text-sm">{previewResult.message}</p>
              <div className="flex flex-wrap items-center gap-4 text-muted-foreground pt-1">
                <span>Ürün: <strong className="text-foreground font-mono">{previewResult.productId}</strong></span>
                <span>Eski: <strong className="text-foreground">{previewResult.oldPrice ?? 0} ₺</strong></span>
                <span>Yeni: <strong className="text-foreground">{previewResult.newPrice} ₺</strong></span>
                {previewResult.units && (
                  <span className="font-mono">Units: {previewResult.units} · Nanos: {previewResult.nanos}</span>
                )}
              </div>
            </div>
          )}

          {/* Arama ve Filtreleme */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 max-w-sm">
              <SearchIcon className="absolute start-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Ürün adı, ID veya plan ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ps-9 text-sm"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <Button
                variant={filterType === "all" ? "default" : "outline"}
                size="sm"
                className="text-xs h-8"
                onClick={() => setFilterType("all")}
              >
                Tümü
              </Button>
              <Button
                variant={filterType === "subscription" ? "default" : "outline"}
                size="sm"
                className="text-xs h-8"
                onClick={() => setFilterType("subscription")}
              >
                Abonelikler
              </Button>
              <Button
                variant={filterType === "onetime" ? "default" : "outline"}
                size="sm"
                className="text-xs h-8"
                onClick={() => setFilterType("onetime")}
              >
                Tek Seferlik
              </Button>
            </div>
          </div>

          {/* Ürünler Tablosu */}
          {isLoadingProducts ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2">
              <RefreshCwIcon className="size-6 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Google Play ürünleri yükleniyor...</span>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="rounded-xl border border-dashed p-12 text-center flex flex-col items-center justify-center">
              <TagIcon className="size-10 text-muted-foreground/40 mb-3" />
              <h3 className="text-base font-semibold mb-1">
                {products.length === 0 ? "Google Play Ürünü Bulunamadı" : "Aramaya Uygun Ürün Yok"}
              </h3>
              <p className="text-sm text-muted-foreground max-w-md">
                {products.length === 0
                  ? "Google Play Console üzerinde bu paket adına ait abonelik veya tek seferlik ürün bulunamadı. Servis hesabı izinlerini kontrol edin."
                  : "Farklı bir arama terimi deneyin veya filtreyi sıfırlayın."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Mobil Ürün Kart Listesi (md:hidden) */}
              <div className="grid grid-cols-1 gap-3 md:hidden">
                {filteredProducts.map((p) => {
                  const enteredPrice = getEnteredPrice(p);
                  const isAllowed = p.allowed;

                  return (
                    <div key={`${p.productId}-${p.basePlanId || "default"}`} className="rounded-xl border p-4 bg-card/60 space-y-3 shadow-xs">
                      {/* Başlık & Tür */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="font-semibold text-foreground text-sm block truncate">{p.title}</span>
                          <span className="font-mono text-xs text-muted-foreground block truncate">#{p.productId}</span>
                        </div>
                        <div className="shrink-0">
                          {p.type === "subscription" ? (
                            <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 border-indigo-500/30 text-xs gap-1 font-medium">
                              <SparklesIcon className="size-3" />
                              Abonelik
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs gap-1 font-medium">
                              <ShoppingBagIcon className="size-3" />
                              Tek Seferlik
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Taban Plan & Mevcut Fiyat */}
                      <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t">
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Taban Plan</span>
                          <span className="font-mono text-foreground font-medium text-xs pt-0.5 block truncate">
                            {p.basePlanId || "-"}
                          </span>
                        </div>

                        <div>
                          <span className="text-muted-foreground block text-[11px]">Mevcut Fiyat (TR)</span>
                          <span className="font-semibold text-foreground text-sm pt-0.5 block">
                            {p.currentPrice !== null ? `${p.currentPrice.toFixed(2)} ₺` : "Tanımsız"}
                          </span>
                        </div>
                      </div>

                      {/* Yeni Fiyat & Butonlar */}
                      <div className="pt-2 border-t space-y-2">
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-medium text-muted-foreground shrink-0">Yeni Fiyat:</label>
                          <div className="relative flex-1">
                            <Input
                              type="text"
                              inputMode="decimal"
                              placeholder={p.currentPrice ? p.currentPrice.toString() : "0.00"}
                              value={priceInputs[getPriceKey(p)] ?? ""}
                              onChange={(e) => handlePriceInputChange(getPriceKey(p), e.target.value)}
                              disabled={!isAllowed || isUpdating}
                              className="pe-7 h-9 text-xs font-mono w-full"
                            />
                            <span className="absolute end-2.5 top-2.5 text-xs font-semibold text-muted-foreground">₺</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          {!isAllowed ? (
                            <Badge variant="secondary" className="text-xs font-normal w-full py-1.5 justify-center">
                              Değişiklik İzni Yok
                            </Badge>
                          ) : (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-9 text-xs gap-1 flex-1"
                                onClick={() => handleDryRun(p)}
                                disabled={!enteredPrice || isUpdating}
                              >
                                <EyeIcon className="size-3.5" />
                                Önizle
                              </Button>
                              <Button
                                variant="default"
                                size="sm"
                                className="h-9 text-xs gap-1 bg-primary hover:bg-primary/90 text-primary-foreground flex-1"
                                onClick={() => handleOpenConfirm(p)}
                                disabled={!enteredPrice || isUpdating}
                              >
                                Uygula
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Masaüstü Tablo Görünümü (hidden md:block) */}
              <div className="hidden md:block rounded-xl border overflow-x-auto shadow-xs">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[280px]">Ürün / Paket</TableHead>
                      <TableHead className="w-[120px]">Tür</TableHead>
                      <TableHead className="w-[140px]">Taban Plan</TableHead>
                      <TableHead className="w-[130px]">Mevcut Fiyat (TR)</TableHead>
                      <TableHead className="w-[160px]">Yeni Fiyat (₺)</TableHead>
                      <TableHead className="text-end">İşlemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((p) => {
                      const enteredPrice = getEnteredPrice(p);
                      const isAllowed = p.allowed;

                      return (
                        <TableRow key={`${p.productId}-${p.basePlanId || "default"}`} className="hover:bg-muted/20">
                          {/* Ürün Başlığı & ID */}
                          <TableCell>
                            <div className="flex flex-col gap-0.5">
                              <span className="font-semibold text-foreground text-sm">{p.title}</span>
                              <span className="font-mono text-xs text-muted-foreground">#{p.productId}</span>
                            </div>
                          </TableCell>

                          {/* Tür */}
                          <TableCell>
                            {p.type === "subscription" ? (
                              <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 border-indigo-500/30 text-xs gap-1 font-medium">
                                <SparklesIcon className="size-3" />
                                Abonelik
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs gap-1 font-medium">
                                <ShoppingBagIcon className="size-3" />
                                Tek Seferlik
                              </Badge>
                            )}
                          </TableCell>

                          {/* Taban Plan */}
                          <TableCell>
                            <span className="font-mono text-xs text-foreground/80">
                              {p.basePlanId || <span className="text-muted-foreground italic">-</span>}
                            </span>
                          </TableCell>

                          {/* Mevcut Fiyat */}
                          <TableCell>
                            <span className="text-sm font-semibold text-foreground">
                              {p.currentPrice !== null ? `${p.currentPrice.toFixed(2)} ₺` : <span className="text-muted-foreground text-xs italic">Tanımsız</span>}
                            </span>
                          </TableCell>

                          {/* Yeni Fiyat Input */}
                          <TableCell>
                            <div className="relative max-w-[130px]">
                              <Input
                                type="text"
                                inputMode="decimal"
                                placeholder={p.currentPrice ? p.currentPrice.toString() : "0.00"}
                                value={priceInputs[getPriceKey(p)] ?? ""}
                                onChange={(e) => handlePriceInputChange(getPriceKey(p), e.target.value)}
                                disabled={!isAllowed || isUpdating}
                                className="pe-7 h-8 text-xs font-mono"
                              />
                              <span className="absolute end-2 top-2 text-xs font-semibold text-muted-foreground">₺</span>
                            </div>
                          </TableCell>

                          {/* İşlem Butonları */}
                          <TableCell className="text-end">
                            <div className="flex items-center justify-end gap-2">
                              {!isAllowed ? (
                                <Badge variant="secondary" className="text-xs font-normal">
                                  Değişiklik İzni Yok
                                </Badge>
                              ) : (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs gap-1"
                                    onClick={() => handleDryRun(p)}
                                    disabled={!enteredPrice || isUpdating}
                                  >
                                    <EyeIcon className="size-3" />
                                    Önizle
                                  </Button>
                                  <Button
                                    variant="default"
                                    size="sm"
                                    className="h-8 text-xs gap-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                                    onClick={() => handleOpenConfirm(p)}
                                    disabled={!enteredPrice || isUpdating}
                                  >
                                    Uygula
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Onay Modalı */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <ShieldCheckIcon className="size-5 text-primary" />
              Google Play Fiyatını Onaylayın
            </DialogTitle>
            <DialogDescription className="text-xs">
              Bu işlem Google Play Console üzerindeki ürün fiyatını güncelleyecektir.
            </DialogDescription>
          </DialogHeader>

          {selectedProduct && targetNewPrice !== null && (
            <div className="space-y-4 py-2">
              {/* Ürün & Fiyat Karşılaştırması */}
              <div className="rounded-lg border p-3.5 bg-muted/30 space-y-2">
                <div className="flex justify-between items-center text-sm font-semibold">
                  <span className="text-foreground">{selectedProduct.title}</span>
                  <Badge variant="outline" className="text-[11px] font-mono">
                    {selectedProduct.type === "subscription" ? "Abonelik" : "Tek Seferlik"}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground font-mono">
                  ID: #{selectedProduct.productId} {selectedProduct.basePlanId ? `· Plan: ${selectedProduct.basePlanId}` : ""}
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="text-center">
                    <span className="block text-[11px] text-muted-foreground">Eski Fiyat</span>
                    <span className="text-sm font-semibold line-through text-muted-foreground">
                      {selectedProduct.currentPrice ? `${selectedProduct.currentPrice.toFixed(2)} ₺` : "Yok"}
                    </span>
                  </div>
                  <ArrowRightIcon className="size-4 text-primary shrink-0" />
                  <div className="text-center">
                    <span className="block text-[11px] text-primary font-medium">Yeni Fiyat</span>
                    <span className="text-base font-bold text-foreground">
                      {targetNewPrice.toFixed(2)} ₺
                    </span>
                  </div>
                </div>
              </div>

              {/* Abonelik için: Mevcut Abonelere Geçiş Seçeneği */}
              {selectedProduct.type === "subscription" ? (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3.5 space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <Checkbox
                      id="applyToExistingCheckbox"
                      checked={applyToExisting}
                      onCheckedChange={(checked) => setApplyToExisting(Boolean(checked))}
                    />
                    <div className="space-y-1">
                      <label
                        htmlFor="applyToExistingCheckbox"
                        className="text-xs font-semibold text-foreground cursor-pointer block leading-none"
                      >
                        Mevcut aktif abonelere de bu fiyatı uygula (migratePrices)
                      </label>
                      <p className="text-[11px] text-muted-foreground leading-normal">
                        İşaretlenmezse yeni fiyat <strong>yalnızca yeni abone olacak</strong> kullanıcılara uygulanır (önerilen).
                      </p>
                    </div>
                  </div>

                  {applyToExisting && (
                    <div className="flex items-start gap-1.5 p-2 rounded bg-rose-500/10 text-rose-700 dark:text-rose-400 text-xs">
                      <AlertTriangleIcon className="size-4 shrink-0 mt-0.5" />
                      <span>
                        <strong>Önemli Uyarı:</strong> Mevcut abonelerin bir sonraki yenileme fiyatı yükseltilecektir. Google Play, kullanıcılara e-posta/bildirim göndererek onay talep eder.
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground flex items-center gap-1.5 p-2 bg-muted/40 rounded">
                  <InfoIcon className="size-3.5 text-muted-foreground shrink-0" />
                  <span>Tek seferlik ürünlerde fiyat değişikliği anında tüm yeni satın alımlarda geçerli olur.</span>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsConfirmOpen(false)}
              disabled={isUpdating}
            >
              Vazgeç
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleExecuteUpdate}
              disabled={isUpdating}
              className="gap-2"
            >
              {isUpdating && <RefreshCwIcon className="size-3.5 animate-spin" />}
              {isUpdating ? "Güncelleniyor..." : "Fiyatı Onayla ve Güncelle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Son Fiyat Değişiklikleri (Audit Log) Kartı */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <ClockIcon className="size-4 text-primary" />
              Fiyat Değişiklik Geçmişi (Denetim Kayıtları)
            </CardTitle>
            <CardDescription className="text-xs">
              Yapılan son 20 fiyat güncellemesi ve simülasyon kaydı.
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetchLogs()}
            disabled={isLoadingLogs}
            className="h-8 text-xs gap-1"
          >
            <RefreshCwIcon className={`size-3 ${isLoadingLogs ? "animate-spin" : ""}`} />
            Yenile
          </Button>
        </CardHeader>

        <CardContent>
          {isLoadingLogs ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCwIcon className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground italic">
              Henüz kayıtlı bir fiyat değişikliği bulunmuyor.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Mobil Fiyat Log Kart Listesi (md:hidden) */}
              <div className="grid grid-cols-1 gap-3 md:hidden">
                {logs.map((log) => {
                  const isSuccess = log.status === "success";
                  const isDryRun = log.status === "dry_run";

                  return (
                    <div key={log.id} className="rounded-xl border p-4 bg-card/60 space-y-2.5 shadow-xs">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-mono font-semibold text-foreground text-sm block">
                            #{log.product_id}
                          </span>
                          <span className="text-[11px] text-muted-foreground font-mono">
                            {formatDate(log.created_at)}
                          </span>
                        </div>

                        <div>
                          {isSuccess && (
                            <Badge className="bg-emerald-600 text-white gap-1 text-[10px] py-0.5">
                              <CheckCircle2Icon className="size-3" />
                              Başarılı
                            </Badge>
                          )}
                          {isDryRun && (
                            <Badge className="bg-sky-600 text-white gap-1 text-[10px] py-0.5">
                              <EyeIcon className="size-3" />
                              Önizleme
                            </Badge>
                          )}
                          {!isSuccess && !isDryRun && (
                            <Badge className="bg-rose-600 text-white gap-1 text-[10px] py-0.5">
                              <XCircleIcon className="size-3" />
                              Başarısız
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t text-xs">
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Fiyat Değişimi</span>
                          <span className="font-medium text-foreground pt-0.5 block">
                            {log.old_price !== null ? `${log.old_price.toFixed(2)} ₺` : "-"} →{" "}
                            <strong className="text-foreground">{log.new_price.toFixed(2)} ₺</strong>
                          </span>
                        </div>

                        <div className="text-end">
                          <span className="text-muted-foreground block text-[11px]">Kapsam</span>
                          <span className="text-xs pt-0.5 block">
                            {log.apply_to_existing ? (
                              <span className="text-amber-600 font-medium">Tüm Aboneler</span>
                            ) : (
                              <span className="text-muted-foreground">Yalnızca Yeni</span>
                            )}
                          </span>
                        </div>
                      </div>

                      {(log.error || isDryRun) && (
                        <div className="text-[11px] text-muted-foreground bg-muted/40 p-2 rounded">
                          {log.error || (isDryRun ? "Simülasyon kaydı" : "İşlem tamamlandı")}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Masaüstü Tablo Görünümü (hidden md:block) */}
              <div className="hidden md:block rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 text-xs">
                      <TableHead className="w-[140px]">Tarih / Saat</TableHead>
                      <TableHead className="w-[180px]">Ürün ID</TableHead>
                      <TableHead className="w-[100px]">Tür</TableHead>
                      <TableHead className="w-[160px]">Fiyat Değişimi</TableHead>
                      <TableHead className="w-[130px]">Mevcut Aboneler</TableHead>
                      <TableHead className="w-[120px]">Durum</TableHead>
                      <TableHead>Açıklama / Hata</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => {
                      const isSuccess = log.status === "success";
                      const isDryRun = log.status === "dry_run";

                      return (
                        <TableRow key={log.id} className="text-xs hover:bg-muted/10">
                          <TableCell className="font-medium whitespace-nowrap text-muted-foreground">
                            {formatDate(log.created_at)}
                          </TableCell>
                          <TableCell className="font-mono font-medium text-foreground">
                            {log.product_id}
                          </TableCell>
                          <TableCell>
                            {log.type === "subscription" ? "Abonelik" : "Tek Seferlik"}
                          </TableCell>
                          <TableCell className="font-medium whitespace-nowrap">
                            {log.old_price !== null ? `${log.old_price.toFixed(2)} ₺` : "-"} →{" "}
                            <strong className="text-foreground">{log.new_price.toFixed(2)} ₺</strong>
                          </TableCell>
                          <TableCell>
                            {log.apply_to_existing ? (
                              <span className="text-amber-600 font-medium">Uygulandı</span>
                            ) : (
                              <span className="text-muted-foreground">Yalnızca Yeni</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {isSuccess && (
                              <Badge className="bg-emerald-600 text-white gap-1 text-[10px] py-0.5">
                                <CheckCircle2Icon className="size-3" />
                                Başarılı
                              </Badge>
                            )}
                            {isDryRun && (
                              <Badge className="bg-sky-600 text-white gap-1 text-[10px] py-0.5">
                                <EyeIcon className="size-3" />
                                Önizleme
                              </Badge>
                            )}
                            {!isSuccess && !isDryRun && (
                              <Badge className="bg-rose-600 text-white gap-1 text-[10px] py-0.5">
                                <XCircleIcon className="size-3" />
                                Başarısız
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground truncate max-w-xs">
                            {log.error || (isDryRun ? "Simülasyon kaydı" : "İşlem tamamlandı")}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
