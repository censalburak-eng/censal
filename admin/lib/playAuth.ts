import { google, androidpublisher_v3 } from "googleapis";
import { createClient } from "@/lib/server";
import { NextResponse, connection } from "next/server";

export interface PlayProductItem {
  productId: string;
  title: string;
  type: "subscription" | "onetime";
  basePlanId?: string | null;
  currentPrice: number | null;
  currency: string;
  units: string;
  nanos: number;
  regionsVersion?: string | null;
  allowed: boolean;
}

/**
 * Mock modunda mı çalışılıyor?
 * PLAY_MOCK=1 ise veya PLAY_SA_JSON girilmemişse mock mod devreye girer.
 */
export function isMockMode(): boolean {
  return process.env.PLAY_MOCK === "1" || !process.env.PLAY_SA_JSON;
}

/**
 * Uygulama paket adı. Sadece env'den okunur, sabit veya ".dev" eklenmez.
 */
export function getPackageName(): string {
  const pkg = process.env.PLAY_PACKAGE_NAME;
  if (!pkg && !isMockMode()) {
    throw new Error("PLAY_PACKAGE_NAME ortam değişkeni tanımlanmamış.");
  }
  return pkg || "com.censal.app";
}

/**
 * İzin verilen ürün ID'leri listesi (PLAY_ALLOWED_PRODUCT_IDS).
 * Boş veya tanımsızsa tüm ürünlere izin verilir (veya test modunda sınırlandırılır).
 */
export function getAllowedProductIds(): string[] | null {
  const raw = process.env.PLAY_ALLOWED_PRODUCT_IDS;
  if (!raw) return null;
  const list = raw.split(",").map((s) => s.trim()).filter(Boolean);
  return list.length > 0 ? list : null;
}

/**
 * Ürünün fiyatının değiştirilmesine izin var mı kontrol eder.
 */
export function isProductAllowed(productId: string): boolean {
  const allowed = getAllowedProductIds();
  if (!allowed) return true;
  return allowed.includes(productId);
}

/**
 * Google Play Developer API (androidpublisher v3) istemcisi oluşturur.
 * Service account JSON'ı güvenli şekilde env'den okunur, loglanmaz.
 */
export function getPlayClient(): {
  play: androidpublisher_v3.Androidpublisher;
  packageName: string;
} {
  const saJson = process.env.PLAY_SA_JSON;
  if (!saJson) {
    throw new Error("PLAY_SA_JSON ortam değişkeni bulunamadı.");
  }

  try {
    const credentials = JSON.parse(saJson);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/androidpublisher"],
    });

    const play = google.androidpublisher({
      version: "v3",
      auth,
    });

    return {
      play,
      packageName: getPackageName(),
    };
  } catch (err) {
    console.error("Google Play Auth Initialization Error:", err instanceof Error ? err.message : "Geçersiz JSON");
    throw new Error("Google Play Service Account kimlik doğrulama bilgisi yüklenemedi.");
  }
}

/**
 * Route Handler'lar için Admin Kullanıcı Doğrulaması.
 * Supabase auth session ve admins tablosundaki 'admin' rolünü doğrular.
 */
export async function verifyAdmin(): Promise<
  | { authorized: true; userId: string; userEmail: string }
  | { authorized: false; response: NextResponse }
> {
  await connection();
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        authorized: false,
        response: NextResponse.json(
          { error: "Oturum açılmamış veya yetkisiz erişim." },
          { status: 401 }
        ),
      };
    }

    // Admins tablosundan yetki kontrolü
    const { data: adminRecord, error: adminErr } = await supabase
      .from("admins")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (adminErr || !adminRecord) {
      // Yedek kontrol: profiles.role === 'admin'
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.role !== "admin") {
        return {
          authorized: false,
          response: NextResponse.json(
            { error: "Bu işlem için yönetici (admin) yetkisi gereklidir." },
            { status: 403 }
          ),
        };
      }
    }

    return {
      authorized: true,
      userId: user.id,
      userEmail: user.email || "",
    };
  } catch (err) {
    console.error("Admin verification error:", err);
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Yetki doğrulaması sırasında bir hata oluştu." },
        { status: 500 }
      ),
    };
  }
}

/**
 * TL fiyatını float olarak alıp units ve nanos değerlerine dönüştürür.
 * Float duyarlılık hatalarını engellemek için kuruş üzerinden hesaplanır.
 * Örnek: 49.99 TL -> units: "49", nanos: 990000000
 */
