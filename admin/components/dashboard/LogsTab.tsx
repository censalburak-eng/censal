"use client";

import * as React from "react";
import { useAdminLogs } from "@/hooks/useAdminLogs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  RefreshCwIcon,
  SearchIcon,
  HistoryIcon,
  SlidersHorizontalIcon,
  MapPinIcon,
  UserXIcon,
  UserCheckIcon,
  Trash2Icon,
  CheckCircle2Icon,
  UserIcon,
  ActivityIcon,
  InfoIcon,
  EyeIcon,
  SparklesIcon,
  ClockIcon,
  ShieldCheckIcon,
  ShieldAlertIcon,
  KeyRoundIcon,
} from "lucide-react";
import { CITY_MAP } from "@/lib/cities";
import type { AdminLog } from "@/api/logsApi";

function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `0${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 8)} ${cleaned.slice(8, 10)}`;
  }
  if (cleaned.length === 11 && cleaned.startsWith("0")) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7, 9)} ${cleaned.slice(9, 11)}`;
  }
  return phone;
}

// İnsan dilinde eylem bilgileri
function getActionMeta(action: string) {
  const act = action.toUpperCase();

  if (act === "ADMIN_ROLE_GRANT" || act.includes("ROLE_GRANT")) {
    return {
      title: "Yönetici Yetkisi Verildi",
      badgeClass: "bg-purple-600 hover:bg-purple-700 text-white",
      icon: <ShieldCheckIcon className="size-3.5" />,
    };
  }
  if (act === "ADMIN_ROLE_REVOKE" || act.includes("ROLE_REVOKE")) {
    return {
      title: "Yönetici Yetkisi Kaldırıldı",
      badgeClass: "bg-slate-700 hover:bg-slate-800 text-white",
      icon: <ShieldAlertIcon className="size-3.5" />,
    };
  }
  if (act === "BAN_APPEAL_APPROVED") {
    return {
      title: "İtiraz Kabul Edildi (Ban Açıldı)",
      badgeClass: "bg-emerald-600 hover:bg-emerald-700 text-white",
      icon: <CheckCircle2Icon className="size-3.5" />,
    };
  }
  if (act === "BAN_APPEAL_REJECTED") {
    return {
      title: "Ban İtirazı Reddedildi",
      badgeClass: "bg-rose-700 hover:bg-rose-800 text-white",
      icon: <UserXIcon className="size-3.5" />,
    };
  }
  if (act === "SUBSCRIPTION_GRANT") {
    return {
      title: "Manuel Abonelik Tanımlandı",
      badgeClass: "bg-indigo-600 hover:bg-indigo-700 text-white",
      icon: <SparklesIcon className="size-3.5" />,
    };
  }
  if (act === "SUBSCRIPTION_EXTEND") {
    return {
      title: "Abonelik Süresi Uzatıldı",
      badgeClass: "bg-indigo-600 hover:bg-indigo-700 text-white",
      icon: <ClockIcon className="size-3.5" />,
    };
  }
  if (act === "SUBSCRIPTION_CANCEL" || act === "SUBSCRIPTION_REVOKE") {
    return {
      title: "Abonelik İptal Edildi",
      badgeClass: "bg-rose-600 hover:bg-rose-700 text-white",
      icon: <UserXIcon className="size-3.5" />,
    };
  }
  if (act === "QUOTA_UPDATE") {
    return {
      title: "Kontenjan Değiştirildi",
      badgeClass: "bg-amber-600 hover:bg-amber-700 text-white",
      icon: <MapPinIcon className="size-3.5" />,
    };
  }
  if (act === "SETTINGS_UPDATE" || act === "SETTINGS_INIT") {
    return {
      title: "Fiyat / Mod Güncellendi",
      badgeClass: "bg-blue-600 hover:bg-blue-700 text-white",
      icon: <SlidersHorizontalIcon className="size-3.5" />,
    };
  }
  if (act === "USER_UNBAN" || act.includes("UNBAN")) {
    return {
      title: "Kullanıcı Engeli Açıldı",
      badgeClass: "bg-emerald-600 hover:bg-emerald-700 text-white",
      icon: <UserCheckIcon className="size-3.5" />,
    };
  }
  if (act === "USER_BAN" || act.includes("BAN")) {
    return {
      title: "Kullanıcı Engellendi",
      badgeClass: "bg-rose-600 hover:bg-rose-700 text-white",
      icon: <UserXIcon className="size-3.5" />,
    };
  }
  if (act.includes("DELETE") || act.includes("REMOVE")) {
    return {
      title: "İçerik Silindi",
      badgeClass: "bg-red-700 text-white",
      icon: <Trash2Icon className="size-3.5" />,
    };
  }
  if (act.includes("RESOLVE") || act.includes("DISMISS")) {
    return {
      title: "Şikayet İncelendi",
      badgeClass: "bg-purple-600 hover:bg-purple-700 text-white",
      icon: <CheckCircle2Icon className="size-3.5" />,
    };
  }

  // Bilinmeyen eylemler için ham kod yerine okunabilir başlık
  const formattedTitle = action
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return {
    title: formattedTitle,
    badgeClass: "bg-slate-700 text-white",
    icon: <ActivityIcon className="size-3.5" />,
  };
}

// İnsan dilinde hedef modül, kullanıcı profili ve şehir adı
function getTargetDisplay(log: AdminLog) {
  const { target_type, target_id, target_first_name, target_last_name, target_phone, target_city_id } = log;
  const isProfile = target_type === "profile" || target_type === "profiles" || target_type === "users";

  if (target_type === "cities") {
    const cityId = Number(target_id);
    const city = !isNaN(cityId) ? CITY_MAP.get(cityId) : null;
    if (city) {
      return (
        <span className="inline-flex items-center gap-1.5 font-semibold text-foreground text-sm">
          <MapPinIcon className="size-4 text-primary" />
          {city.name} ({city.plate}) Odası
        </span>
      );
    }
    return <span>Şehir #{target_id}</span>;
  }

  if (target_type === "settings") {
    return (
      <span className="inline-flex items-center gap-1.5 text-foreground font-medium text-sm">
        <SlidersHorizontalIcon className="size-4 text-blue-500" />
        Genel Ayarlar & Fiyatlar
      </span>
    );
  }

  if (isProfile) {
    const fullName = [target_first_name, target_last_name].filter(Boolean).join(" ");
    const cityId = target_city_id ? Number(target_city_id) : null;
    const city = cityId && !isNaN(cityId) ? CITY_MAP.get(cityId) : null;
    const formattedPhoneNum = formatPhone(target_phone);

    return (
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-1.5 font-semibold text-foreground text-sm">
          <div className="size-5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <UserIcon className="size-3" />
          </div>
          <span className="truncate max-w-[150px]">
            {fullName || (formattedPhoneNum ? formattedPhoneNum : "Kayıtlı Kullanıcı")}
          </span>
          {city && (
            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 font-normal text-muted-foreground shrink-0">
              {city.name} ({city.plate})
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground ps-6">
          {fullName && formattedPhoneNum ? (
            <span className="font-mono text-[11px] font-medium text-foreground/80">{formattedPhoneNum}</span>
          ) : null}
          {target_id && (
            <span className="text-[10px] font-mono text-muted-foreground/60">
              #{target_id.slice(0, 6)}
            </span>
          )}
        </div>
      </div>
    );
  }

  if (target_type === "reports") {
    return (
      <span className="inline-flex items-center gap-1.5 text-foreground font-medium text-sm">
        <InfoIcon className="size-4 text-purple-500" />
        Şikayet Bildirimi {target_id ? `(#${target_id.slice(0, 6)})` : ""}
      </span>
    );
  }

  return <span className="text-muted-foreground capitalize">{target_type || "Sistem"}</span>;
}

