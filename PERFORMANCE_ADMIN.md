# PERFORMANCE_ADMIN.md — Next.js Admin Paneli + Supabase Performans Ölçümü

> Amaç: Admin panelinin (Next.js) Supabase bağlantılarını **ölçmek**, darboğazı bulmak ve düzeltmek.
> Kural: **Ölç → bul → düzelt → tekrar ölç.** Ölçmeden optimizasyon yapma, tahmin yazma.
> Bu dosya `RULES.md` ile birlikte okunur (RLS, React Query, MCP kuralları orada).
> Ölçümler **production build** üzerinde yapılır (`npm run build` → `npm run start`). `next dev` ölçümü anlamsızdır.

---

## 1. Ne ölçülür?

| Katman | Metrik | Nasıl bakılır |
|---|---|---|
| Veritabanı | Sorgu süresi (ms), plan (seq scan / index scan), satır sayısı | `EXPLAIN (ANALYZE, BUFFERS)`, Supabase logları, `pg_stat_statements` |
| RLS | Policy'li sorgunun policy'siz sorguya göre yavaşlaması | Aynı sorguyu rol/JWT ile ve ile olmadan karşılaştır |
| API (Supabase → Next) | İstek sayısı, payload boyutu, gecikme | Tarayıcı DevTools → Network, sunucuda süre ölçümü |
| Next.js sunucu | Sayfa/route handler süresi, server-side fetch süreleri | `Server-Timing` header, `performance.now()` |
| İstemci | LCP, INP, CLS, hydration süresi, JS boyutu | Lighthouse, Web Vitals, React Profiler, bundle analyzer |
| React Query | Cache isabeti, gereksiz refetch, waterfall | React Query Devtools |
| Bağlantı | Eşzamanlı bağlantı, pool doygunluğu | Supabase dashboard → Database → Connections |

### Hedefler (başlangıç önerisi, projeye göre ayarla)
| Konu | Hedef |
|---|---|
| Tek sorgu (indeksli, liste) | < 50 ms (DB içi) |
| Sayfa ilk yükleme (veri dahil, LCP) | < 2.5 sn |
| Tablo sayfa değişimi (filtre/sayfalama) | < 300 ms algılanan |
| Etkileşim gecikmesi (INP) | < 200 ms |
| Bir sayfadaki Supabase isteği | Mümkün olduğunca az, **N+1 yok** |

---

## 2. Ön hazırlık

1. **Aynı veriyle ölç.** Küçük veride her şey hızlı görünür. Dev/staging projesine gerçekçi veri bas (örn. `messages` ve `pinned_listings` için on binlerce satır, 81 şehir). Prod'da ölçüm yapma, prod'a yazma yok (RULES 4.4).
2. **Ortamı sabitle.** Aynı ağ, aynı makine, production build. Her ölçümü en az **5 kez** tekrarla, **ortanca (median)** ve en kötü değeri yaz. İlk çalıştırmayı (soğuk cache) ayrı not et.
3. **Bölge farkını bil.** Supabase projesinin bölgesi ile Next.js'in çalıştığı bölge/kullanıcı konumu arasındaki gecikme her isteğe eklenir. Sonuçlara ağ gecikmesini (RTT) not et; sorgu yavaşlığıyla karıştırma.
4. **Araçlar:** Chrome DevTools, Lighthouse, React Query Devtools, `@next/bundle-analyzer`, Supabase dashboard (Logs, Query Performance, Advisors). AI asistanla çalışıyorsan **Supabase MCP**'den performans/güvenlik uyarılarını (advisor) ve logları çektir, **Context7** ile güncel Next.js/supabase-js önerilerini doğrula.

---

## 3. Veritabanı ölçümü

### 3.1 Önce Supabase'in kendi uyarılarına bak
- **Performance Advisor** (dashboard ya da MCP): eksik FK indexleri, kullanılmayan indexler, yavaş RLS policy uyarıları burada çıkar. Önce bunları temizle.
- **Query Performance** (dashboard): toplam süreye ve çağrı sayısına göre en pahalı sorgular (`pg_stat_statements` tabanlı). **Sık çağrılan orta yavaş sorgu**, nadir çağrılan çok yavaş sorgudan daha çok zarar verir.

### 3.2 Tekil sorguyu `EXPLAIN ANALYZE` ile ölç
SQL Editor'de (dev projesinde):

```sql
explain (analyze, buffers)
select *
from public.pinned_listings
where city_id = 34
  and status = 'active'
  and expires_at > now()
order by starts_at desc;
```

Bakılacaklar:
- `Seq Scan` var mı? Büyük tabloda genelde kötüdür → index gerekir.
- `Execution Time` kaç ms?
- `Rows Removed by Filter` çok yüksekse index filtreye uymuyor demektir.
- `Sort` adımı pahalıysa sıralama kolonu index'e dahil edilebilir.