export function convertPriceToUnitsAndNanos(price: number): {
  units: string;
  nanos: number;
} {
  if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) {
    throw new Error("Fiyat pozitif bir sayı olmalıdır.");
  }

  if (price > 10000) {
    throw new Error("Fiyat 10.000 TL sınırını aşamaz.");
  }

  // En fazla 2 ondalık basamak doğrulaması
  const rounded = Math.round(price * 100) / 100;
  if (Math.abs(price - rounded) > 0.0001) {
    throw new Error("Fiyat en fazla 2 ondalık basamağa sahip olabilir (örn: 49.99).");
  }

  const totalCents = Math.round(price * 100);
  const units = Math.floor(totalCents / 100).toString();
  const nanos = (totalCents % 100) * 10_000_000;

  return { units, nanos };
}

/**
 * Google Play Developer API hatalarını Türkçe anlaşılır mesajlara dönüştürür.
 * Ham hata sunucu terminalinde loglanır.
 */
export function formatPlayError(err: unknown): {
  status: number;
  message: string;
} {
  console.error("Google Play API Raw Error:", err);

  const errorObj = err as any;
  const status = errorObj?.status || errorObj?.response?.status || 500;
  const rawMessage = errorObj?.message || errorObj?.response?.data?.error?.message || "";

  if (status === 401) {
    return {
      status: 401,
      message: "Google Play kimlik doğrulama hatası. Service Account izinlerini kontrol edin.",
    };
  }

  if (status === 403) {
    if (rawMessage.includes("has not granted the query authority") || rawMessage.includes("Permission denied")) {
      return {
        status: 403,
        message: "Google Play Console'da bu Service Account için 'Finansal verileri görüntüle ve fiyatları yönet' izni bulunmuyor.",
      };
    }
    return {
      status: 403,
      message: "Google Play API erişim reddedildi (403). Service Account yetkilerini kontrol edin.",
    };
  }

  if (status === 404) {
    return {
      status: 404,
      message: "İlgili paket adı veya ürün Google Play Console'da bulunamadı.",
    };
  }

  if (status === 400) {
    if (rawMessage.includes("regionsVersion")) {
      return {
        status: 400,
        message: "Bölge sürümü (regionsVersion) uyuşmazlığı. Lütfen güncel bölge sürümünü kullanın.",
      };
    }
    if (rawMessage.includes("price")) {
      return {
        status: 400,
        message: `Geçersiz fiyat yapılandırması: ${rawMessage}`,
      };
    }
    return {
      status: 400,
      message: `Google Play istek parametresi geçersiz: ${rawMessage || "Hatalı parametre"}`,
    };
  }

  return {
    status: 500,
    message: rawMessage || "Google Play API ile iletişim kurulurken beklenmeyen bir hata oluştu.",
  };
}

/**
 * En güncel Google Play bölge sürümü (regionsVersion).
 * Google Play artık '2026/01' sürümünü zorunlu tutmaktadır.
 */
export function getLatestRegionsVersion(resource?: any): string {
  if (resource?.regionsVersion?.version) {
    return resource.regionsVersion.version;
  }
  return process.env.PLAY_REGIONS_VERSION || "2026/01";
}

/**
 * Mock modunda dönen temsili test ürünleri
 */
export const MOCK_PLAY_PRODUCTS: PlayProductItem[] = [
  {
    productId: "censal_premium_monthly",
    title: "Aylık Şehir Odaları Premium Abonelik",
    type: "subscription",
    basePlanId: "monthly-plan",
    currentPrice: 99.99,
    currency: "TRY",
    units: "99",
    nanos: 990000000,
    regionsVersion: "2026/01",
    allowed: true,
  },
  {
    productId: "censal_premium_yearly",
    title: "Yıllık Şehir Odaları VIP Abonelik",
    type: "subscription",
    basePlanId: "yearly-plan",
    currentPrice: 1199.99,
    currency: "TRY",
    units: "1199",
    nanos: 990000000,
    regionsVersion: "2026/01",
    allowed: true,
  },
  {
    productId: "censal_pin_24h",
    title: "24 Saatlik İlan Sabitleme Hakkı",
    type: "onetime",
    basePlanId: "censal-pin",
    currentPrice: 199.99,
    currency: "TRY",
    units: "199",
    nanos: 990000000,
    regionsVersion: "2026/01",
    allowed: true,
  },
];
