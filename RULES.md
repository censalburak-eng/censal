# RULES.md — 81 Şehir Odası Proje Kuralları

> Bu dosya projenin tek kural kaynağı. Kod yazan herkes (ve AI asistanlar) önce bunu okur.
> Kapsam: **Mobil (Expo / React Native)** + **Admin paneli (Next.js)** + **Supabase**. Monorepo yok: `mobile` ve `admin` iki ayrı, bağımsız klasör/proje.
> **Diller: Türkçe (`tr`) + Arapça (`ar`).** Arapça = RTL. Bkz. [Bölüm 7.6](#76-çok-dillilik-tr--ar-ve-rtl).
> **Yayın: App Store (iOS) + Google Play (Android).** Her kod iki platformda ve iki mağazanın kurallarına uygun yazılır. Bkz. Bölüm 15.
> **Ödeme entegrasyonları (Apple IAP, Google Billing, PayTR/iyzico, Paycell) şimdilik KAPSAM DIŞI.** Bkz. [Bölüm 11](#11-ödeme--şimdilik-kapsam-dışı).

---

## 0. Altın Kurallar

1. **Önce tip güvenliği:** `any` yasak. `unknown` + zod ile daralt.
2. **Güvenlik sunucuda:** Rate limit, kelime filtresi, 3 sabit ilan limiti, 30 gün temizlik, yetki kontrolü → hep Supabase tarafında (RLS / RPC / Edge Function / cron). İstemci sadece gösterir.
3. **Komponent tek işli olsun, basit kalsın:** Bir dosya ~250 satırı geçerse ya da birbirinden bağımsız birden fazla iş yapıyorsa (örn. hem liste hem modal hem form) ayrı dosyalara böl. Bunun altında bölme; gereksiz parçalama yok.
4. **Switch-case yerine handler-map (object map)** kullan. (Bkz. [Bölüm 6](#6-kod-stili))
5. **Her ekran 4 durumu karşılar:** loading, error, empty, success.
6. **Hardcoded renk / boşluk / metin yok.** Renk `useTheme().colors`'tan, boşluk/radius/font `tokens`'tan, metin `i18n`'den gelir. **Her metin hem `tr` hem `ar` dosyasında olur; yön (sol/sağ) hardcode edilmez** (RTL).
7. **Stil dosyası yok, `style` prop kullan.** `.styles.ts` ve `makeStyles` yazma; stiller JSX içinde `style={{ ... }}` ile verilir. (Bkz. [Bölüm 6.1](#61-stil-yazımı-style-prop))
8. **Bitirmeden bırakma:** Kod yazımı bitince [Bölüm 9](#9-bitirme-kontrol-listesi-definition-of-done) çalışır (TS kontrolü dahil).
9. **Supabase erişimi kontrollü:** DB'ye erişimi olan herkes (AI asistanlar dahil) [Bölüm 4.4](#44-supabase-erişim-kuralları)'e uyar. Şema değişikliği sadece migration ile; yıkıcı işlem onaysız yapılmaz.
10. **Tahmin yok, MCP'den doğrula:** DB şeması için **Supabase MCP**, kütüphane/framework API'si için **Context7 MCP** kullanılır. Bkz. [Bölüm 3.1](#31-mcp-araçları-ai-asistanlar).
11. **İki platform, iki mağaza:** Her özellik iOS'ta ve Android'de çalışacak şekilde yazılır; platforma özel kod `Platform.select` ile (object map) ayrılır. Mağaza zorunlulukları (UGC, hesap silme, gizlilik, izinler, ödeme) Bölüm 15'te; bunlara aykırı kod yazılmaz.

---

## 1. Mimari Genel Bakış

```
┌────────────────┐        ┌────────────────┐
│ Mobil (Expo)   │        │ Admin (Next.js)│
│ React Query    │        │ React Query    │
│ i18n: tr · ar  │        │ i18n: tr · ar  │
└───────┬────────┘        └───────┬────────┘
        │  supabase-js / RPC / Realtime     │
        └───────────────┬───────────────────┘
                        ▼
          ┌──────────────────────────┐
          │ Supabase                 │
          │ Auth (phone OTP) · PG    │
          │ RLS · RPC · Realtime     │
          │ Edge Functions · pg_cron │
          └────────────┬─────────────┘
                       ▼
              Storage (R2 / S3 / Supabase Storage)
```

**Karar:** Monorepo yok. İki ayrı proje (`mobile/`, `admin/`), her birinin kendi `package.json`, `node_modules`, `tsconfig` ve scriptleri var. Ortak nokta sadece Supabase. Ortak tipler için paylaşılan paket yerine **aynı komutla iki projede de üretilen** `database.types.ts` kullanılır (Bölüm 4.2). Küçük ortak parçalar (`AppError`, zod şemaları, çeviri anahtarlarının ortak olanları) iki projede de kopya tutulur; birini değiştirince diğerini de güncelle.

> Windows notu: Komutlar PowerShell uyumlu olsun (`&&` yerine `;` veya ayrı satır).

---

## 2. Klasör Yapısı

**Düz yapı:** "Bu ne?" sorusunun cevabı hangi klasör olduğunu belirler. Feature klasörü, `index.ts`, `types.ts` katmanı yok.

> Ekran mı → `screens`. Parça mı → `components`. Supabase isteği mi → `api`. Hook mu → `hooks`.

```
sehir-odalari/
├─ mobile/                         # Expo (React Native + TS)
│  ├─ app/                         # expo-router (sadece route dosyaları, ince)
│  │  ├─ (auth)/
│  │  │  ├─ phone.tsx
│  │  │  ├─ verify.tsx
│  │  │  └─ complete-profile.tsx
│  │  ├─ (tabs)/
│  │  │  ├─ index.tsx              # 81 il listesi
│  │  │  └─ profile.tsx
│  │  ├─ room/[cityId].tsx
│  │  ├─ paywall.tsx               # şimdilik stub
│  │  └─ _layout.tsx
│  ├─ src/
│  │  ├─ screens/                  # PhoneInputScreen, VerifyOtpScreen, CompleteProfileScreen, RoomsScreen...
│  │  ├─ components/               # OtpInputBoxes, CitySelectModal, RoomCard, PlateBadge, Button, Input, EmptyState...
│  │  ├─ api/                      # authApi, profileApi, roomsApi, messagesApi... (saf Supabase fonksiyonları)
│  │  ├─ hooks/                    # useAuth, useProfile, useRooms, useEntitlement, useLanguage... (useQuery/useMutation sarmalayıcıları)
│  │  ├─ data/                     # cities.ts gibi sabit veriler (name_tr + name_ar)
│  │  ├─ lib/                      # supabase.ts, queryClient.ts, logger.ts, env.ts, errors.ts
│  │  ├─ types/                    # database.types.ts (generated) + paylaşılan tipler
│  │  ├─ theme/                    # tokens.ts, useTheme.tsx, responsive.ts, index.ts
│  │  ├─ i18n/                     # index.ts (init), tr.ts, ar.ts, rtl.ts
│  │  └─ utils/
│  ├─ app.config.ts
│  ├─ package.json
│  └─ tsconfig.json
│
├─ admin/                          # Next.js (App Router)
│  ├─ src/
│  │  ├─ app/
│  │  │  ├─ (auth)/login/
│  │  │  └─ (dashboard)/
│  │  │     ├─ layout.tsx          # sidebar + header
│  │  │     ├─ page.tsx            # özet
│  │  │     ├─ settings/           # free mode, fiyat, kontenjan
│  │  │     ├─ users/
│  │  │     ├─ reports/            # içerik denetimi
│  │  │     └─ payments/           # şimdilik "yakında" placeholder
│  │  ├─ components/               # ui/ (shadcn), data-table/ ve sayfa parçaları
│  │  ├─ api/                      # saf Supabase fonksiyonları
│  │  ├─ hooks/                    # useQuery/useMutation sarmalayıcıları
│  │  ├─ lib/                      # supabase/{server,client,middleware}.ts, logger.ts, env.ts, errors.ts
│  │  ├─ messages/                 # tr.json, ar.json (next-intl)
│  │  ├─ types/                    # database.types.ts (generated)
│  │  └─ middleware.ts             # oturum + admin rol kontrolü
│  ├─ package.json
│  └─ tsconfig.json
│
├─ supabase/                       # iki projenin ortak backend'i
│  ├─ migrations/                  # SQL, sıralı, geri alınabilir
│  ├─ functions/                   # Edge Functions (Deno)
│  ├─ seed.sql                     # 81 il (TR + AR adlarıyla)
│  └─ config.toml
│
├─ docs/
│  └─ glossary.md                  # TR ↔ AR terim sözlüğü (oda, ilan, sabitle...)
└─ RULES.md
```

**Kurallar**
- `app/` (expo-router, mobile) ve `src/app/` (Next, admin) içindeki dosyalar **ince** olur: sadece `screens/` (ya da admin'de `components/`) içinden çağırır.
- `mobile` ve `admin` birbirinden **import yapmaz**; ortak olan her şey Supabase üzerinden ya da kopya dosyadır.
- **Barrel dosyası (`index.ts`) yok**, dosyayı doğrudan import et. İstisnalar: `theme/index.ts` (`useTheme`, `tokens`, `useResponsive` tek yerden gelsin) ve `i18n/index.ts` (init).
- Bir ekrana özel küçük parça aynı dosyanın içinde kalabilir; iki yerde kullanılıyorsa ya da dosya ~500 satırı geçtiyse `components/`'e taşı.
- Büyüyüp karıştığında klasörleri alt gruplara ayırmak serbest (örn. `components/auth/`, `components/rooms/`), ama ilk günden feature klasörü açma.

---

## 3. Kütüphaneler

### Mobil
| Amaç | Kütüphane |
|---|---|
| Routing | `expo-router` |
| Server state | `@tanstack/react-query` (+ `@supabase/supabase-js`) |
| Client state | `zustand` (sadece UI/oturum; sunucu verisi **asla** burada) |
| Form + doğrulama | `react-hook-form` + `zod` + `@hookform/resolvers` |
| Liste | `@shopify/flash-list` (mesaj akışı için) |
| Görsel | `expo-image` |
| Ses kaydı/oynatma | `expo-audio` |
| Görsel seçme/kamera | `expo-image-picker` + `expo-image-manipulator` (yüklemeden önce küçült) |
| Konum / harita | `expo-location` + `react-native-maps` |
| Animasyon / jest | `react-native-reanimated` + `react-native-gesture-handler` |
| Bottom sheet | `@gorhom/bottom-sheet` |
| Güvenli saklama | `expo-secure-store` (oturum), `react-native-mmkv` (cache, dil tercihi) |
| Bildirim (opsiyonel) | `expo-notifications` |
| Haptik | `expo-haptics` |
| i18n | `i18next` + `react-i18next` + `expo-localization` |
| Yeniden başlatma (RTL geçişi) | `expo-updates` (`reloadAsync`) |
| Font | `expo-font` + Arapça destekli font (örn. Noto Sans Arabic / Cairo) |
| Toast | `sonner-native` |
| Hata izleme | `@sentry/react-native` |
| Test | `jest-expo` + `@testing-library/react-native` |

### Admin (Next.js)
| Amaç | Kütüphane |
|---|---|
| UI | `tailwindcss` + `shadcn/ui` + `lucide-react` |
| Supabase | `@supabase/ssr` |
| Server state | `@tanstack/react-query` (+ devtools) |
| Tablo | `@tanstack/react-table` |
| Form | `react-hook-form` + `zod` |
| Grafik | `recharts` |
| URL state (filtre/sayfa) | `nuqs` |
| Tarih | `date-fns` (`tr` + `ar` locale) |
| i18n | `next-intl` |
| Toast | `sonner` |
| Tema | `next-themes` |
| Test | `vitest` + `@testing-library/react` + `playwright` (E2E) |

### Ortak (iki projede de ayrı ayrı kurulu)
`zod`, `typescript` (strict), `eslint` + `prettier`, `husky` + `lint-staged`.

> Yeni bağımlılık eklemeden önce: Expo SDK ile uyumlu mu (`npx expo install`), bakımda mı, gerçekten gerekli mi?

### 3.1 MCP Araçları (AI asistanlar)
Projede iki MCP kurulu. AI asistan ilgili işte bunları **varsayılan kaynak** olarak kullanır, hafızadan tahmin yazmaz:

| MCP | Ne için | Kural |
|---|---|---|
| **Supabase MCP** | Tablo, kolon, RLS policy, RPC, trigger, log, advisor (güvenlik/performans) okuma | DB ile ilgili her işte önce buradan oku (Bölüm 4.4). Varsayılan **salt-okunur**; yazma gerekiyorsa migration dosyası + onay. |
| **Context7 MCP** | Kütüphane/framework için güncel dokümantasyon ve örnek kod | Sürüme bağlı API yazmadan önce çek: Expo SDK / expo-router, React Query, supabase-js, i18next, next-intl, Next.js, shadcn/ui, Reanimated vb. |

**Context7 kullanımı**
- Önce kütüphane ID'sini çöz, sonra dokümanı çek; sorguyu konuya özel tut (örn. "expo-router typed routes", "next-intl RTL").
- Projedeki gerçek sürüme bak (`package.json`, Expo SDK sürümü); doküman farklı sürümse bunu not et, kodu proje sürümüne uyarla.
- Doküman ile mevcut kod çelişirse sessizce birini seçme, farkı yaz.
- Context7'de bulunamayan konuda resmi dokümana başvur; uydurma API yazma.

**Genel**
- MCP'den çıkan gerçek kullanıcı verisi (telefon, mesaj vb.) Bölüm 4.4 madde 5'e tabidir: minimum çek, maskele, yapıştırma.
- MCP bağlantısı **dev projesine** yapılır; prod'a bağlı MCP ile yazma/değişiklik yapılmaz.
- MCP erişilemezse (bağlantı yok/hata) bunu söyle; varsayımla devam etme, kullanıcıya sor.

---

## 4. Supabase & Veri Katmanı

### 4.1 Tablolar (özet)
| Tablo | Not |
|---|---|
| `profiles` | id (auth.users), first_name, last_name, city_id, avatar_url, **phone_hidden** (bool), **preferred_language** (`tr`/`ar`), role (`user`/`admin`), banned_at |
| `rooms` | 81 il, seed ile gelir. id, **name_tr, name_ar**, plate_code |
| `messages` | id, room_id, user_id, **type** (`text`/`image`/`audio`/`location`), body, media_path, lat, lng, reply_to_id, created_at |
| `pinned_listings` | id, room_id, message_id, user_id, starts_at, **expires_at** (= starts_at + 24 saat) |
| `app_settings` | tek satır: free_mode, price_monthly, price_yearly, price_pin_24h, max_pins_per_room (varsayılan 3) |
| `subscriptions` | user_id, plan (`monthly`/`yearly`), source (`manual`/ileride store), expires_at |
| `reports` | reporter_id, target_type, target_id, reason, status |
| `blocks` | blocker_id, blocked_id |
| `banned_words` | id, word, **lang** (`tr`/`ar`/`any`), created_at (admin'den yönetilir) |

> Bu tablo, gerçek şemanın özetidir. Gerçek kaynak her zaman `supabase/migrations` ve canlı DB'dir (Bölüm 4.4).

### 4.2 Kritik kurallar
- **Her tabloda RLS açık.** Policy'siz tablo yok.
- Admin yetkisi `profiles.role = 'admin'` ile; istemciden gelen hiçbir bilgiye güvenilmez. Admin işlemleri RLS policy'si veya `security definer` RPC ile.
- **3 sabit ilan limiti** → `pin_listing(message_id)` RPC'si; oda satırını `FOR UPDATE` ile kilitleyip sayar, doluysa özel hata kodu döner (`PIN_QUOTA_FULL`). İstemcide sayıp karar verme.
- **Sabitleme süresi:** `expires_at > now()` filtresiyle okunur; süre bitince otomatik normal akışa düşer (ek job gerekmez). Temizlik cron'u eski kayıtları siler.
- **30 gün temizlik:** `pg_cron` ile günlük çalışır; mesaj satırlarını siler + Storage'daki dosyaları siler (Edge Function).
- **Rate limit:** DB tarafında trigger/RPC (kullanıcı başına son N saniyede mesaj sayısı). Aşılırsa özel hata kodu.
- **Kelime filtresi:** Insert öncesi trigger veya Edge Function. İstemci filtresi sadece UX içindir, güvenlik sayılmaz. Kelime listesi tabloda tutulsun (admin'den yönetilebilir). **TR ve AR listesi ayrı tutulur;** karşılaştırmadan önce metin normalleştirilir (Arapça: harekeler, tatweel `ـ`, alef varyasyonları `أ إ آ → ا`, `ى → ي`; Türkçe: `İ/ı` büyük-küçük harf farkı).
- **Numara gizliliği:** `phone` bilgisi `profiles`'ta değil `auth.users`'ta; başkalarına gösterilen view sadece `phone_hidden = false` ise döndürür.
- **Hesap silme:** Edge Function (`delete-account`) → kullanıcının mesaj/medya/profil verisini ve auth kaydını siler. Mağaza zorunluluğu (Apple: uygulama içinden silme; Google: uygulama içi silme + Play Console'da web üzerinden silme talebi linki). Bkz. Bölüm 15.
- **Engelleme:** Engellenen kullanıcının mesajları RLS/view seviyesinde filtrelenir.
- **Medya:** Özel bucket + **signed URL**. Yükleme: istemci → presigned URL (Edge Function üretir). Boyut/tip limiti sunucuda doğrulanır. (Doc'ta R2/S3 geçiyor; başlangıçta Supabase Storage de yeterli, arayüzü `storage` servisi arkasında tut ki sonra değişsin.)
- **Realtime:** Sadece açık odanın `messages` kanalı dinlenir; odadan çıkınca `unsubscribe`.
- **Migration'lar** dosya olarak commit'lenir; dashboard'dan elle şema değiştirme yok.
- Tipler: `supabase gen types typescript` çıktısı **iki projeye de** yazılır (`mobile/src/types/database.types.ts` ve `admin/src/types/database.types.ts`). Şema değişince ikisini de yeniden üret.
- **Dile bağlı sunucu metinleri** (push bildirimi, SMS OTP metni, Edge Function hata mesajları) kullanıcının `preferred_language` değerine göre seçilir. Sunucu metin yerine **kod** döner, metni istemci i18n'den çevirir; tek istisna push/SMS gibi istemcinin göremediği metinlerdir.

### 4.3 SMS OTP notu
Supabase phone auth bir SMS sağlayıcı ister (Twilio, MessageBird, Vonage...). Türkiye'de yerel sağlayıcı (Netgsm vb.) kullanılacaksa **Send SMS Hook** (Edge Function) ile bağlanır. OTP için rate limit ve deneme limiti zorunlu. SMS metni TR ve AR olarak hazırlanır; kullanıcı henüz profil açmadıysa cihaz dili kullanılır.

### 4.4 Supabase Erişim Kuralları
DB'ye (tablolara, SQL'e, MCP/CLI üzerinden) erişimi olan herkes ve her AI asistan için geçerli:

1. **Önce oku, sonra değiştir.** Bir tabloya/policy'ye dokunmadan önce **Supabase MCP ile** mevcut şemayı, kolonları, RLS policy'lerini ve ilgili migration'ları incele. Bölüm 4.1 özettir; varsayımla çalışma. Şema değiştirdikten sonra MCP'deki güvenlik/performans uyarılarını (advisor) kontrol et.
2. **Şema değişikliği = migration dosyası.** Tablo/kolon/index/policy/RPC/trigger değişikliği `supabase/migrations/` altına SQL dosyası olarak yazılır, önce local/dev'de denenir. SQL editor veya dashboard'dan elle değişiklik yok.
3. **Yıkıcı işlemler açık onay ister:** `DROP`, `TRUNCATE`, koşulsuz `DELETE/UPDATE`, kolon silme, policy silme, **RLS kapatma**. Komutu ve etkilenecek tabloyu yazıp onay bekle. RLS hiçbir zaman "geçici olarak" kapatılmaz.
4. **Üretim (prod) verisine yazma yok.** Prod'da sadece migration deploy'u ve onaylı bakım işlemleri yapılır. Deneme/seed verisi dev ortamında.
5. **Kullanıcı verisi hassastır.** Telefon, mesaj, medya yolu gibi verileri sadece gerekiyorsa oku: `limit` kullan, sadece gereken kolonları seç, çıktıyı log'a/sohbete/commit'e yapıştırma. Sorgu sonuçlarında telefon numarası maskelenir.
6. **Anahtarlar:** `service_role` anahtarı sohbete, koda, loga yazılmaz; sadece sunucu tarafında (Edge Function / CI secret) durur. İstemciler yalnızca `anon` anahtarını kullanır.
7. **Her değişiklikten sonra:** `gen types` iki projede de çalıştırılır, RLS/RPC değiştiyse yetkisiz kullanıcıyla test edilir (Bölüm 10), değişen tablo/policy kısa bir özetle bildirilir.
8. **Kural çakışırsa güvenli olan seçilir:** emin olmadığın bir DB işleminde dur ve sor.

---

## 5. React Query Kuralları

- Tek `QueryClient` (`lib/queryClient.ts`); varsayılanlar: `staleTime: 30_000`, `retry: 1`, mobilde `refetchOnWindowFocus` kapalı (focusManager'ı AppState'e bağla).
- **Query key fabrikası** zorunlu, string'i elle yazma:
  ```ts
  export const roomKeys = {
    all: ['rooms'] as const,
    list: () => [...roomKeys.all, 'list'] as const,
    detail: (id: number) => [...roomKeys.all, 'detail', id] as const,
    messages: (roomId: number) => [...roomKeys.all, roomId, 'messages'] as const,
  };
  ```
- **Supabase çağrıları `api/` içinde** saf fonksiyon olarak yazılır; `hooks/` bunları `useQuery/useMutation` ile sarar. Komponent içinde doğrudan `supabase.from(...)` yok.
- Her api fonksiyonu `{ data, error }`'u kontrol eder, hata varsa `AppError` fırlatır (Bölüm 8).
- Mesaj akışı: `useInfiniteQuery` (cursor = `created_at`) + Realtime ile cache'e `setQueryData` ile ekleme. Tam refetch yapma.
- Mutation'larda **optimistic update** (mesaj gönderme gibi) + `onError` rollback + `onSettled` invalidate.
- Sunucu verisini zustand'a kopyalama.
- Admin'de listeler: sayfalama + filtre URL'de (`nuqs`), `placeholderData: keepPreviousData`.
- Dile bağlı veri (oda adı gibi) için dil ayrı bir query key parçası olmak zorunda değil: `name_tr` ve `name_ar` birlikte çekilir, gösterirken dile göre seçilir (`getLocalizedName(room, lang)`).

---

## 6. Kod Stili

- TypeScript `strict: true`, `noUncheckedIndexedAccess: true`.
- Dosya adları: komponent/ekran `PascalCase.tsx`, hook `useXxx.ts`, diğerleri `camelCase.ts`.
- Named export tercih et (route dosyaları hariç, onlar default).
- Komponent = **tek dosya** (`Component.tsx`). Stil ayrı dosyaya çıkarılmaz. Test varsa yanına `Component.test.tsx`. Dosya şişerse bölme kuralı Altın Kural 3'tedir (~250 satır ya da bağımsız işler).
- Props için `type`, nesne şekli için `interface` değil `type` (tutarlılık).
- Erken `return` kullan, iç içe `if` yığma.
- Magic number/string → `constants.ts`.

### 6.1 Stil yazımı (style prop)

- `StyleSheet.create`, `makeStyles`, `*.styles.ts` **kullanma**. Stil JSX'in içinde, `style` prop'uyla yazılır.
- Renkler **her zaman** `useTheme()`'den gelen `colors`'tan (açık/koyu tema otomatik çalışır). `tokens.colors` diye bir şey yok.
- Boşluk, radius, font boyutu/kalınlığı `tokens`'tan gelir.
- **Yön bilinçli yaz (RTL):** `marginLeft/Right`, `paddingLeft/Right`, `left/right`, `borderLeft*/borderRight*` yerine `marginStart/End`, `paddingStart/End`, `start/end`, `borderStart*/borderEnd*` kullan. (Bkz. Bölüm 7.6)
- Birden fazla yerde aynı stil tekrar ediyorsa: stili değişkene al (komponentin içinde, `return`'den önce) ya da küçük bir komponent yap (`Card`, `Label`). Yeni stil dosyası açma.
- Koşullu stil için dizi kullan: `style={[base, isFocused && { borderColor: colors.primary }]}`.
- Statik stiller için `const` objeyi komponentin **dışına** koymak serbest (renk içermiyorsa), ama ayrı dosyaya değil, aynı dosyaya.

```tsx
// ✅ Doğru
export const InfoCard: React.FC<{ title: string }> = ({ title }) => {
  const { colors } = useTheme();

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: tokens.radii.md,
        paddingHorizontal: tokens.spacing.base,
        marginStart: tokens.spacing.sm,
      }}
    >
      <Text
        style={{
          color: colors.text,
          fontSize: tokens.typography.fontSize.base,
          fontWeight: tokens.typography.fontWeight.bold,
        }}
      >
        {title}
      </Text>
    </View>
  );
};

// ❌ Yanlış
// InfoCard.styles.ts dosyası + makeStyles(colors) + useMemo
// style={{ color: '#1F2937' }}  (ham hex)
// style={{ marginLeft: 8 }}     (RTL'de bozulur → marginStart)
```

### Switch-case yerine handler-map
```ts
// ✅ Doğru
const messageRenderers: Record<MessageType, (m: Message) => JSX.Element> = {
  text: (m) => <TextBubble message={m} />,
  image: (m) => <ImageBubble message={m} />,
  audio: (m) => <AudioBubble message={m} />,
  location: (m) => <LocationBubble message={m} />,
};
const render = (m: Message) => messageRenderers[m.type](m);

// ❌ Yanlış
switch (m.type) { case 'text': ...; case 'image': ...; }
```
Aynı desen: hata kodu → mesaj eşleme, rapor nedeni → etiket, abonelik planı → etiket vb. `Record<Union, ...>` kullanınca yeni bir tip eklendiğinde TS eksik olanı yakalar. Dil için de aynı: `Record<Language, ...>` (örn. dil → locale, dil → yön).

---

## 7. UI / UX Kuralları

### 7.1 Tasarım sistemi
- **Token'lar** (`theme/tokens.ts`): renk (brand, semantic: success/warning/danger/info, nötr), tipografi ölçeği, boşluk ölçeği (4 tabanlı: 4/8/12/16/24/32), radius, gölge, motion süreleri.
- Komponentlerde ham hex / px yok → sadece token.
- Her UI komponenti şunları tanımlar: **variant** (primary/secondary/ghost/danger), **size** (sm/md/lg), **state** (default, pressed/hover, focus, disabled, loading, error).
- Açık/koyu tema baştan desteklenir.
- Tipografi token'ı dile göre font ailesi verir (`tr` → ana font, `ar` → Arapça destekli font). Arapça metin aynı punto ile küçük görünür; satır yüksekliği ve gerekirse boyut `ar` için ayrı token'dan gelir.

### 7.2 Mobil
- **Dokunma hedefi ≥ 44×44 pt.** Küçük ikonlara `hitSlop`.
- Güvenli alan: `react-native-safe-area-context`. Klavye açılınca mesaj girişi kapanmasın (`KeyboardAvoidingView` / `react-native-keyboard-controller`).
- Ana eylemler başparmak bölgesinde (alt kısım). Mesaj girişi altta sabit.
- Mesaj balonu: uzun basınca eylem menüsü (Yanıtla, Şikayet Et, Engelle, **İlanı En Üste Sabitle** — sadece kendi mesajında).
- Sesli mesaj: bas-konuş, basılıyken süre + dalga animasyonu, **iptal hareketi okuma yönünün tersine kayıştır** (LTR'de sola, RTL'de sağa); kayıt izni reddedilirse açıklayıcı ekran.
- Konum: tek dokunuşla pin; harita önizlemesi küçük kart.
- 81 il listesi: arama kutusu (filtre sayılmaz, sadece hızlı bulma) + `FlashList`; sıralama aktif dile göre (`localeCompare(b, lang)`), arama hem TR hem AR adda çalışır.
- Kilitli oda: içerik bulanık/kilit ikonu, net CTA. (Ödeme yokken bu ekran stub — Bölüm 11.)
- Skeleton loader kullan; ekranı boş spinner'a çevirme.
- Boş durum, hata durumu ve çevrimdışı durumu için ortak komponentler (`EmptyState`, `ErrorState`, `OfflineBanner`).
- Haptik geri bildirim: gönder, sabitle, hata (hafif).
- Yıkıcı işlemler (hesap silme, engelleme) onay diyaloğu ister; hesap silme için ek doğrulama.

### 7.3 Admin paneli
- Sol sidebar + üst bar (Arapçada sidebar sağa geçer, `dir="rtl"`); masaüstü öncelikli ama tablet'te de çalışır (breakpoint: 768 / 1024).
- Tablolar: sıralama, sayfalama, arama, sütun görünürlüğü, boş ve yükleniyor durumu.
- Kritik ayarlarda (Free Mode, fiyat, kontenjan) **onay modalı** + sonuç toast'ı; Free Mode açıkken üstte kalıcı uyarı bandı.
- Kullanıcıyı banlama/silme/içerik silme → onay + işlem logu (`admin_audit_log`).
- Yıkıcı butonlar kırmızı ve ayrı konumda.
- Tailwind'de yön için mantıksal sınıflar: `ms-*`/`me-*`, `ps-*`/`pe-*`, `text-start`/`text-end`, `start-*`/`end-*`. `ml-*`, `pr-*`, `text-left` gibi fiziksel yön sınıfları kullanma.

### 7.4 Erişilebilirlik (WCAG 2.1 AA)
- Kontrast: normal metin ≥ 4.5:1, büyük metin ve UI bileşenleri ≥ 3:1.
- Her interaktif öğede `accessibilityLabel` / `accessibilityRole` (mobil), `aria-*` + görünür **focus ring** (web). Etiketler de aktif dile göre i18n'den gelir.
- Admin klavye ile tam kullanılabilir (Tab sırası mantıklı, modallerde focus trap, `Esc` ile kapanma).
- Anlam sadece renkle verilmez (ikon + metin de olsun).
- Metin boyutu sistem ayarına uyar (mobil `allowFontScaling`), web'de %200 zoom'da layout bozulmaz.
- Sesli mesaja metin alternatifi için süre/etiket göster; otomatik oynatma yok.
- Web'de `<html lang="tr|ar" dir="ltr|rtl">` doğru set edilir.

### 7.5 UX yazımı (Türkçe + Arapça)
- Buton fiil ile başlar ve sonucu söyler: "Kodu Gönder" / "إرسال الرمز", "İlanı Sabitle", "Hesabımı Sil" ("Tamam/Evet" değil).
- Hata mesajı: **ne oldu + neden + ne yapmalı**. Örn: "Kod doğrulanamadı. Girdiğin kod hatalı ya da süresi dolmuş. Yeni kod isteyebilirsin."
- Boş durum: ne bu + neden boş + nasıl başlanır.
- Onay diyaloğunda sonucu yaz: "Hesabın ve tüm verilerin silinecek. Bu işlem geri alınamaz." → "Hesabı Sil" / "Vazgeç".
- Kota dolu uyarısı doc'taki metinle: "Bu odanın bugünkü sabit ilan kontenjanı dolmuştur."
- Aynı şey için hep aynı kelime (örn. her yerde "oda", "ilan", "sabitle"). Arapça karşılıkları `docs/glossary.md` içinde tutulur; yeni terim eklenince önce sözlüğe girer.
- Tüm metinler `i18n` dosyasından gelir, komponentte hardcoded metin yok.
- Arapça metin **düz, modern standart Arapça** (Fusha'ya yakın, sade) yazılır; makine çevirisi doğrudan yayına girmez, anadili konuşan biri gözden geçirir.
- Metin birleştirme yok (`"Merhaba " + name`); değişkenli tek cümle olarak yaz (`t('greeting', { name })`). Kelime sırası dile göre değişir.

### 7.6 Çok dillilik (TR + AR) ve RTL

**Genel**
- Desteklenen diller: `tr`, `ar`. Tip: `type Language = 'tr' | 'ar'`. Varsayılan/yedek dil: `tr`.
- Başlangıç dili: kayıtlı tercih → yoksa cihaz dili (`expo-localization`) `ar` ise `ar`, değilse `tr`. Kullanıcı Profil'den değiştirebilir; seçim `profiles.preferred_language` + yerel cache'te (`mmkv`) tutulur.
- **`tr.ts` kaynak dosyadır**, `ar.ts` aynı yapıya zorlanır (`export const ar: typeof tr = {...}`); eksik anahtarı TypeScript yakalar. Yeni metin eklerken ikisini birden ekle.
- Anahtar adları anlam taşır ve gruplanır (`auth.phone.title`, `rooms.empty.title`), metin değil.
- Çoğul: `i18next` plural kuralı kullan. Arapçada 6 form vardır (`zero/one/two/few/many/other`); `_other` ile yetinme.
- Tarih, saat, sayı biçimi `Intl` ile aktif locale'e göre. **Telefon numarası, OTP kodu, plaka kodu her zaman Latin rakam (0-9)** gösterilir; Arapça-Hindu rakamlarına (٠-٩) çevrilmez.
- Kullanıcı içeriği (mesajlar, isimler) **çevrilmez**, olduğu gibi gösterilir. TR ve AR karışık metinde yön, metnin ilk güçlü karakterine göre belirlenir (mesaj balonunda `writingDirection` içeriğe göre); arayüz yönü bundan etkilenmez.

**RTL (mobil)**
- Arapça seçilince `I18nManager.allowRTL(true)` + `forceRTL(true)`, Türkçede `forceRTL(false)`. RN yön değişikliğini **yeniden başlatmadan** uygulamaz → dil değişince `Updates.reloadAsync()` ile uygulamayı yeniden başlat (kullanıcıya önceden söyle).
- Yön mantığı `i18n/rtl.ts` içinde tek yerde: `const directionByLanguage: Record<Language, 'ltr' | 'rtl'>`.
- `flexDirection: 'row'` RTL'de otomatik tersine döner; bunu bozacak elle `row-reverse` hack'leri yazma.
- **Yönlü ikonlar aynalanır** (geri/ileri oku, "gönder" oku, chevron): `transform: [{ scaleX: isRTL ? -1 : 1 }]`. Aynalanmayanlar: saat, medya oynat/duraklat, harita, logo, numara/kod alanları.
- OTP kutuları ve telefon girişi **her zaman LTR** (`direction: 'ltr'`) kalır.
- Gesture'larda (swipe, bas-konuş iptali) yön `isRTL`'e göre çevrilir.
- Reanimated animasyonlarında yatay `translateX` yönü RTL'de ters çevrilir.

**RTL (admin / Next.js)**
- `next-intl` ile locale rotası (`/tr/...`, `/ar/...`); `dir` locale'e göre `<html>`'e yazılır.
- Mantıksal Tailwind sınıfları (Bölüm 7.3). Tablolarda başlık hizası ve sıralama okları RTL'de aynalanır.
- Recharts gibi grafik kütüphanelerinde eksen yönünü RTL'de ayrıca kontrol et.

**Veri**
- Oda adı: `rooms.name_tr` / `name_ar`. Gösterim: `getLocalizedName(room, lang)`. Yeni il/oda eklenince iki ad da zorunlu.
- `seed.sql` 81 ili iki dilde içerir.
- Kelime filtresi listesi dile göre ayrı yönetilir (Bölüm 4.2).

---

## 8. Hata Yönetimi & Debug

### 8.1 Hata modeli
```ts
// mobile/src/lib/errors.ts  (admin/src/lib/errors.ts içinde aynı kopya)
export type AppErrorCode =
  | 'NETWORK' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'RATE_LIMITED'
  | 'PIN_QUOTA_FULL' | 'CONTENT_BLOCKED' | 'NOT_FOUND' | 'UNKNOWN';

export class AppError extends Error {
  constructor(public code: AppErrorCode, message: string, public cause?: unknown) {
    super(message);
  }
}
```
- Supabase/Postgres hataları tek bir `mapSupabaseError()` içinde `AppError`'a çevrilir (handler-map ile).
- Kullanıcıya gösterilen mesaj `AppErrorCode → i18n key` map'inden gelir (TR ve AR'de ikisinde de); ham hata metni asla gösterilmez.

### 8.2 Debug altyapısı (her projede **mutlaka** olacak)
- **`lib/logger.ts`**: seviye (`debug/info/warn/error`) + namespace (`logger.scope('messages')`). `debug` ve `info` sadece `__DEV__` / `NODE_ENV !== 'production'`. `error` Sentry'ye gider. Üretimde `console.log` kalmaz.
- **ErrorBoundary:** mobilde root + ekran bazlı, adminde `error.tsx` + `global-error.tsx`. Fallback'te "Tekrar Dene" (i18n'den, her iki dilde).
- **React Query Devtools** (admin'de dev modunda), mobilde `QueryClient` global `onError` → logger.
- **Mutation/Query global error handler:** tek yerde logla + toast.
- **Dev-only debug ekranı** (mobil, `__DEV__` ile): oturum bilgisi, `app_settings`, ortam, Realtime bağlantı durumu, aktif dil/yön, cache temizle, test hatası fırlat, **dili anında değiştir (TR/AR)**.
- **Env doğrulama:** `lib/env.ts` içinde zod ile; eksik değişkende uygulama açılışta net hata verir.
- `console.log` ile debug bırakma. `logger.debug` kullan, commit'ten önce gereksiz olanı sil.
- Sentry'de kullanıcı bilgisi olarak sadece `user.id` (telefon, ad vs. **asla**). Sentry etiketine `language` eklenebilir.

### 8.3 Hata ayıklama yöntemi
Hata geldiğinde sırayla: **Reproduce → Isolate → Diagnose → Fix.**
1. Beklenen / gerçekleşen davranışı ve tekrar adımlarını yaz (dil ve yön dahil: sorun sadece Arapçada mı?).
2. Alanı daralt (hangi katman: UI / hook / api / RLS / RPC?). Son değişikliklere bak.
3. Kök nedeni bul (belirtiyi değil). RLS sorunlarında Supabase loglarına ve `auth.uid()` değerine bak.
4. Düzelt + regresyonu önleyen test ekle.

---

## 9. Bitirme Kontrol Listesi (Definition of Done)

**Kod yazma işi bittiğinde, teslimden önce şunlar çalıştırılır ve temiz olmalıdır:**

```powershell
# mobile klasöründe
cd mobile
npm run typecheck   # tsc --noEmit
npm run lint
npm test

# admin klasöründe
cd ../admin
npm run typecheck
npm run lint
npm test
```

Her projenin `package.json` script'leri:
```json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "test": "jest"
  }
}
```
(Admin'de test runner `vitest` ise `"test": "vitest run"`.) Değişiklik hangi projeye dokunduysa onda çalıştır; Supabase şeması/tipi değiştiyse **ikisinde de** çalıştır.

Kontrol listesi:
- [ ] `tsc --noEmit` **0 hata** (TS hata kontrolü her işin sonunda zorunlu; hata varsa düzeltmeden bitirilmez)
- [ ] ESLint 0 hata, kullanılmayan import/değişken yok
- [ ] `any`, `@ts-ignore`, `console.log` kalmadı (gerekçeli `@ts-expect-error` hariç, yorumla)
- [ ] Loading / error / empty durumları var
- [ ] Debug/log altyapısı kullanıldı, hatalar `AppError` ile yönetiliyor
- [ ] Yeni metinler **hem `tr` hem `ar`** i18n'de, yeni renk/boşluklar token'da
- [ ] **RTL kontrolü:** ekran Arapça/RTL'de açılıp bakıldı (yönlü stil yok, ikonlar aynalı, taşma yok)
- [ ] Erişilebilirlik: label, kontrast, dokunma hedefi, klavye
- [ ] RLS/policy değiştiyse test edildi (yetkisiz kullanıcı erişemiyor)
- [ ] Şema değiştiyse migration + `gen types` yapıldı (mobile ve admin ikisinde de); DB işlemleri Bölüm 4.4'e uygun
- [ ] DB şeması Supabase MCP'den, kütüphane API'leri Context7'den doğrulandı (tahmin yok)
- [ ] **iOS ve Android'de** çalıştı (en az biri gerçek cihazda); platforma özel kod `Platform.select` ile ayrıldı
- [ ] Yeni izin/SDK/veri toplama eklendiyse Bölüm 15 güncellendi (izin açıklaması TR+AR, gizlilik formları)
- [ ] İlgili testler yazıldı/güncellendi

---

## 10. Test Stratejisi

Piramit: **çok unit, biraz entegrasyon, az E2E.**

| Alan | Tür | Ne test edilir |
|---|---|---|
| Util / handler-map / zod şemaları | Unit | giriş-çıkış, sınır değerler |
| Kelime filtresi (istemci tarafı) | Unit | TR ve AR küfür/dolandırıcılık varyasyonları, normalleştirme, yıldızlama |
| i18n | Unit | `ar` anahtarları `tr` ile aynı mı, çoğul formları, `getLocalizedName` |
| Hook'lar (query/mutation) | Entegrasyon | mock supabase ile başarı / hata / optimistic rollback |
| Komponentler | Component | 4 durum, erişilebilirlik rolleri, **hem LTR hem RTL render** |
| **RLS & RPC** | DB testi (pgTAP veya supabase local) | başka kullanıcının verisini okuyamama, **4. sabit ilan reddi**, rate limit, admin-dışı ayar değiştirememe |
| Kritik akışlar | E2E (Maestro mobil / Playwright admin) | OTP giriş → odaya gir → mesaj at → sabitle; admin giriş → Free Mode aç (her ikisi de TR ve AR'de) |

**Öncelikli test senaryoları**
1. 3 kontenjan doluyken 4. sabitleme `PIN_QUOTA_FULL` döner; eşzamanlı iki istekte de limit aşılmaz.
2. 24 saat sonra sabit ilan akışa düşer.
3. Free Mode açıkken kilit kalkar, kapanınca geri gelir.
4. Aboneliği olmayan kullanıcı kilitli odanın içeriğini RLS seviyesinde okuyamaz (sadece UI'da gizlemek yetmez).
5. 30 günden eski mesajlar ve medya silinir.
6. Engellenen kullanıcının mesajı akışta görünmez.
7. Hesap silince tüm veri gider.
8. Dil Arapçaya geçince arayüz RTL olur, OTP/telefon alanları LTR kalır, rakamlar Latin kalır.

Kapsam hedefi: iş mantığı ve güvenlik sınırlarında yüksek; trivial getter/framework kodunu test etme.

Platform: kritik akışlar (giriş, mesaj, medya/ses, konum, bildirim) **hem iOS hem Android'de gerçek cihazda** elle de denenir; yayın öncesi liste Bölüm 15.10'dadır.

---

## 11. Ödeme — Şimdilik Kapsam Dışı

Apple IAP, Google Play Billing, PayTR/iyzico, Paycell **şu an yazılmayacak.** Ama altyapı bunlara hazır tasarlanır:

- Erişim kararı tek bir yerden gelir: `useEntitlement()` (mobil) → `{ canAccessRoom, canPin }`. İçeride şimdilik: `free_mode` açık mı **veya** geçerli `subscriptions` kaydı var mı (admin'in manuel tanımladığı dahil).
- Paywall ekranı ve fiyat gösterimi `app_settings`'ten okur; **satın alma butonu devre dışı / "Yakında"** olur.
- Sabitleme ücretli akışı yerine geçici olarak sadece kota + yetki kontrolü yapılır (RPC `pin_listing` ödeme parametresini ileride alacak şekilde yazılır).
- Admin'de "Ödeme ve Ciro" sayfası boş placeholder.
- `payments` tablosunu şimdilik **oluşturma**; ödeme aşamasına gelince migration ile ekle.

> ⚠️ İleride hatırla: iOS'ta dijital abonelik/ilan sabitleme için Apple In-App Purchase zorunlu; sanal POS ve GSM ödeme bu tür dijital ürünlerde iOS tarafında App Store reddi riski taşır. Ödeme aşamasında bu ayrım planlanmalı. Fiyat gösteriminde para birimi ve sayı biçimi aktif locale'e göre ama rakamlar Latin kalır.

---

## 12. Doc'a Eklenmesini Önerdiğim Şeyler

Gereksinim dokümanında olmayıp mağaza onayı ve kalite için işe yarayacaklar:

1. **Admin audit log:** Kim, ne zaman, hangi ayarı/kullanıcıyı değiştirdi.
2. **Şikayet iş akışı:** Durum (açık/incelendi/kapatıldı) + otomatik gizleme eşiği (N şikayette mesaj geçici gizlenir).
3. **Kelime listesini admin'den yönetme** (TR/AR ayrı).
4. **Kullanım koşulları + gizlilik politikası + "Kabul ediyorum"** (UGC uygulamaları için Apple zorunlu tutar). Her iki dilde hazırlanır.
5. **Force update / bakım modu:** `app_settings` üzerinden.
6. **Push bildirim** (opsiyonel): yanıt aldığında / sabit ilan süresi bitmeden (kullanıcının diliyle).
7. **Çevrimdışı banner + mesaj gönderme kuyruğu.**
8. **Yönetici rolleri:** `admin` / `moderator` (moderatör sadece içerik siler, ayar değiştiremez).
9. **Analitik (anonim):** günlük aktif kullanıcı, oda başına mesaj, dil dağılımı; PostHog veya Supabase tabanlı basit sayaçlar.
10. **Medya moderasyonu:** yüklenen görseller için ileride NSFW tarama (Edge Function).
11. **Mağaza listeleme metinleri** (ad, açıklama, ekran görüntüleri) TR ve AR için ayrı hazırlanır.

---

## 13. Git & İş Akışı

- Branch: `feat/...`, `fix/...`, `chore/...`. Commit: Conventional Commits (`feat(pinning): 3 kontenjan limiti RPC`).
- `main`'e doğrudan push yok; PR öncesi Bölüm 9 listesi.
- `husky` + `lint-staged` her projede ayrı: commit'te lint + format, push'ta `typecheck`.
- `.env` dosyaları commit edilmez; `.env.example` güncel tutulur. **`service_role` anahtarı asla istemciye (mobil veya `NEXT_PUBLIC_*`) girmez.**

### Code review bakışı
PR'da şu 4 soruya bak: **Güvenlik** (RLS, secret, XSS), **Performans** (N+1, sınırsız sorgu, gereksiz re-render, eksik index), **Doğruluk** (boş/null, yarış durumu, hata yayılımı, eksik `ar` çevirisi, RTL bozulması), **Bakım** (tek sorumluluk, tekrar, isimlendirme).

---

## 14. Dokümantasyon

- Kök `README.md`: kurulum (< 5 dk'da ilk çalıştırma), env değişkenleri, komutlar.
- `docs/` altında: `architecture.md` (diyagram + kararlar), `database.md` (tablolar, RLS özeti), `runbook.md` (deploy, rollback, cron kontrolü), `design-system.md` (token + komponent özetleri), `glossary.md` (TR ↔ AR terim sözlüğü).
- Önemli mimari kararlar kısa **ADR** olarak yazılır (`docs/adr/0001-ayri-projeler.md`: bağlam, karar, sonuçlar).
- Komponent eklerken: variant / state / a11y notunu komponent dosyasının üstüne kısa JSDoc olarak yaz.

---

## 15. Mağaza & Platform Kuralları (App Store + Google Play)

Uygulama **iki mağazada** yayınlanır. Aşağıdakiler kod yazarken uyulacak zorunluluklardır. Mağaza gereksinimleri (hedef API/SDK sürümü, form alanları) sık değişir; **sayı ve sürüm için hafızaya güvenme**, resmi dokümandan / Context7'den doğrula.

### 15.1 Platform farkları (kod)
- Platforma özel kod `Platform.select({ ios: ..., android: ... })` ile yazılır (object map); dağınık `if (Platform.OS === ...)` yığma.
- **iOS:** safe area (çentik / Dynamic Island), kenardan kaydırarak geri, haptik farkları. **Android:** donanım/jest geri tuşu (`BackHandler` + expo-router), edge-to-edge (sistem çubukları altına çizim), bildirim kanalları, `POST_NOTIFICATIONS` çalışma zamanı izni.
- Klavye davranışı iki platformda farklıdır; `react-native-keyboard-controller` ile tek yerden yönet, iki platformda da test et.
- Harita: iOS'ta Apple Maps varsayılan, Android'de Google Maps API anahtarı gerekir; anahtar kısıtlanır (paket adı/SHA-1), kod içine gömülmez (`app.config.ts` + env).
- Native bir modül/izin eklerken iki platformdaki ayarı da yaz (`app.config.ts` plugin'leri). Expo Go'da çalışıp development build'de bozulan kod bırakma.
- Bundle ID (iOS) ve package name (Android) aynı ve kalıcı seçilir; yayından sonra değiştirilemez.

### 15.2 Kullanıcı üretimli içerik (UGC) — iki mağaza da zorunlu tutar
Bu uygulama sohbet/ilan içeriği barındırdığı için şunlar **yayından önce çalışır olmalı**:
- Kullanıcı **Kullanım Koşulları + Gizlilik Politikası'nı kabul etmeden** içerik gönderemez (uygulama içinde link + onay).
- İçerik **filtresi** (Bölüm 4.2), mesaj/kullanıcı **şikayet** etme, kullanıcıyı **engelleme**.
- Şikayetlere **zamanında işlem** yapılabilmesi: admin'de şikayet kuyruğu (Bölüm 12), uygunsuz içeriği kaldırma, kullanıcıyı banlama.
- Uygulama içinde veya mağaza sayfasında **iletişim/destek bilgisi**.
- Yaş/içerik derecelendirme anketlerinde (App Store yaş sınırı, Google IARC) "kullanıcı üretimli içerik ve sohbet var" **doğru** işaretlenir.

### 15.3 Hesap silme ve veri
- **Uygulama içinden** hesap silme (Profil → Hesabımı Sil) olmalı; sadece "destek ile iletişime geç" kabul edilmez.
- Google için ayrıca Play Console'a, **uygulamaya girmeden** hesap/veri silme talebi yapılabilen bir **web sayfası linki** verilir.
- Silme `delete-account` Edge Function ile gerçekten siler (Bölüm 4.2); silinen veri ve saklanan veri gizlilik politikasında yazar.

### 15.4 Gizlilik beyanları
- **Gizlilik Politikası URL'si** (TR + AR) iki mağazada da zorunlu; uygulama içinden de erişilir.
- **Apple:** Privacy Nutrition Label (toplanan veri: telefon numarası, ad, mesaj içeriği, konum, fotoğraf/ses, kullanıcı ID, tanılama) + gerekiyorsa **Privacy Manifest** (`PrivacyInfo.xcprivacy`; Expo config + kullanılan SDK'ların manifest'leri).
- **Google:** **Data Safety** formu. Bu form ile gerçekte toplanan veri **birebir tutarlı** olmalı.
- Yeni SDK / analitik / Sentry gibi bir şey eklendiğinde toplanan veri değişir → beyanlar aynı PR'da güncellenir.
- Sentry'ye telefon/ad gönderilmez (Bölüm 8.2) — beyanla tutarlılık için de önemli.

### 15.5 İzinler
- Sadece gerçekten kullanılan izin istenir; **izin, özelliği kullanacağı anda** istenir (açılışta toptan değil). Reddedilirse açıklayıcı ekran + ayarlara yönlendirme.
- **iOS izin açıklamaları** (`NSCameraUsageDescription`, `NSMicrophoneUsageDescription`, `NSLocationWhenInUseUsageDescription`, `NSPhotoLibraryUsageDescription`) **TR ve AR olarak yerelleştirilir** (Expo `locales`), net ve dürüst yazılır ("Sesli mesaj göndermek için mikrofon gerekir").
- **Konum:** sadece "uygulama açıkken". Arka plan konumu yok.
- **Android:** gereksiz `READ_EXTERNAL_STORAGE` / geniş medya izni isteme; görsel seçimde sistem seçicisini (photo picker) kullan. `app.config.ts`'te kullanılmayan izinleri `blockedPermissions` ile çıkar.
- **iOS arka plan modları** (`UIBackgroundModes`) sadece gerçekten gerekiyorsa; sesli mesaj oynatma için arka plan sesi gerekmiyorsa ekleme.

### 15.6 Giriş (SMS OTP)
- Sadece telefon OTP ile giriş **Apple "Sign in with Apple" şartını doğurmaz.** Ama Google/Facebook gibi üçüncü taraf giriş eklenirse Apple'ın giriş kuralı yeniden kontrol edilir.
- **İnceleme hesabı:** Apple ve Google inceleyicisi gerçek SMS alamayabilir. Supabase'de **test telefon numarası + sabit OTP** tanımlanır; bu bilgi App Store Connect "App Review Notes" ve Play Console "App access" kısmına yazılır. Test hesabında kilitli oda/abonelik akışı da görülebilmelidir (manuel `subscriptions` kaydı).
- OTP rate limit ve deneme limiti (Bölüm 4.3) inceleme numarasını bozmaz; test numarası için ayrı tanım yap.

### 15.7 Ödeme (ileride)
- Dijital abonelik ve ilan sabitleme: iOS'ta **Apple In-App Purchase**, Android'de **Google Play Billing** (Bölüm 11). Sanal POS / GSM ödeme bu ürünlerde mağaza reddi riski taşır.
- Mağaza fiyatları App Store Connect / Play Console'da tanımlanır; `app_settings` fiyatı sadece gösterim/yönetim içindir, mağaza fiyatıyla çelişmemelidir.

### 15.8 "Yarım uygulama" reddi
- Release build'de **"Yakında" butonu, boş placeholder ekran, çalışmayan düğme** bırakma; mağaza bunları eksik uygulama diye reddedebilir. Ödeme stub'ı (Bölüm 11) yayın sürümünde ya tamamen gizlenir ya da çalışır hale getirilir.
- Dev-only debug ekranı release'te bulunmaz (`__DEV__` ile gate'li, ek olarak build'e girmediğini doğrula).
- Hata ve boş durumlar, çökme olmadan her iki platformda ve her iki dilde (RTL dahil) düzgün görünür.

### 15.9 Derleme, sürüm, test
- Derleme **EAS Build** ile: iOS `.ipa`, Android **App Bundle (`.aab`)**. Expo SDK ve **hedef API/SDK seviyesi** mağazanın güncel şartını karşılayacak şekilde güncel tutulur (kontrol: resmi doküman / Context7).
- Sürüm: `version` (kullanıcıya görünen) + iOS `buildNumber` / Android `versionCode` her yüklemede artar. EAS `autoIncrement` kullan.
- Dağıtım kanalları: iOS **TestFlight**, Android **Internal / Closed testing** → sonra production. Kişisel geliştirici hesabıysa Google'ın yeni hesaplar için kapalı test şartı var mı **kontrol et** (şart varsa takvimi buna göre planla).
- Push: iOS için APNs anahtarı, Android için FCM (`google-services.json`); **gerçek cihazda** test (simülatör/emülatör yetmez).
- Deep link: iOS Universal Links + Android App Links.
- Mağaza listesi (ad, açıklama, anahtar kelime, ekran görüntüsü) **TR + AR** ayrı hazırlanır; ekran görüntüleri her iki dilde (AR için RTL) alınır. Her iki mağazada ekran görüntüsü boyut şartları kontrol edilir.

### 15.10 Yayın öncesi kontrol listesi
- [ ] UGC: koşullar kabulü, filtre, şikayet, engelleme, admin kuyruğu çalışıyor
- [ ] Uygulama içi hesap silme çalışıyor + Google için web silme linki hazır
- [ ] Gizlilik politikası URL'si (TR+AR) yayında; Apple Nutrition Label + Privacy Manifest, Google Data Safety dolduruldu ve gerçekle tutarlı
- [ ] İzinler minimum; iOS izin metinleri TR+AR; kullanılmayan Android izinleri çıkarıldı
- [ ] İnceleme için test telefonu + sabit OTP tanımlı ve review notlarında yazılı
- [ ] Release build'de placeholder / "Yakında" / debug ekranı yok
- [ ] iOS ve Android'de gerçek cihazda uçtan uca denendi (TR + AR/RTL)
- [ ] Yaş/içerik derecelendirme anketleri doğru dolduruldu
- [ ] Sürüm/build numarası artırıldı, hedef SDK/API seviyesi güncel
- [ ] Push (APNs + FCM), deep link, harita anahtarları üretim ortamında doğrulandı