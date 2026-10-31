"use client";

import * as React from "react";
import { useUsers } from "@/hooks/useUsers";
import type { AdminUser } from "@/api/usersApi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  SearchIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  UserCheckIcon,
  UserXIcon,
  CalendarPlusIcon,
  CrownIcon,
  RefreshCwIcon,
  PhoneIcon,
  ClockIcon,
} from "lucide-react";

export function UsersTab() {
  const [searchTerm, setSearchTerm] = React.useState("");
  const {
    users,
    isLoading,
    toggleBan,
    isTogglingBan,
    grantSubscription,
    isGranting,
    extendSubscription,
    isExtending,
  } = useUsers(searchTerm);

  // Dialog State for Granting Subscription
  const [grantDialogUser, setGrantDialogUser] = React.useState<AdminUser | null>(null);
  const [selectedPlan, setSelectedPlan] = React.useState<"monthly" | "yearly">("monthly");
  const [customDays, setCustomDays] = React.useState<number>(30);

  // Dialog State for Extending Subscription
  const [extendDialogUser, setExtendDialogUser] = React.useState<AdminUser | null>(null);
  const [extendDays, setExtendDays] = React.useState<number>(30);

  const handleOpenGrant = (user: AdminUser) => {
    setGrantDialogUser(user);
    setSelectedPlan("monthly");
    setCustomDays(30);
  };

  const handleConfirmGrant = () => {
    if (!grantDialogUser) return;
    grantSubscription({
      userId: grantDialogUser.id,
      plan: selectedPlan,
      durationDays: selectedPlan === "yearly" ? 365 : customDays,
    });
    setGrantDialogUser(null);
  };

  const handleOpenExtend = (user: AdminUser) => {
    setExtendDialogUser(user);
    setExtendDays(30);
  };

  const handleConfirmExtend = () => {
    if (!extendDialogUser || !extendDialogUser.subscription_id) return;
    extendSubscription({
      subscriptionId: extendDialogUser.subscription_id,
      additionalDays: extendDays,
    });
    setExtendDialogUser(null);
  };

  // Dialog State for Banning User
  const [banDialogUser, setBanDialogUser] = React.useState<AdminUser | null>(null);
  const [banReason, setBanReason] = React.useState<string>("Topluluk kurallarını ihlal");

  const handleBanClick = (user: AdminUser) => {
    if (user.is_banned) {
      // Unban directly
      toggleBan({ userId: user.id, isBanned: false });
    } else {
      setBanDialogUser(user);
      setBanReason("Topluluk kurallarını ihlal (Spam veya kural dışı davranış)");
    }
  };

  const handleConfirmBan = () => {
    if (!banDialogUser) return;
    toggleBan({
      userId: banDialogUser.id,
      isBanned: true,
      reason: banReason.trim() || "Topluluk kurallarını ihlal",
    });
    setBanDialogUser(null);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4">
          <div>
            <CardTitle className="text-xl">4. Kullanıcı Yönetimi</CardTitle>
            <CardDescription>
              Üye arama ve hesap banlama / kaldırma işlemleri.
            </CardDescription>
          </div>
          <div className="relative w-full md:w-80">
            <SearchIcon className="absolute start-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="İsim, soyisim veya telefon ile ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="ps-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCwIcon className="size-6 animate-spin text-muted-foreground" />
              <span className="ms-2 text-sm text-muted-foreground">Kullanıcılar aranıyor...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Mobil Kart Görünümü (md:hidden) */}
              <div className="grid grid-cols-1 gap-3 md:hidden">
                {users.map((user) => {
                  const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim() || "İsimsiz Kullanıcı";
                  const hasActiveSub =
                    user.subscription_status === "active" &&
                    user.subscription_expires_at &&
                    new Date(user.subscription_expires_at) > new Date();

                  return (
                    <div key={user.id} className="rounded-xl border p-4 bg-card/60 space-y-3 shadow-xs">
                      {/* Üst Satır: Avatar, İsim & Durum */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm uppercase">
                            {user.first_name?.[0] || "U"}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-foreground flex items-center gap-1.5 flex-wrap">
                              <span className="truncate">{fullName}</span>
                              {user.role === "admin" && (
                                <Badge variant="outline" className="text-[10px] py-0 px-1 border-primary text-primary">
                                  ADMIN
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground font-mono truncate max-w-[180px]">
                              {user.id}
                            </div>
                          </div>
                        </div>

                        {/* Ban / Aktif Rozeti */}
                        <div className="shrink-0">
                          {user.is_banned ? (
                            <Badge variant="destructive" className="gap-1 text-xs">
                              <ShieldAlertIcon className="size-3" /> Banlı
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1 text-xs text-emerald-600 border-emerald-500/30">
                              <ShieldCheckIcon className="size-3" /> Aktif
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Bilgiler: Telefon & Abonelik & Kayıt */}
                      <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t">
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Telefon</span>
                          {user.phone ? (
                            <span className="font-mono text-foreground font-medium flex items-center gap-1 pt-0.5">
                              <PhoneIcon className="size-3 text-muted-foreground" />
                              {user.phone}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/60">-</span>
                          )}
                        </div>

                        <div>
                          <span className="text-muted-foreground block text-[11px]">Kayıt Tarihi</span>
                          <span className="text-foreground pt-0.5 block">
                            {new Date(user.created_at).toLocaleDateString("tr-TR")}
                          </span>
                        </div>

                        <div className="col-span-2 pt-1">
                          <span className="text-muted-foreground block text-[11px] mb-1">Abonelik Durumu</span>
                          {hasActiveSub ? (
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge className="bg-primary/90 text-primary-foreground gap-1 text-xs">
                                <CrownIcon className="size-3" />
                                {user.subscription_plan === "yearly" ? "Yıllık Plan" : "Aylık Plan"}
                              </Badge>
                              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <ClockIcon className="size-3" />
                                Bitiş: {new Date(user.subscription_expires_at!).toLocaleDateString("tr-TR")}
                              </span>
                            </div>
                          ) : (
                            <Badge variant="secondary" className="text-xs text-muted-foreground">
                              Abonelik Yok
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Aksiyon Butonları (Mobilde dokunmatik) */}
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
                        <Button
                          size="sm"
                          variant={user.is_banned ? "outline" : "ghost"}
                          className={`flex-1 text-xs h-9 ${user.is_banned ? "text-emerald-600 hover:text-emerald-700" : "text-destructive hover:bg-destructive/10"}`}
                          onClick={() => handleBanClick(user)}
                          disabled={isTogglingBan}
                        >
                          {user.is_banned ? (
                            <>
                              <UserCheckIcon className="size-3.5 me-1.5" /> Ban Kaldır
                            </>
                          ) : (
                            <>
                              <UserXIcon className="size-3.5 me-1.5" /> Banla
                            </>
                          )}
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenGrant(user)}
                          disabled={isGranting}
                          className="flex-1 text-xs h-9"
                        >
                          <CrownIcon className="size-3.5 me-1.5 text-amber-500" />
                          Abonelik
                        </Button>

                        {user.subscription_id && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleOpenExtend(user)}
                            disabled={isExtending}
                            className="w-full text-xs h-9"
                          >
                            <CalendarPlusIcon className="size-3.5 me-1.5" />
                            Süreyi Uzat
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Masaüstü Tablo Görünümü (hidden md:block) */}
              <div className="hidden md:block rounded-md border overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b">
                    <tr>
                      <th className="p-3">Kullanıcı</th>
                      <th className="p-3">Telefon</th>
                      <th className="p-3">Durum</th>
                      <th className="p-3">Abonelik Durumu</th>
                      <th className="p-3">Kayıt Tarihi</th>
                      <th className="p-3 text-end">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {users.map((user) => {
                      const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim() || "İsimsiz Kullanıcı";
                      const hasActiveSub =
                        user.subscription_status === "active" &&
                        user.subscription_expires_at &&
                        new Date(user.subscription_expires_at) > new Date();

                      return (
                        <tr key={user.id} className="hover:bg-muted/20 transition-colors">
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs uppercase">
                                {user.first_name?.[0] || "U"}
                              </div>
                              <div>
                                <div className="font-medium text-foreground flex items-center gap-1.5">
                                  {fullName}
                                  {user.role === "admin" && (
                                    <Badge variant="outline" className="text-[10px] py-0 px-1 border-primary text-primary">
                                      ADMIN
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground font-mono truncate max-w-[140px]">
                                  {user.id}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="p-3 font-mono text-xs text-muted-foreground">
                            {user.phone ? (
                              <span className="flex items-center gap-1">
                                <PhoneIcon className="size-3 text-muted-foreground" />
                                {user.phone}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/60">-</span>
                            )}
                          </td>

                          <td className="p-3">
                            {user.is_banned ? (
                              <Badge variant="destructive" className="gap-1 text-xs">
                                <ShieldAlertIcon className="size-3" /> Banlı
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="gap-1 text-xs text-emerald-600 border-emerald-500/30">
                                <ShieldCheckIcon className="size-3" /> Aktif
                              </Badge>
                            )}
                          </td>

                          <td className="p-3">
                            {hasActiveSub ? (
                              <div className="space-y-0.5">
                                <Badge className="bg-primary/90 text-primary-foreground gap-1 text-xs">
                                  <CrownIcon className="size-3" />
                                  {user.subscription_plan === "yearly" ? "Yıllık Plan" : "Aylık Plan"}
                                </Badge>
                                <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                                  <ClockIcon className="size-3" />
                                  Bitiş: {new Date(user.subscription_expires_at!).toLocaleDateString("tr-TR")}
                                </div>
                              </div>
                            ) : (
                              <Badge variant="secondary" className="text-xs text-muted-foreground">
                                Abonelik Yok
                              </Badge>
                            )}
                          </td>

                          <td className="p-3 text-xs text-muted-foreground">
                            {new Date(user.created_at).toLocaleDateString("tr-TR")}
                          </td>

                          <td className="p-3 text-end">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Ban / Unban Button */}
                              <Button
                                size="sm"
                                variant={user.is_banned ? "outline" : "ghost"}
                                className={user.is_banned ? "text-emerald-600 hover:text-emerald-700" : "text-destructive hover:bg-destructive/10"}
                                onClick={() => handleBanClick(user)}
                                disabled={isTogglingBan}
                                title={user.is_banned ? "Banı Kaldır" : "Kullanıcıyı Banla"}
                              >
                                {user.is_banned ? (
                                  <>
                                    <UserCheckIcon className="size-3.5 me-1" /> Ban Kaldır
                                  </>
                                ) : (
                                  <>
                                    <UserXIcon className="size-3.5 me-1" /> Banla
                                  </>
                                )}
                              </Button>

                              {/* Manuel Abonelik Tanımla */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenGrant(user)}
                                disabled={isGranting}
                                className="text-xs"
                              >
                                <CrownIcon className="size-3.5 me-1 text-amber-500" />
                                Abonelik Tanımla
                              </Button>

                              {/* Abonelik Süresini Uzat */}
                              {user.subscription_id && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => handleOpenExtend(user)}
                                  disabled={isExtending}
                                  className="text-xs"
                                >
                                  <CalendarPlusIcon className="size-3.5 me-1" />
                                  Süre Uzat
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {users.length === 0 && (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  Aramanızla eşleşen kullanıcı bulunamadı.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODAL 1: Manuel Abonelik Tanımlama */}
      <Dialog open={Boolean(grantDialogUser)} onOpenChange={(open) => !open && setGrantDialogUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CrownIcon className="size-5 text-amber-500" />
              Manuel Abonelik Tanımla
            </DialogTitle>
            <DialogDescription>
              {grantDialogUser ? `${grantDialogUser.first_name || ""} ${grantDialogUser.last_name || ""}` : ""} adlı
              kullanıcıya ücretsiz manuel abonelik paketi atayın.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Abonelik Planı</label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant={selectedPlan === "monthly" ? "default" : "outline"}
                  onClick={() => {
                    setSelectedPlan("monthly");
                    setCustomDays(30);
                  }}
                  className="w-full flex-col h-auto py-3"
                >
                  <span className="font-bold">Aylık Paket</span>
                  <span className="text-xs opacity-80">30 Günlük Erişim</span>
                </Button>
                <Button
                  type="button"
                  variant={selectedPlan === "yearly" ? "default" : "outline"}
                  onClick={() => {
                    setSelectedPlan("yearly");
                    setCustomDays(365);
                  }}
                  className="w-full flex-col h-auto py-3"
                >
                  <span className="font-bold">Yıllık Paket</span>
                  <span className="text-xs opacity-80">365 Günlük Erişim</span>
                </Button>
              </div>
            </div>

            {selectedPlan === "monthly" && (
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Geçerlilik Süresi (Gün)</label>
                <Input
                  type="number"
                  min="1"
                  max="120"
                  value={customDays}
                  onChange={(e) => setCustomDays(parseInt(e.target.value, 10) || 30)}
                />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setGrantDialogUser(null)}>
              Vazgeç
            </Button>
            <Button onClick={handleConfirmGrant} disabled={isGranting}>
              {isGranting && <RefreshCwIcon className="size-4 animate-spin me-2" />}
              Aboneliği Tanımla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: Mevcut Aboneliği Uzatma */}
      <Dialog open={Boolean(extendDialogUser)} onOpenChange={(open) => !open && setExtendDialogUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarPlusIcon className="size-5 text-primary" />
              Abonelik Süresini Uzat
            </DialogTitle>
            <DialogDescription>
              Ödemesi takılan veya hediye süre verilen kullanıcı için mevcut aboneliği uzatın.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Uzatılacak Süre Seçin</label>
              <div className="grid grid-cols-4 gap-2">
                {[7, 30, 90, 365].map((days) => (
                  <Button
                    key={days}
                    type="button"
                    variant={extendDays === days ? "default" : "outline"}
                    onClick={() => setExtendDays(days)}
                    className="text-xs py-2"
                  >
                    +{days} Gün
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Özel Gün Sayısı</label>
              <Input
                type="number"
                min="1"
                max="730"
                value={extendDays}
                onChange={(e) => setExtendDays(parseInt(e.target.value, 10) || 30)}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setExtendDialogUser(null)}>
              Vazgeç
            </Button>
            <Button onClick={handleConfirmExtend} disabled={isExtending}>
              {isExtending && <RefreshCwIcon className="size-4 animate-spin me-2" />}
              Süreyi Uzat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: Kullanıcıyı Banlama (Gerekçe ile) */}
      <Dialog open={Boolean(banDialogUser)} onOpenChange={(open) => !open && setBanDialogUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <UserXIcon className="size-5" />
              Kullanıcıyı Yasakla (Askıya Al)
            </DialogTitle>
            <DialogDescription>
              {banDialogUser ? `${banDialogUser.first_name || ""} ${banDialogUser.last_name || ""}` : ""} adlı kullanıcının
              mobil uygulamaya erişimi kısıtlanacaktır. Belirttiğiniz gerekçe kullanıcının ban ekranında gösterilecektir.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Hızlı Gerekçe Şablonları</label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "Spam & Reklam Paylaşımı",
                  "Uygunsuz Dil / Hakaret",
                  "Dolandırıcılık Şüphesi",
                  "Kurallara Aykırı İlan",
                  "Topluluk Kurallarını İhlal",
                ].map((reason) => (
                  <Button
                    key={reason}
                    type="button"
                    variant={banReason === reason ? "default" : "outline"}
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => setBanReason(reason)}
                  >
                    {reason}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Askıya Alınma Nedeni (Detaylı)</label>
              <Input
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Örn: Uygunsuz davranış ve spam mesaj gönderimi"
                className="text-sm"
              />
              <p className="text-[11px] text-muted-foreground">
                Kullanıcı bu açıklamayı mobil uygulamasındaki "Askıya Alındı" ekranında okuyacaktır.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setBanDialogUser(null)}>
              Vazgeç
            </Button>
            <Button variant="destructive" onClick={handleConfirmBan} disabled={isTogglingBan}>
              {isTogglingBan && <RefreshCwIcon className="size-4 animate-spin me-2" />}
              Kullanıcıyı Yasakla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
