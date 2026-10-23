# PERFORMANCE_MOBILE.md — React Native (Expo) + Supabase Performans Ölçümü

> Amaç: Mobil uygulamanın (Expo / React Native) açılış hızını, ekran akıcılığını ve Supabase bağlantılarının maliyetini **ölçmek**, darboğazı bulup düzeltmek.
> Kural: **Ölç → bul → düzelt → tekrar ölç.** Tahminle optimizasyon yok.
> Bu dosya `RULES.md` ile birlikte okunur (React Query, Realtime, RLS, MCP kuralları orada).
> **Ölçümler release build + gerçek cihazda yapılır.** Dev modu (Metro, `__DEV__`) ve emülatör sonuçları yanıltıcıdır.

---

## 1. Ne ölçülür?

| Alan | Metrik | Nasıl bakılır |
|---|---|---|
| Açılış | Cold start süresi (ikon → ilk kullanılabilir ekran) | Kronometre/ekran kaydı, Sentry performance, `performance.now()` |
| Ekran | İlk veri gelene kadar süre, geçiş süresi | `measure()` yardımcısı, ekran kaydı kare kare |
| Akıcılık | JS FPS / UI FPS, takılan kare oranı | Perf Monitor, Android profiler, Xcode Instruments |
| Liste | Kaydırma akıcılığı, ilk render | Düşük seviye cihazda elle test + profiler |
| Ağ | İstek sayısı, payload (KB), gecikme | Network inspector (Flipper/Reactotron/React Native DevTools), Supabase logları |
| Bellek | Ekran başına RAM artışı, sızıntı | Android Studio Profiler / Xcode Instruments |
| Bundle | JS bundle boyutu, paket (APK/AAB/IPA) boyutu | `npx expo export`, `expo-atlas`, EAS build çıktısı |
| Realtime | Açık kanal sayısı, kapanmayan abonelik | Supabase dashboard (Realtime) + kod incelemesi |
| Pil/Isınma | Arka plan ağ/CPU kullanımı | Cihaz pil istatistikleri, profiler |