> Mevcut index: `idx_pinned_city_expires (city_id, expires_at)`. `status` filtresi ve `starts_at` sıralaması da varsa bu index tam karşılamayabilir; plana bakıp karar ver (partial index vb.).

### 3.3 RLS ile ölç (asıl gerçek maliyet)
Gerçek kullanıcı gibi (RLS açık) ölç:

```sql
begin;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"<kullanici-uuid>","role":"authenticated"}';

explain (analyze, buffers)
select * from public.messages where room_id = 34 order by created_at desc limit 50;

rollback;
```

RLS kontrol listesi:
- Policy içinde `auth.uid()` doğrudan çağrılıyorsa her satır için yeniden değerlendirilebilir. `(select auth.uid())` şeklinde sarmala, tek seferde hesaplansın.
- Policy'de kullanılan kolonlar (`user_id`, `room_id`, `role` kontrolü) **index'li** olmalı.
- Policy içinde başka tabloya bakan alt sorgu (örn. `profiles.role = 'admin'` kontrolü) pahalıdır; mümkünse `security definer` yardımcı fonksiyonla tek seferlik kontrol et.
- Aynı sorguyu **RLS'siz** (service role / `postgres` rolü) ve **RLS'li** ölç; farkı yaz.

### 3.4 Index kontrolü
- Foreign key kolonlarında index var mı? (`city_id`, `message_id`, `user_id`, `room_id`...)
- Sık filtrelenen/sıralanan kolonlar için bileşik index mantıklı mı?
- Kullanılmayan index'ler yazmayı yavaşlatır; advisor'daki "unused index" uyarısını değerlendir.
- Index eklemek şema değişikliğidir → **migration dosyası** ile (RULES 4.4).

---

## 4. Supabase → Next.js istek ölçümü

### 4.1 Kod içi süre ölçümü
Api fonksiyonlarını sarmalayan küçük bir yardımcı (`admin/src/lib/perf.ts`):

