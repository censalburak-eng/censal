"use client";

import * as React from "react";
import { useModeration } from "@/hooks/useModeration";
import { useUsers } from "@/hooks/useUsers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ShieldAlertIcon,
  Trash2Icon,
  CheckCircle2Icon,
  Volume2Icon,
  ImageIcon,
  MessageSquareIcon,
  PinIcon,
  PlusIcon,
  XIcon,
  UserXIcon,
  UserCheckIcon,
  RefreshCwIcon,
  MapPinIcon,
  ClockIcon,
  PhoneIcon,
} from "lucide-react";

export function ModerationTab() {
  const {
    reports,
    isLoadingReports,
    bannedWords,
    isLoadingWords,
    pinnedListings,
    isLoadingPins,
    resolveReport,
    isResolvingReport,
    deleteMessage,
    isDeletingMessage,
    addBannedWord,
    isAddingWord,
    deleteBannedWord,
    isDeletingWord,
    cancelPin,
    isCancelingPin,
    appeals,
    isLoadingAppeals,
    reviewAppeal,
    isReviewingAppeal,
  } = useModeration();

  const { toggleBan, isTogglingBan } = useUsers();

  const [activeSection, setActiveSection] = React.useState<"reports" | "bannedWords" | "pins" | "appeals">("reports");
  const [newWord, setNewWord] = React.useState("");

  const pendingAppealsCount = appeals.filter((a) => a.status === "pending").length;

  const handleAddWord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWord.trim()) return;
    addBannedWord(newWord.trim());
    setNewWord("");
  };

  const reasonLabels: Record<string, string> = {
    inappropriate: "Uygunsuz İçerik",
    harassment: "Taciz / Hakaret",
    spam: "Spam / Reklam",
    fraud: "Dolandırıcılık / Sahtekarlık",
  };

  return (
    <div className="space-y-6">
      {/* Moderasyon Üst Sekmeleri */}
      <div className="flex flex-wrap border-b pb-2 gap-2">
        <Button
          variant={activeSection === "reports" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveSection("reports")}
          className="gap-2"
        >
          <ShieldAlertIcon className="size-4" />
          Şikayetler & İhbarlar ({reports.length})
        </Button>
        <Button
          variant={activeSection === "appeals" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveSection("appeals")}
          className="gap-2"
        >
          <UserCheckIcon className="size-4" />
          Ban Açtırma Talepleri ({pendingAppealsCount > 0 ? `${pendingAppealsCount} Bekleyen` : appeals.length})
        </Button>
        <Button
          variant={activeSection === "bannedWords" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveSection("bannedWords")}
          className="gap-2"
        >
          <XIcon className="size-4" />
          Yasaklı Kelime Listesi ({bannedWords.length})
        </Button>
        <Button
          variant={activeSection === "pins" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveSection("pins")}
          className="gap-2"
        >
          <PinIcon className="size-4" />
          Aktif Sabit İlanlar ({pinnedListings.length})
        </Button>
      </div>

      {/* BÖLÜM 1: ŞİKAYETLER */}
      {activeSection === "reports" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Şikayet Edilen Mesajlar ve İçerikler</CardTitle>
            <CardDescription>
              Kullanıcılar tarafından bildirilen metin, görsel ve ses kayıtlarını inceleyin, silin ve kullanıcıyı banlayın.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingReports ? (
              <div className="flex items-center justify-center py-20">
                <RefreshCwIcon className="size-6 animate-spin text-muted-foreground" />
                <span className="ms-2 text-sm text-muted-foreground">Şikayetler yükleniyor...</span>
              </div>
            ) : reports.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Henüz bekleyen veya incelenmemiş bir şikayet bulunmuyor.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {reports.map((rep) => {
                  const isResolved = rep.status === "resolved" || rep.status === "dismissed";

                  return (
                    <div
                      key={rep.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isResolved ? "opacity-60 bg-muted/30" : "bg-card border-destructive/20 shadow-xs"
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant={isResolved ? "outline" : "destructive"} className="text-xs">
                              {reasonLabels[rep.reason] || rep.reason}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              Oda #{rep.room_id || "Genel"}
                            </span>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-xs text-muted-foreground font-mono">
                              {new Date(rep.created_at).toLocaleString("tr-TR")}
                            </span>
                            {rep.status && (
                              <Badge variant="secondary" className="text-[10px] uppercase">
                                {rep.status}
                              </Badge>
                            )}
                          </div>

                          <div className="text-xs text-muted-foreground pt-1">
                            <span className="font-semibold text-foreground">Şikayet Eden:</span>{" "}
                            {rep.reporter_name || "Anonim"} &nbsp;|&nbsp;{" "}
                            <span className="font-semibold text-foreground">Şikayet Edilen:</span>{" "}
                            {rep.reported_user_name || "Bilinmiyor"}
                          </div>
                        </div>

                        {/* Aksiyon Butonları */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {rep.reported_user_id && (
                            <Button
                              size="sm"
                              variant={rep.reported_user_banned ? "outline" : "destructive"}
                              className="text-xs h-8"
                              onClick={() =>
                                toggleBan({
                                  userId: rep.reported_user_id!,
                                  isBanned: !rep.reported_user_banned,
                                })
                              }
                              disabled={isTogglingBan}
                            >
                              {rep.reported_user_banned ? (
                                <>
                                  <UserCheckIcon className="size-3.5 me-1" /> Ban Kaldır
                                </>
                              ) : (
                                <>
                                  <UserXIcon className="size-3.5 me-1" /> Kullanıcıyı Banla
                                </>
                              )}
                            </Button>
                          )}

                          {rep.message_id && !rep.message_is_deleted && (
                            <Button
                              size="sm"
                              variant="destructive"
                              className="text-xs h-8"
                              onClick={() => deleteMessage(rep.message_id!)}
                              disabled={isDeletingMessage}
                            >
                              <Trash2Icon className="size-3.5 me-1" /> Mesajı Sil
                            </Button>
                          )}

                          {!isResolved && (
                            <>
                              <Button
                                size="sm"
                                variant="default"
                                className="text-xs h-8"
                                onClick={() =>
                                  resolveReport({
                                    reportId: rep.id,
                                    status: "resolved",
                                    deleteMessage: true,
                                    messageId: rep.message_id || undefined,
                                  })
                                }
                                disabled={isResolvingReport}
                              >
                                <CheckCircle2Icon className="size-3.5 me-1" /> Sil & Çöz
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-8"
                                onClick={() =>
                                  resolveReport({
                                    reportId: rep.id,
                                    status: "dismissed",
                                  })
                                }
                                disabled={isResolvingReport}
                              >
                                İhlal Yok (Kapat)
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Mesaj İçerik Önizlemesi */}
                      <div className="mt-3 p-3 rounded-lg bg-muted/40 border border-muted text-sm space-y-1.5">
                        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                          {rep.message_type === "image" && (
                            <>
                              <ImageIcon className="size-3.5 text-blue-500" /> Resim Mesajı
                            </>
                          )}
                          {rep.message_type === "audio" && (
                            <>
                              <Volume2Icon className="size-3.5 text-amber-500" /> Ses Kaydı Mesajı
                            </>
                          )}
                          {rep.message_type === "text" && (
                            <>
                              <MessageSquareIcon className="size-3.5 text-emerald-500" /> Metin Mesajı
                            </>
                          )}
                          {rep.message_is_deleted && (
                            <Badge variant="destructive" className="text-[10px] py-0 px-1">
                              SİLİNMİŞ İÇERİK
                            </Badge>
                          )}
                        </div>

                        {rep.message_body && (
                          <div className="text-foreground font-medium break-words max-h-32 overflow-y-auto">
                            "{rep.message_body}"
                          </div>
                        )}

                        {rep.details && (
                          <div className="text-xs text-muted-foreground italic">
                            İhbar Detayı: {rep.details}
                          </div>
                        )}

                        {rep.message_type === "image" && rep.message_media_key && (
                          <div className="text-xs font-mono text-muted-foreground">
                            Görsel Anahtarı: {rep.message_media_key}
                          </div>
                        )}

                        {rep.message_type === "audio" && (
                          <div className="text-xs font-mono text-muted-foreground">
                            Ses Süresi: {rep.message_duration_sec ? `${rep.message_duration_sec} sn` : "Belirtilmemiş"}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* BÖLÜM 2: YASAKLI KELİMELER */}
      {activeSection === "bannedWords" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Yasaklı Kelime Listesi Yönetimi</CardTitle>
            <CardDescription>
              Mesajlarda filtrelenecek ve engellenecek yasaklı kelimeleri panelden ekleyin veya çıkarın.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleAddWord} className="flex gap-2 max-w-md">
              <Input
                type="text"
                placeholder="Yeni yasaklı kelime yazın..."
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
                required
              />
              <Button type="submit" disabled={isAddingWord || !newWord.trim()} className="gap-1.5 shrink-0">
                <PlusIcon className="size-4" /> Kelime Ekle
              </Button>
            </form>

            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase mb-3">
                Kayıtlı Yasaklı Kelimeler ({bannedWords.length})
              </div>
              {isLoadingWords ? (
                <div className="flex items-center justify-center py-10">
                  <RefreshCwIcon className="size-5 animate-spin text-muted-foreground" />
                </div>
              ) : bannedWords.length === 0 ? (
                <div className="text-sm text-muted-foreground">Henüz yasaklı kelime eklenmemiş.</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {bannedWords.map((word) => (
                    <span
                      key={word}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/15 transition-colors"
                    >
                      {word}
                      <button
                        type="button"
                        onClick={() => deleteBannedWord(word)}
                        disabled={isDeletingWord}
                        className="size-4 rounded-full flex items-center justify-center hover:bg-destructive/30"
                        title="Kelimeyi Sil"
                      >
                        <XIcon className="size-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* BÖLÜM 3: ODA BAZLI SABİT İLANLAR */}
      {activeSection === "pins" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Oda Bazlı Aktif Sabit İlanlar</CardTitle>
            <CardDescription>
              Şehir odalarında o anda vitrinde bulunan sabit ilanları inceleyin ve gerekirse yayından kaldırın.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingPins ? (
              <div className="flex items-center justify-center py-20">
                <RefreshCwIcon className="size-6 animate-spin text-muted-foreground" />
                <span className="ms-2 text-sm text-muted-foreground">Sabit ilanlar yükleniyor...</span>
              </div>
            ) : pinnedListings.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Şu anda odalarda aktif sabit ilan bulunmamaktadır.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pinnedListings.map((pin) => {
                  const isActive = pin.status === "active";
                  const expires = pin.expires_at ? new Date(pin.expires_at) : null;
                  const isExpired = expires ? expires < new Date() : false;

                  return (
                    <div
                      key={pin.id}
                      className={`p-4 rounded-xl border flex flex-col justify-between gap-3 ${
                        isActive && !isExpired
                          ? "border-primary/30 bg-primary/5"
                          : "border-muted bg-muted/20 opacity-70"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between pb-2 border-b">
                          <div className="flex items-center gap-2">
                            <MapPinIcon className="size-4 text-primary" />
                            <span className="font-bold text-sm">{pin.city_name}</span>
                          </div>
                          <Badge variant={isActive && !isExpired ? "default" : "secondary"} className="text-xs">
                            {isActive && !isExpired ? "Vitrinde Aktif" : pin.status}
                          </Badge>
                        </div>

                        <div className="mt-2 text-xs text-muted-foreground space-y-1">
                          <div>
                            <span className="font-semibold text-foreground">İlan Sahibi:</span>{" "}
                            {pin.user_name || "Kullanıcı"} ({pin.user_phone || "No yok"})
                          </div>
                          {expires && (
                            <div className="flex items-center gap-1 font-mono text-[11px]">
                              <ClockIcon className="size-3" /> Bitiş:{" "}
                              {expires.toLocaleString("tr-TR")}
                            </div>
                          )}
                        </div>

                        {pin.message_body && (
                          <div className="mt-2.5 p-2 rounded bg-background border text-xs text-foreground font-medium">
                            "{pin.message_body}"
                          </div>
                        )}
                      </div>

                      <div className="pt-2 flex justify-end">
                        {isActive && !isExpired && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => cancelPin(pin.id)}
                            disabled={isCancelingPin}
                            className="text-xs gap-1"
                          >
                            <Trash2Icon className="size-3.5" /> Sabitlemeyi Kaldır
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* BÖLÜM 4: BAN AÇTIRMA TALEPLERİ */}
      {activeSection === "appeals" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <UserCheckIcon className="size-5 text-primary" />
                  Hesap Askıya Alma İtirazları & Ban Açtırma Talepleri
                </CardTitle>
                <CardDescription>
                  Mobil uygulamadan banlanan kullanıcıların ilettiği itiraz açıklamalarını inceleyin. Mesajı uygun bulursanız banı tek tıkla kaldırabilir, uygun bulmazsanız talebi reddedebilirsiniz.
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs font-mono">
                {appeals.length} Toplam Talep
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingAppeals ? (
              <div className="flex items-center justify-center py-20">
                <RefreshCwIcon className="size-6 animate-spin text-muted-foreground" />
                <span className="ms-2 text-sm text-muted-foreground">İtiraz talepleri yükleniyor...</span>
              </div>
            ) : appeals.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Henüz yöneticilere iletilmiş bir ban açtırma / itiraz mesajı bulunmuyor.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {appeals.map((appeal) => {
                  const isPending = appeal.status === "pending";
                  const isResolved = appeal.status === "resolved";

                  return (
                    <div
                      key={appeal.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isPending
                          ? "bg-amber-500/5 border-amber-500/30"
                          : isResolved
                          ? "bg-emerald-500/5 border-emerald-500/20"
                          : "bg-muted/20 border-border"
                      }`}
                    >
                      {/* Üst Bilgiler */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b">
                        <div className="flex items-center gap-2.5">
                          <div className="size-9 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm">
                            {appeal.user_name ? appeal.user_name.charAt(0).toUpperCase() : "U"}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-foreground">
                                {appeal.user_name || "Kullanıcı"}
                              </span>
                              {appeal.user_phone && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <PhoneIcon className="size-3" />
                                  {appeal.user_phone}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-muted-foreground font-mono">
                              Kullanıcı ID: {appeal.user_id.slice(0, 8)}...
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {/* İtiraz Sayısı */}
                          <Badge variant="outline" className="text-xs font-mono">
                            {appeal.appeal_count}/2 İtiraz
                          </Badge>

                          {/* Durum Rozeti */}
                          {isPending ? (
                            <Badge className="bg-amber-600 hover:bg-amber-700 text-white text-xs">
                              İnceleme Bekliyor
                            </Badge>
                          ) : isResolved ? (
                            <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                              Onaylandı (Banı Açıldı)
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              Reddedildi
                            </Badge>
                          )}

                          <span className="text-xs text-muted-foreground font-mono">
                            {new Date(appeal.created_at).toLocaleString("tr-TR")}
                          </span>
                        </div>
                      </div>

                      {/* İçerik Kutuları */}
                      <div className="py-3 space-y-2.5">
                        {/* 1. Neden Banlanmıştı? */}
                        <div className="flex items-start gap-2 text-xs">
                          <span className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider mt-0.5 shrink-0">
                            Yasaklanma Gerekçesi:
                          </span>
                          <span className="text-destructive font-medium bg-destructive/10 px-2 py-0.5 rounded border border-destructive/20">
                            {appeal.ban_reason || "Topluluk kurallarını ihlal"}
                          </span>
                        </div>

                        {/* 2. Kullanıcının Ban Açtırma Mesajı */}
                        <div className="p-3 rounded-lg bg-background border space-y-1">
                          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                            Kullanıcının Ban Açtırma / Savunma Mesajı:
                          </span>
                          <p className="text-sm text-foreground font-medium whitespace-pre-wrap leading-relaxed break-words max-h-48 overflow-y-auto">
                            "{appeal.message}"
                          </p>
                        </div>

                        {/* 3. Varsa Yönetici Yanıtı */}
                        {appeal.admin_reply && (
                          <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/20 text-xs text-primary space-y-0.5">
                            <span className="font-semibold uppercase text-[10px] tracking-wider">İletilen Yönetici Yanıtı:</span>
                            <p className="text-foreground/90">{appeal.admin_reply}</p>
                          </div>
                        )}
                      </div>

                      {/* Aksiyon Butonları */}
                      <div className="pt-3 border-t flex flex-wrap items-center justify-between gap-2">
                        <div>
                          {appeal.is_banned ? (
                            <span className="text-xs font-semibold text-destructive flex items-center gap-1">
                              <UserXIcon className="size-3.5" /> Kullanıcı şu an sistemde BANLI
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                              <CheckCircle2Icon className="size-3.5" /> Kullanıcının yasağı aktif değil (Açık)
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Banı Kaldır & Onayla Butonu */}
                          {appeal.is_banned && (
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
                              disabled={isReviewingAppeal}
                              onClick={() =>
                                reviewAppeal({
                                  appealId: appeal.id,
                                  userId: appeal.user_id,
                                  action: "approve",
                                })
                              }
                            >
                              <UserCheckIcon className="size-4" />
                              Banı Kaldır & İtirazı Onayla
                            </Button>
                          )}

                          {/* İtirazı Reddet Butonu */}
                          {isPending && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive hover:bg-destructive/10 text-xs gap-1.5"
                              disabled={isReviewingAppeal}
                              onClick={() =>
                                reviewAppeal({
                                  appealId: appeal.id,
                                  userId: appeal.user_id,
                                  action: "reject",
                                })
                              }
                            >
                              <XIcon className="size-4" />
                              İtirazı Reddet
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