function shouldShowTechnicalDetails(log: AdminLog): boolean {
  if (!log.details) return false;
  const keys = Object.keys(log.details);
  if (keys.length === 0) return false;
  // Basit tek alanlı veya zaten tam açıklanan alanlar için teknik JSON butonuna gerek yok
  const simpleKeys = ["role", "revoked", "new_limit", "previous_limit", "is_banned", "reason"];
  if (keys.length <= 2 && keys.every((k) => simpleKeys.includes(k))) return false;
  return true;
}

// İnsan dilinde anlaşılır işlem özeti (Detay)
function renderHumanDetails(log: AdminLog) {
  const d = log.details;
  const act = log.action.toUpperCase();

  // 1. Yönetici Rolü İşlemleri
  if (act === "ADMIN_ROLE_GRANT" || act.includes("ROLE_GRANT")) {
    return (
      <span className="text-xs text-foreground font-medium">
        Kullanıcıya <strong>Sistem Yöneticisi (Admin)</strong> yetkisi verildi.
      </span>
    );
  }
  if (act === "ADMIN_ROLE_REVOKE" || act.includes("ROLE_REVOKE")) {
    return (
      <span className="text-xs text-foreground font-medium">
        Kullanıcının yönetici yetkisi geri alındı (Standart kullanıcı yapıldı).
      </span>
    );
  }

  // 2. Kontenjan Değişikliği
  if (d && typeof d.new_limit === "number") {
    const prevText = typeof d.previous_limit === "number" ? ` (Önceki: ${d.previous_limit})` : "";
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="font-medium text-foreground">
          Sabit ilan kontenjan limiti <strong>{d.new_limit} adet</strong> olarak ayarlandı{prevText}.
        </span>
      </div>
    );
  }

  // 3. Ayar Değişikliği
  if (d) {
    const parts: string[] = [];
    if (typeof d.free_mode === "boolean") {
      parts.push(d.free_mode ? "Ücretsiz Mod Açık (Kilitler kaldırıldı)" : "Abonelik Zorunlu Modu Devrede");
    }
    if (d.price_monthly) parts.push(`Aylık: ${d.price_monthly} ₺`);
    if (d.price_yearly) parts.push(`Yıllık: ${d.price_yearly} ₺`);
    if (d.price_pin_24h) parts.push(`Sabitleme: ${d.price_pin_24h} ₺`);

    if (parts.length > 0) {
      return (
        <div className="text-xs text-foreground/90 space-y-0.5">
          <p className="font-medium">{parts.join(" · ")}</p>
        </div>
      );
    }
  }

  // 4. Ban Açtırma Talebi (İtiraz) Sonucu
  if (d && (d.appeal_id || act.includes("BAN_APPEAL"))) {
    const isApproved = act === "BAN_APPEAL_APPROVED";
    return (
      <div className="text-xs font-medium">
        {isApproved ? (
          <span className="text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1">
            <CheckCircle2Icon className="size-3.5" />
            İtiraz onaylandı, kullanıcının engeli tamamen kaldırıldı.
          </span>
        ) : (
          <span className="text-rose-700 dark:text-rose-400 inline-flex items-center gap-1">
            <UserXIcon className="size-3.5" />
            İtiraz reddedildi, kullanıcının engeli devam ediyor.
          </span>
        )}
      </div>
    );
  }

  // 5. Manuel Abonelik İşlemleri
  if (d && (d.plan || act.includes("SUBSCRIPTION"))) {
    if (d.additional_days) {
      return (
        <span className="text-xs text-foreground font-medium">
          Abonelik süresi <strong>+{String(d.additional_days)} gün</strong> uzatıldı.
        </span>
      );
    }
    const planText = d.plan === "yearly" ? "Yıllık" : "Aylık";
    return (
      <span className="text-xs text-foreground font-medium">
        Kullanıcıya manuel <strong>{planText}</strong> paket tanımlandı ({String(d.duration_days || 30)} gün).
      </span>
    );
  }

  // 6. Kullanıcı Banlama / Moderasyon
  if (d && d.reason) {
    const isBan = (d.is_banned !== false && !act.includes("UNBAN")) && (d.is_banned === true || act.includes("BAN"));
    return (
      <div className="text-xs text-foreground space-y-0.5">
        <p className="font-medium">
          {isBan ? "Yasaklama Nedeni:" : "İşlem Açıklaması:"}{" "}
          <span className="text-muted-foreground font-normal">{String(d.reason)}</span>
        </p>
      </div>
    );
  }

  // 7. Kullanıcı Engeli Açıldı / Kapatıldı (reason belirtilmemişse)
  if (act.includes("UNBAN")) {
    return (
      <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium inline-flex items-center gap-1">
        <UserCheckIcon className="size-3.5" />
        Kullanıcının sisteme erişim engeli kaldırıldı.
      </span>
    );
  }

  if (act.includes("BAN")) {
    return (
      <span className="text-xs text-rose-700 dark:text-rose-400 font-medium inline-flex items-center gap-1">
        <UserXIcon className="size-3.5" />
        Kullanıcı sistemden engellendi.
      </span>
    );
  }

  // 8. İçerik / Mesaj Silme
  if (act.includes("DELETE") || act.includes("REMOVE")) {
    return (
      <span className="text-xs text-muted-foreground">
        İlgili içerik veya mesaj sistemden kalıcı olarak silindi.
      </span>
    );
  }

  // 9. Eğer detay yoksa veya boşsa
  if (!d || Object.keys(d).length === 0) {
    return <span className="text-muted-foreground text-xs italic">İşlem başarıyla tamamlandı.</span>;
  }

  // Bilinmeyen alanlar için JSON yerine okunabilir anahtar-değer metni
  const readable = Object.entries(d)
    .filter(([k]) => !["source", "id", "created_at"].includes(k))
    .map(([k, v]) => `${k.replace(/_/g, " ")}: ${typeof v === "object" ? "" : String(v)}`)
    .filter(Boolean);

  if (readable.length > 0) {
    return <span className="text-xs text-foreground/80">{readable.join(" · ")}</span>;
  }

  return <span className="text-muted-foreground text-xs italic">İşlem başarıyla kaydedildi.</span>;
}