```ts
import { logger } from '@/lib/logger';

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

Kullanım:

```ts
const quotas = await measure('getCityQuotas', () => getCityQuotas());
```

> Sadece ölçüm sırasında kullan; işin sonunda gereksiz olanları sil (RULES: gereksiz debug bırakma).

### 4.2 Sunucu tarafı (Server Component / Route Handler)
- Server-side fetch süresini `Server-Timing` header'ıyla DevTools → Network → Timing sekmesinde gör.
- **Waterfall kontrolü:** Birbirine bağımlı olmayan sorgular `Promise.all` ile paralel mi? Sıralı `await` zinciri toplam süreyi katlar.
- Aynı veriyi hem sunucuda hem istemcide mi çekiyorsun? Çift istek = boşa maliyet.

### 4.3 İstemci tarafı (React Query)
- React Query Devtools: aynı key için gereksiz refetch var mı? `staleTime` uygun mu (varsayılan: 30 sn)?
- Sayfalamalı listelerde `placeholderData: keepPreviousData` kullanılıyor mu (tablo boşalıp titremesin)?
- Mutation sonrası **tüm** cache'i değil, ilgili key'i invalidate et.
- Bir ekrandaki istek sayısını say: Network sekmesinde `supabase.co` isteklerini filtrele.

### 4.4 Payload boyutu
- `select('*')` yerine **sadece gereken kolonlar**.
- Liste sorgularında **`limit` / `range`** zorunlu; sınırsız sorgu yok.
- `count: 'exact'` büyük tablolarda pahalıdır. Gerek yoksa kullanma; gerekiyorsa `'estimated'` / `'planned'` seçeneklerini değerlendir.
- Join (`select('*, city:cities(...)')`) tek istekte çözüyorsa N+1'den iyidir; ama join'lenen kolonları da sınırla.
- Sayımları/agregasyonları istemcide döngüyle değil sunucuda (view / RPC) yap (örn. şehir başına aktif ilan sayısı).

---

## 5. Next.js ölçümü

### 5.1 Lighthouse / Web Vitals
- Chrome DevTools → Lighthouse (Desktop + Mobile), gizli pencerede, eklentiler kapalı.
- Önemli sayfalar: giriş, dashboard özeti, kullanıcılar tablosu, raporlar, ayarlar.
- Not al: LCP, INP, CLS, TBT, toplam JS boyutu.

### 5.2 Bundle boyutu
```powershell
cd admin
npm install -D @next/bundle-analyzer
# next.config'te etkinleştirdikten sonra:
$env:ANALYZE="true"; npm run build
```
- Büyük bağımlılıklar: `recharts`, `@tanstack/react-table`, tarih kütüphaneleri. Sadece gereken sayfada **dynamic import** ile yükle.
- Dashboard grafikleri sayfa ilk açılışını bloklamasın (lazy / `Suspense`).

### 5.3 Render / hydration
- React DevTools Profiler: büyük tabloda gereksiz re-render var mı?
- Büyük listelerde sayfalama veya sanallaştırma kullan.
- Server Component'ta yapılabilecek veri çekme istemciye taşınmasın (istemci JS'i artırır, ek istek doğurur).

### 5.4 Bağlantı yönetimi (serverless ortam)
- Her istekte yeni `createClient()` normaldir (supabase-js HTTP/REST kullanır), ancak **doğrudan Postgres bağlantısı** kullanan bir şey eklersen (ORM, migration aracı) **bağlantı havuzunu (pooler)** kullan; serverless'ta bağlantı sayısı hızla tükenir.
- Dashboard'da bağlantı sayısını izle; yük testi sırasında zirve değeri yaz.

---

## 6. Test senaryoları (bu projeye özel)

Her senaryo için süreyi, istek sayısını ve payload'ı ölç.

| # | Senaryo | Dikkat edilecek |
|---|---|---|
| 1 | Dashboard özeti açılışı | Kaç Supabase isteği? Paralel mi? |
| 2 | Şehir kotaları tablosu (`getCityQuotas`) | İstemcide sayım, 81 şehir; view/RPC'ye gerek var mı? |
| 3 | Sabit ilanlar listesi, şehre + duruma göre filtre, sayfa 1 → 50 | `idx_pinned_city_expires` kullanılıyor mu? `count` maliyeti? |
| 4 | Kullanıcılar tablosu, arama + sayfalama | Arama sorgusu index kullanıyor mu (`ilike` yavaş olabilir)? |
| 5 | Şikayetler listesi + içerik detayı | Join/N+1 var mı? |
| 6 | Ayar güncelleme (kota) → liste yenileme | Mutation sonrası gereksiz tam refetch? |
| 7 | Eşzamanlı yük (örn. 20-50 eşzamanlı admin isteği) | Hata oranı, p95 süre, bağlantı sayısı |

---

## 7. Ölçüm kayıt tablosu (kopyala, doldur)

**Ortam:** (Supabase bölgesi / host bölgesi / veri boyutu / tarih)

| Senaryo | Önce (median ms) | Önce (en kötü) | İstek sayısı | Payload (KB) | Değişiklik | Sonra (median ms) |
|---|---|---|---|---|---|---|
| Örn. Sabit ilan listesi | | | | | | |

**Not:** Her değişiklikten sonra aynı senaryoyu aynı veriyle tekrar ölç; yalnızca **bir** şeyi değiştir ki etkiyi ayırabilesin.

---

## 8. Sık görülen sorunlar ve çözümleri

| Belirti | Olası neden | Çözüm |
|---|---|---|
| Liste yavaş, `Seq Scan` | Index yok / filtreye uymuyor | Bileşik veya partial index (migration ile) |
| RLS açıkken çok yavaş | `auth.uid()` her satırda, policy kolonları index'siz, alt sorgu | `(select auth.uid())`, index, `security definer` yardımcı fonksiyon |
| Sayfada çok sayıda istek | N+1, döngüde sorgu | Join, `in` filtresi, RPC/view |
| Tablo sayfa geçişinde titreme | `keepPreviousData` yok | `placeholderData: keepPreviousData` |
| Sayım yavaş | `count: 'exact'` büyük tabloda | `estimated`/`planned` ya da ayrı sayaç |
| Sayfa ilk açılış ağır | Büyük JS, her şey istemcide | Server Component, dynamic import, kolon/limit azalt |
| Aynı veri iki kez çekiliyor | Sunucu + istemci çift fetch | Tek yerde çek, React Query'e hydrate et |
| Zirve yükte hata | Bağlantı doygunluğu | Pooler, istek sayısını azalt, cache |
| Admin saatiyle sunucu saati farkı | İstemci `new Date()` ile `expires_at` filtresi | Sunucu saatiyle view/RPC (`now()`) |

---

## 9. Raporlama şablonu

```
## Performans Raporu — <tarih>
Ortam: ...
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

## 10. Bitirme kontrol listesi

- [ ] Ölçümler production build'de, gerçekçi veriyle ve en az 5 tekrarla yapıldı
- [ ] Performance Advisor uyarıları incelendi (FK index, unused index, RLS)
- [ ] En yavaş 5 sorgu `EXPLAIN (ANALYZE, BUFFERS)` ile incelendi
- [ ] RLS'li ve RLS'siz süre karşılaştırıldı
- [ ] Hiçbir liste sorgusu sınırsız (`limit`/`range` var), `select('*')` gereksizse daraltıldı
- [ ] Bir sayfada N+1 yok, bağımsız sorgular paralel
- [ ] React Query cache davranışı (staleTime, invalidate) kontrol edildi
- [ ] Bundle analizi yapıldı, büyük bağımlılıklar lazy yüklendi
- [ ] Değişiklikler migration dosyasıyla yapıldı, sonuçlar tabloya yazıldı
- [ ] Ölçüm için eklenen geçici kodlar (`measure`, debug log) temizlendi