### Hedefler (başlangıç önerisi, projeye göre ayarla)
| Konu | Hedef |
|---|---|
| Cold start (orta seviye cihaz) | < 2-3 sn |
| Ekran açılışında ilk içerik (cache'li) | Anında (skeleton hemen) |
| Liste ilk veri (ağdan) | < 1 sn (iyi ağda) |
| Kaydırma | Takılma yok, ~60 FPS hedef |
| Bir ekranın istek sayısı | Mümkün olduğunca az, N+1 yok |
| Mesaj gönderme (algılanan) | Anında (optimistic) |

---

## 2. Ön hazırlık

1. **Release build al:**
   ```powershell
   cd mobile
   # Android (yerel release)
   npx expo run:android --variant release
   # ya da EAS ile
   eas build --profile preview --platform android
   ```
   iOS için de `preview`/`release` profili ile gerçek cihaza kur (TestFlight veya internal dağıtım).
2. **Gerçek cihaz, özellikle düşük/orta seviye Android.** Üst seviye iPhone'da her şey hızlı görünür; sorun düşük cihazda çıkar. Mümkünse en az iki cihaz: biri düşük, biri üst seviye.
3. **Gerçekçi veri:** Dev/staging Supabase projesinde dolu odalar (çok mesajlı), 81 şehir, aktif sabit ilanlar. Prod'da ölçüm/yazma yok (RULES 4.4).
4. **Ağ koşulları:** İyi Wi-Fi + yavaş 4G/zayıf sinyal ayrı ayrı. Gecikmeyi (RTT) not et.
5. **Soğuk / sıcak ayrımı:** Cold start (uygulama tamamen kapalıyken) ile warm start (arka plandan dönüş) ayrı ölçülür. Her ölçümü en az **5 kez** tekrarla, **ortanca** ve en kötü değeri yaz.
6. **Aynı şeyi iki dilde de bak:** TR (LTR) ve AR (RTL) için ayrı geçişlerde ölçüm (font yükleme, yeniden başlatma maliyeti).
7. **AI asistanla çalışıyorsan:** DB tarafı için **Supabase MCP** (advisor + loglar), kütüphane önerileri için **Context7** kullan; tahmin yazma.

---

## 3. Kod içi süre ölçümü

`mobile/src/lib/perf.ts` (geçici ölçüm yardımcısı):

```ts
import { logger } from './logger';

const log = logger.scope('perf');

export const measure = async <T>(label: string, fn: () => Promise<T>): Promise<T> => {
  const start = performance.now();
  try {
    return await fn();
  } finally {
    log.debug(`${label}: ${(performance.now() - start).toFixed(0)} ms`);
  }
};
```

Api fonksiyonunda:

```ts
export const fetchActivePinnedListings = (cityId: number) =>
  measure('fetchActivePinnedListings', async () => {
    // ... mevcut supabase sorgusu
  });
```

Ekran açılışı için: ekranın mount anını, **ilk verinin render edildiği anı** işaretle.

> `logger.debug` sadece dev'de çalışır. Release'te süre görmek için ölçüm sırasında geçici olarak Sentry breadcrumb/transaction kullan ya da ölçüm build'inde logger seviyesini aç. İş bitince geçici kodu sil (RULES: gereksiz debug bırakma, `console.log` yok).

---

## 4. Supabase isteklerinin ölçümü

### 4.1 İstek sayısı ve payload
- Bir ekranı açıp **kaç Supabase isteği** gittiğini say (network inspector). Hedef: N+1 yok, bağımsız istekler paralel (`Promise.all`).
- `select('*')` yerine sadece gereken kolonlar. Liste sorgularında `limit`/`range` zorunlu.
- Payload KB'ını not et (özellikle mesaj listesi, oda listesi, profil).

### 4.2 React Query
- Aynı key için gereksiz refetch var mı? `staleTime` (varsayılan 30 sn) uygun mu?
- Mobilde `refetchOnWindowFocus` kapalı olmalı; `focusManager` AppState'e bağlı mı?
- Sunucu verisini zustand'a kopyalama (çift state, gereksiz render).
- Mesaj akışı: `useInfiniteQuery` + Realtime'de `setQueryData` ile ekleme; **tam refetch yok**.
- Mutation'larda optimistic update (mesaj gönderme) + `onError` rollback.
- Offline/yavaş ağda cache'ten gösterim (`mmkv` persist varsa) çalışıyor mu?

### 4.3 Veritabanı tarafı (ağ değil, sorgu yavaşsa)
Süre uzunsa sorun ağda mı sorguda mı ayır:
- **Supabase Performance Advisor** ve **Query Performance** (dashboard/MCP): eksik FK index, yavaş RLS policy, en pahalı sorgular.
- Şüpheli sorguyu `EXPLAIN (ANALYZE, BUFFERS)` ile incele, **RLS açıkken** (authenticated rol + JWT claims) ölç. Detaylar için `PERFORMANCE_ADMIN.md` Bölüm 3.
- RLS policy'lerinde `(select auth.uid())` kullanımı, policy kolonlarında index.

### 4.4 Realtime
- Sadece **açık odanın** `messages` kanalı dinlenir; odadan çıkınca `unsubscribe` (RULES 4.2).
- Ekranlar arası geçişte açık kalan kanal sayısını kontrol et (sızıntı → bellek, ağ, pil).
- Çok sayıda eşzamanlı abonelikte Supabase Realtime limitlerini ve mesaj/saniye yükünü dashboard'dan izle.
- Gelen her mesajda tüm listeyi yeniden render etme; sadece yeni öğeyi ekle.

---

## 5. Arayüz (JS/UI) performansı

### 5.1 Listeler (en kritik alan: oda listesi, mesaj akışı)
- Mesaj akışı için **FlashList** (RULES); basit listelerde `FlatList` ise `getItemLayout`/`keyExtractor`/`initialNumToRender`/`windowSize` ayarlı mı?
- `renderItem` içinde ağır hesap/inline fonksiyon yok; öğe komponenti `React.memo`.
- `keyExtractor` kararlı (index değil id).
- Büyük listede anlık filtre: her tuş vuruşunda pahalı hesap yapma (`useMemo`, gerekirse debounce).
- Sıralamayı (örn. `name` ile `localeCompare`) render içinde her seferinde değil `useMemo` ile yap.

### 5.2 Render ve state
- React DevTools Profiler: kaydırmada/yazmada neler yeniden render oluyor?
- Context/zustand seçicisi dar mı (tüm store'a abone olma)?
- Ağır hesapları `useMemo`/`useCallback` ile sınırla ama **önce ölç**, körlemesine sarma.

### 5.3 Animasyon
- `react-native-reanimated` animasyonları UI thread'de; JS thread'e bağımlı animasyonlardan kaçın.
- Bas-konuş dalga animasyonu, bottom sheet gibi yerlerde takılma var mı (düşük cihazda dene)?

### 5.4 Görseller ve medya
- `expo-image` kullan (cache, placeholder). Avatar/medya için uygun boyutta, **yüklemeden önce küçültülmüş** (`expo-image-manipulator`) görsel.
- Signed URL süresi/yenilemesi gereksiz yeniden indirme yaratıyor mu?
- Liste içindeki görseller kaydırmada tekrar tekrar yükleniyor mu?

### 5.5 Açılış (cold start)
- Açılışta **sadece gerekli** olan yüklensin: ağır modüller ve ilk ekranda gerekmeyen veri lazy/ertelenmiş.
- Font (Arapça font dahil), splash ve ilk ekran verisi sırayla mı paralel mi yükleniyor?
- Hermes etkin mi? (Expo'da varsayılan; doğrula.)
- Oturum/profil/entitlement çağrıları açılışta paralel mi, birbirini bekliyor mu?
- `expo-secure-store` / `mmkv` okumaları açılışı bloklamıyor mu?

### 5.6 Bundle ve paket boyutu
```powershell
cd mobile
npx expo export --platform android
# bundle içeriğini incelemek için Expo Atlas (Context7/Expo dokümanından güncel kullanım)
```
- Kullanılmayan kütüphaneleri çıkar; ağır kütüphaneleri (harita, grafik) sadece gereken ekranda yükle.
- Paket (AAB/IPA) boyutunu her sürümde not et; ani artışı yakala.

---

## 6. Platform araçları

| Platform | Araç | Ne için |
|---|---|---|
| Her ikisi | React Native DevTools / React DevTools Profiler | Render, komponent süresi |
| Her ikisi | Perf Monitor (dev menü) | JS/UI FPS (release'te sınırlı, profiler ile destekle) |
| Android | Android Studio Profiler, Perfetto, `adb shell dumpsys gfxinfo` | CPU, bellek, ağ, takılan kare |
| iOS | Xcode Instruments (Time Profiler, Allocations, Network) | CPU, bellek sızıntısı, ağ |
| Her ikisi | Sentry Performance (kuruluysa) | Gerçek kullanıcı yavaşlık/başlangıç süresi |

---

## 7. Test senaryoları (bu projeye özel)

| # | Senaryo | Dikkat edilecek |
|---|---|---|
| 1 | Cold start → 81 il listesi | Süre, ilk içerik, istek sayısı (`useRooms`, oturum, entitlement) |
| 2 | Şehir araması (her tuş vuruşu) | Filtre maliyeti, takılma (TR ve AR) |
| 3 | Odaya giriş → son 50 mesaj | İlk veri süresi, payload, Realtime kanal açılışı |
| 4 | Mesaj akışında hızlı kaydırma (yüzlerce mesaj) | FPS, bellek, görsel yükleme |
| 5 | Mesaj gönderme (metin / görsel / ses) | Algılanan gecikme (optimistic), yükleme süresi |
| 6 | Odadan çık → başka odaya gir | Kanal `unsubscribe`, bellek artışı |
| 7 | Sabit ilan listesi (şehir başına) | Sorgu süresi, cache davranışı |
| 8 | Arka plan → ön plan (warm start) | Gereksiz refetch/yeniden bağlanma |
| 9 | Zayıf ağ / uçak modu → geri dön | Hata durumu, cache'ten gösterim, tekrar deneme |
| 10 | Dil değişimi TR ↔ AR (yeniden başlatma) | Yeniden açılış süresi, RTL render maliyeti |
| 11 | 10-15 dk sürekli kullanım | Bellek artışı, pil/ısınma, açık kanallar |

---

## 8. Ölçüm kayıt tablosu (kopyala, doldur)

**Ortam:** (Cihaz modeli / OS sürümü / ağ / build tipi: release / veri boyutu / tarih)

| Senaryo | Önce (median) | Önce (en kötü) | İstek sayısı | Payload (KB) | Değişiklik | Sonra (median) |
|---|---|---|---|---|---|---|
| Örn. Cold start → il listesi | | | | | | |

**Not:** Aynı anda **tek bir** şeyi değiştir, aynı cihaz/veri/ağda tekrar ölç; yoksa etkiyi ayıramazsın.

---

## 9. Sık görülen sorunlar ve çözümleri

| Belirti | Olası neden | Çözüm |
|---|---|---|
| Açılış yavaş | Açılışta ağır iş, ardışık await, büyük bundle | Paralelleştir, ertele, lazy yükle |
| Liste kaydırmada takılıyor | Ağır `renderItem`, memo yok, `FlatList` ayarsız | `React.memo`, FlashList, ayar, sabit key |
| Her tuşta arama kasıyor | Render içinde pahalı filtre/sıralama | `useMemo`, debounce, hesapları dışarı al |
| Ekran açılışında çok istek | N+1, çift fetch, ardışık await | Join/RPC, `Promise.all`, React Query cache |
| Liste sırası karışık geliyor | Sorguda `order` yok | `.order(...)` ekle (sıra DB'de garanti değil) |
| Mesaj gelince tüm ekran yeniden çiziliyor | Tam refetch / geniş state | `setQueryData` ile ekle, dar seçici |
| Bellek sürekli artıyor | Kapanmayan Realtime aboneliği, büyük görseller | `unsubscribe`, görseli küçült, listeyi sınırla |
| Görseller sürekli yeniden iniyor | Cache yok, signed URL her seferinde değişiyor | `expo-image` cache, URL süresini uzat/önbellekle |
| Yavaş ağda uygulama donuyor | Zaman aşımı/loading yönetimi yok | Skeleton, timeout, cache'ten göster, tekrar dene |
| Sorgu yavaş (ağ değil) | Index yok, RLS maliyeti | `PERFORMANCE_ADMIN.md` Bölüm 3 |
| Sadece Arapçada yavaş | Font yükleme, RTL yeniden başlatma, hizalama hesapları | Fontu önceden yükle, RTL render'ı profille |

---

## 10. Raporlama şablonu

```
## Mobil Performans Raporu — <tarih>
Cihaz(lar): ...   Build: release   Ağ: ...
Veri boyutu: ...

### Bulgular
1. <senaryo>: <önce> → <sonra> (<ne değişti>)
2. ...

### Kalan darboğazlar
- ...

### Yapılacaklar
- [ ] ...
```

---

## 11. Bitirme kontrol listesi

- [ ] Ölçümler **release build + gerçek cihazda** (en az bir düşük seviye Android) yapıldı
- [ ] Cold start ve warm start ayrı ölçüldü, her ölçüm ≥ 5 tekrar
- [ ] İyi ve zayıf ağda test edildi, hata/boş/yükleniyor durumları düzgün
- [ ] TR ve AR (RTL) için kritik ekranlar ölçüldü
- [ ] Her ekranın Supabase istek sayısı sayıldı; N+1 yok, bağımsız istekler paralel
- [ ] Liste sorguları `limit`/`order` içeriyor, `select('*')` gereksizse daraltıldı
- [ ] Realtime: sadece açık oda dinleniyor, çıkışta `unsubscribe` doğrulandı
- [ ] Mesaj akışında tam refetch yok, optimistic update çalışıyor
- [ ] Listelerde (özellikle mesaj akışı) kaydırma akıcı, bellek sabit kalıyor
- [ ] Bundle/paket boyutu not edildi, gereksiz bağımlılıklar temizlendi
- [ ] Sonuçlar kayıt tablosuna yazıldı; geçici ölçüm kodları (`measure`, debug log) temizlendi