export function LogsTab() {
  const { logs, isLoading, isRefetching, isError, refetch } = useAdminLogs(150);
  const [search, setSearch] = React.useState("");
  const [filterType, setFilterType] = React.useState<string>("all");
  const [expandedLogId, setExpandedLogId] = React.useState<string | null>(null);

  const filteredLogs = React.useMemo(() => {
    return logs.filter((log) => {
      const cityId = Number(log.target_id);
      const cityName = !isNaN(cityId) ? CITY_MAP.get(cityId)?.name || "" : "";
      const targetFullName = [log.target_first_name, log.target_last_name].filter(Boolean).join(" ");
      const adminFullName = [log.admin_first_name, log.admin_last_name].filter(Boolean).join(" ");

      const matchSearch =
        search === "" ||
        log.action.toLowerCase().includes(search.toLowerCase()) ||
        (log.admin_email && log.admin_email.toLowerCase().includes(search.toLowerCase())) ||
        adminFullName.toLowerCase().includes(search.toLowerCase()) ||
        targetFullName.toLowerCase().includes(search.toLowerCase()) ||
        (log.target_phone && log.target_phone.includes(search)) ||
        cityName.toLowerCase().includes(search.toLowerCase()) ||
        (log.target_type && log.target_type.toLowerCase().includes(search.toLowerCase())) ||
        (log.details && JSON.stringify(log.details).toLowerCase().includes(search.toLowerCase()));

      const isProfileLog =
        log.target_type === "profile" ||
        log.target_type === "profiles" ||
        log.target_type === "users";

      const matchFilter =
        filterType === "all" ||
        (filterType === "settings" && log.target_type === "settings") ||
        (filterType === "cities" && log.target_type === "cities") ||
        (filterType === "users" && isProfileLog) ||
        (filterType === "moderation" && (log.target_type === "reports" || log.target_type === "messages" || log.action.includes("BAN_APPEAL")));

      return matchSearch && matchFilter;
    });
  }, [logs, search, filterType]);

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat("tr-TR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Üst Bilgi Kartı */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl flex items-center gap-2">
                <HistoryIcon className="size-5 text-primary" />
                Yönetici İşlem Geçmişi (Denetim Logları)
              </CardTitle>
              <Badge variant="outline" className="font-medium text-xs">
                {logs.length} İşlem Kaydı
              </Badge>
            </div>
            <CardDescription className="text-sm">
              Kimin, ne zaman, hangi şehirde veya ayarda ne değişiklik yaptığını anlaşılır Türkçe ifadelerle takip edin.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
            className="gap-2 shrink-0"
          >
            <RefreshCwIcon className={`size-3.5 ${isRefetching ? "animate-spin" : ""}`} />
            Yenile
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Arama & Kategori Filtreleme */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 max-w-sm">
              <SearchIcon className="absolute start-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Şehir adı, e-posta veya işlem ara..."
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
                variant={filterType === "cities" ? "default" : "outline"}
                size="sm"
                className="text-xs h-8"
                onClick={() => setFilterType("cities")}
              >
                Şehir Kontenjanları
              </Button>
              <Button
                variant={filterType === "settings" ? "default" : "outline"}
                size="sm"
                className="text-xs h-8"
                onClick={() => setFilterType("settings")}
              >
                Fiyat & Mod Ayarları
              </Button>
              <Button
                variant={filterType === "users" ? "default" : "outline"}
                size="sm"
                className="text-xs h-8"
                onClick={() => setFilterType("users")}
              >
                Kullanıcı İşlemleri
              </Button>
              <Button
                variant={filterType === "moderation" ? "default" : "outline"}
                size="sm"
                className="text-xs h-8"
                onClick={() => setFilterType("moderation")}
              >
                Moderasyon
              </Button>
            </div>
          </div>

          {/* Log Tablosu */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2">
              <RefreshCwIcon className="size-6 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">İşlem geçmişi yükleniyor...</span>
            </div>
          ) : isError ? (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-6 text-destructive text-sm">
              İşlem geçmişi yüklenirken bir sorun oluştu.
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="rounded-xl border border-dashed p-12 text-center flex flex-col items-center justify-center">
              <HistoryIcon className="size-10 text-muted-foreground/40 mb-3" />
              <h3 className="text-base font-semibold mb-1">
                {logs.length === 0 ? "Henüz Bir İşlem Kaydı Yok" : "Aramaya Uygun Kayıt Bulunamadı"}
              </h3>
              <p className="text-sm text-muted-foreground max-w-md text-balance">
                {logs.length === 0
                  ? "Panelden bir şehrin kontenjanını değiştirdiğinizde veya fiyat güncellediğinizde burada kimin hangi işlemi yaptığı anlaşılır şekilde görünecektir."
                  : "Farklı bir arama terimi yazabilir ya da filtreyi temizleyebilirsiniz."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Mobil Log Kart Listesi (md:hidden) */}
              <div className="grid grid-cols-1 gap-3 md:hidden">
                {filteredLogs.map((log) => {
                  const meta = getActionMeta(log.action);
                  const isExpanded = expandedLogId === log.id;

                  return (
                    <div key={log.id} className="rounded-xl border p-4 bg-card/60 space-y-3 shadow-xs">
                      {/* Üst Satır: Tarih & İşlem Rozeti */}
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <Badge className={`${meta.badgeClass} gap-1.5 px-2.5 py-1 text-xs font-medium`}>
                          {meta.icon}
                          {meta.title}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground font-mono">
                          {formatDate(log.created_at)}
                        </span>
                      </div>

                      {/* İlgili Kullanıcı / Hedef */}
                      <div className="pt-1 text-sm">
                        <span className="text-muted-foreground block text-[11px] mb-0.5">İlgili Hedef</span>
                        {getTargetDisplay(log)}
                      </div>

                      {/* İşlem Özeti */}
                      <div className="pt-2 border-t text-xs space-y-1.5">
                        <span className="text-muted-foreground block text-[11px]">İşlem Özeti</span>
                        {renderHumanDetails(log)}

                        {/* Teknik JSON Detay Butonu */}
                        {log.details && shouldShowTechnicalDetails(log) && (
                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                              className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 underline underline-offset-2"
                            >
                              <EyeIcon className="size-3" />
                              {isExpanded ? "Teknik veriyi gizle" : "Teknik veriyi göster"}
                            </button>
                            {isExpanded && (
                              <pre className="mt-1.5 p-2 rounded-md bg-muted/80 text-[10px] font-mono overflow-x-auto max-h-32 border">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            )}
                          </div>
                        )}
                      </div>

                      {/* İşlemi Yapan Yönetici */}
                      <div className="flex items-center justify-between pt-2 border-t text-[11px] text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {log.admin_first_name || log.admin_last_name
                            ? `${log.admin_first_name || ""} ${log.admin_last_name || ""}`.trim()
                            : log.admin_email || "Sistem / Yönetici"}
                        </span>
                        <span className="font-mono text-[10px]">
                          {log.ip_address ? `IP: ${log.ip_address}` : "Panel"}
                        </span>
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
                      <TableHead className="w-[140px]">Tarih / Saat</TableHead>
                      <TableHead className="w-[190px]">Yapılan İşlem</TableHead>
                      <TableHead className="w-[220px]">İlgili Kullanıcı / Hedef</TableHead>
                      <TableHead>İşlem Özeti (Ne Değişti?)</TableHead>
                      <TableHead className="w-[180px] text-end">Yönetici</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => {
                      const meta = getActionMeta(log.action);
                      const isExpanded = expandedLogId === log.id;

                      return (
                        <TableRow key={log.id} className="hover:bg-muted/20 transition-colors">
                          {/* Tarih */}
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap font-medium">
                            {formatDate(log.created_at)}
                          </TableCell>

                          {/* Yapılan İşlem */}
                          <TableCell>
                            <Badge className={`${meta.badgeClass} gap-1.5 px-2.5 py-1 text-xs font-medium`}>
                              {meta.icon}
                              {meta.title}
                            </Badge>
                          </TableCell>

                          {/* Nerede / Hangi Kullanıcıda Yapıldı */}
                          <TableCell className="text-sm">
                            {getTargetDisplay(log)}
                          </TableCell>

                          {/* Ne Değişti */}
                          <TableCell>
                            <div className="space-y-1.5">
                              {renderHumanDetails(log)}

                              {/* Teknik JSON Detay Butonu (Sadece karmaşık ve ek teknik alan varsa göster) */}
                              {log.details && shouldShowTechnicalDetails(log) && (
                                <div>
                                  <button
                                    type="button"
                                    onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                                    className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 underline underline-offset-2"
                                  >
                                    <EyeIcon className="size-3" />
                                    {isExpanded ? "Teknik veriyi gizle" : "Teknik veriyi göster"}
                                  </button>
                                  {isExpanded && (
                                    <pre className="mt-1.5 p-2 rounded-md bg-muted/80 text-[11px] font-mono overflow-x-auto max-h-32 border">
                                      {JSON.stringify(log.details, null, 2)}
                                    </pre>
                                  )}
                                </div>
                              )}
                            </div>
                          </TableCell>

                          {/* İşlemi Yapan Yönetici */}
                          <TableCell className="text-end">
                            <div className="flex flex-col items-end gap-0.5">
                              <span className="text-xs font-semibold text-foreground">
                                {log.admin_first_name || log.admin_last_name
                                  ? `${log.admin_first_name || ""} ${log.admin_last_name || ""}`.trim()
                                  : log.admin_email || "Sistem / Yönetici"}
                              </span>
                              {log.admin_email && (log.admin_first_name || log.admin_last_name) && (
                                <span className="text-[11px] text-muted-foreground">
                                  {log.admin_email}
                                </span>
                              )}
                              <span className="text-[10px] text-muted-foreground font-mono">
                                {log.ip_address ? `IP: ${log.ip_address}` : "Panel üzerinden"}
                              </span>
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
    </div>
  );
}
