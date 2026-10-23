"use client";

import * as React from "react";
import { useCityQuotas } from "@/hooks/useSettings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SearchIcon, MapPinIcon, RefreshCwIcon, CheckIcon, SaveIcon } from "lucide-react";

export function CityQuotasTab() {
  const { cities, isLoading, updateLimit } = useCityQuotas();
  const [search, setSearch] = React.useState("");

  // Sadece kullanıcının değiştirdiği şehirlerin yeni limitlerini tutar (cityId -> newLimit)
  const [pendingChanges, setPendingChanges] = React.useState<Record<number, number>>({});

  // Bağımsız olarak o an kaydedilmekte olan şehir ID'leri (her butonun kendi loading durumu)
  const [savingCityIds, setSavingCityIds] = React.useState<Record<number, boolean>>({});

  const filteredCities = React.useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return cities;
    return cities.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        String(c.plate).includes(term) ||
        String(c.plate).padStart(2, "0").includes(term)
    );
  }, [cities, search]);

  const handleLimitChange = (cityId: number, baseLimit: number, val: number) => {
    const safeVal = Math.max(1, Math.min(val, 50));
    setPendingChanges((prev) => {
      // Eğer orijinal değerine eşitlenirse pending'den çıkar
      if (safeVal === baseLimit) {
        const next = { ...prev };
        delete next[cityId];
        return next;
      }
      return { ...prev, [cityId]: safeVal };
    });
  };

  const handleSave = (cityId: number) => {
    const newLimit = pendingChanges[cityId];
    if (newLimit === undefined) return;

    setSavingCityIds((prev) => ({ ...prev, [cityId]: true }));
    updateLimit(
      { cityId, maxLimit: newLimit },
      {
        onSuccess: () => {
          // Yalnızca kaydedilen şehir pending listesinden çıkar, diğer değiştirilen şehirler KORUNUR!
          setPendingChanges((prev) => {
            const next = { ...prev };
            delete next[cityId];
            return next;
          });
        },
        onSettled: () => {
          setSavingCityIds((prev) => {
            const next = { ...prev };
            delete next[cityId];
            return next;
          });
        },
      }
    );
  };

  const totalPending = Object.keys(pendingChanges).length;

  const handleSaveAll = () => {
    Object.entries(pendingChanges).forEach(([idStr]) => {
      handleSave(Number(idStr));
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCwIcon className="size-6 animate-spin text-muted-foreground" />
        <span className="ms-2 text-sm text-muted-foreground">Şehir kontenjanları yükleniyor...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl">3. Oda Bazlı Sabit İlan Kontenjan Yönetimi</CardTitle>
              {totalPending > 0 && (
                <Badge variant="outline" className="border-primary text-primary font-bold">
                  {totalPending} Şehir Değiştirildi
                </Badge>
              )}
            </div>
            <CardDescription>
              81 ilin her biri için maksimum sabit ilan kontenjanını ayrı ayrı belirleyin. Varsayılan limit 3'tür.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            {totalPending > 1 && (
              <Button size="sm" onClick={handleSaveAll} className="gap-1.5 shrink-0 bg-primary">
                <SaveIcon className="size-4" /> Tümünü Kaydet ({totalPending})
              </Button>
            )}

            <div className="relative w-full md:w-72">
              <SearchIcon className="absolute start-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Şehir adı veya plaka ara (örn: 34 veya İstanbul)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ps-9"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredCities.map((city) => {
              const baseLimit = city.max_pinned_limit ?? 3;
              const hasChanged = city.id in pendingChanges;
              const currentVal = hasChanged ? pendingChanges[city.id] : baseLimit;
              const isSaving = Boolean(savingCityIds[city.id]);
              const isFull = city.active_pins_count >= currentVal;

              return (
                <div
                  key={city.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                    hasChanged
                      ? "border-primary bg-primary/5 shadow-xs"
                      : "bg-card hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-md bg-muted font-mono font-bold text-xs">
                      {String(city.plate).padStart(2, "0")}
                    </span>
                    <div>
                      <div className="font-semibold text-sm flex items-center gap-1.5">
                        <MapPinIcon className="size-3.5 text-muted-foreground" />
                        {city.name}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs text-muted-foreground">Aktif Sabit:</span>
                        <Badge
                          variant={isFull ? "destructive" : "secondary"}
                          className="text-[10px] px-1.5 py-0 font-mono"
                        >
                          {city.active_pins_count} / {currentVal}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center border rounded-md overflow-hidden bg-background">
                      <button
                        type="button"
                        onClick={() => handleLimitChange(city.id, baseLimit, currentVal - 1)}
                        disabled={isSaving}
                        className="px-2 py-1 text-sm font-bold text-muted-foreground hover:bg-muted active:bg-muted/80 disabled:opacity-50"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={currentVal}
                        disabled={isSaving}
                        onChange={(e) =>
                          handleLimitChange(city.id, baseLimit, parseInt(e.target.value, 10) || 1)
                        }
                        className="w-10 text-center font-mono text-xs border-x py-1 focus:outline-hidden disabled:opacity-50"
                      />
                      <button
                        type="button"
                        onClick={() => handleLimitChange(city.id, baseLimit, currentVal + 1)}
                        disabled={isSaving}
                        className="px-2 py-1 text-sm font-bold text-muted-foreground hover:bg-muted active:bg-muted/80 disabled:opacity-50"
                      >
                        +
                      </button>
                    </div>

                    <Button
                      size="sm"
                      variant={hasChanged ? "default" : "outline"}
                      className={`size-8 p-0 transition-all ${
                        hasChanged
                          ? "bg-primary text-primary-foreground hover:bg-primary/90"
                          : "opacity-40"
                      }`}
                      onClick={() => handleSave(city.id)}
                      disabled={isSaving || !hasChanged}
                      title={hasChanged ? "Değişikliği Kaydet" : "Değişiklik yok"}
                    >
                      {isSaving ? (
                        <RefreshCwIcon className="size-3.5 animate-spin" />
                      ) : (
                        <CheckIcon className="size-4" />
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredCities.length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Arama kriterine uygun şehir bulunamadı.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
