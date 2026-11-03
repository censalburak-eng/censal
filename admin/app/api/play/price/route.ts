import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/server";
import {
  verifyAdmin,
  isMockMode,
  getPlayClient,
  formatPlayError,
  convertPriceToUnitsAndNanos,
  isProductAllowed,
  getLatestRegionsVersion,
  MOCK_PLAY_PRODUCTS,
} from "@/lib/playAuth";

interface PriceChangeRequestBody {
  type: "subscription" | "onetime";
  productId: string;
  basePlanId?: string;
  price: number;
  dryRun?: boolean;
  applyToExisting?: boolean;
}

/**
 * productId'den app_settings kolonunu belirler.
 * Örn: censal_premium_monthly → price_monthly
 */
function getSettingsColumn(productId: string): "price_monthly" | "price_yearly" | "price_pin_24h" | null {
  if (productId.includes("monthly")) return "price_monthly";
  if (productId.includes("yearly")) return "price_yearly";
  if (productId.includes("pin")) return "price_pin_24h";
  return null;
}

/**
 * app_settings tablosundaki ilgili fiyat kolonunu günceller.
 * Başarısız olsa bile ana işlem etkilenmez (fire-and-forget).
 */
async function syncPriceToSettings(
  supabase: Awaited<ReturnType<typeof import("@/lib/server").createClient>>,
  productId: string,
  price: number
): Promise<void> {
  const col = getSettingsColumn(productId);
  if (!col) return;
  try {
    await supabase.from("app_settings").update({ [col]: price }).eq("id", 1);
  } catch (err) {
    console.warn("[syncPriceToSettings] app_settings güncellenemedi:", err);
  }
}

export async function POST(req: NextRequest) {
  // 1. Admin yetki kontrolü
  const auth = await verifyAdmin();
  if (!auth.authorized) {
    return auth.response;
  }

  // 2. Body çözümleme ve doğrulama
  let body: PriceChangeRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Geçersiz JSON istek gövdesi." },
      { status: 400 }
    );
  }

  const { type, productId, basePlanId, price, dryRun = false, applyToExisting = false } = body;

  if (!productId || typeof productId !== "string") {
    return NextResponse.json(
      { error: "productId zorunludur ve metin olmalıdır." },
      { status: 400 }
    );
  }

  if (type !== "subscription" && type !== "onetime") {
    return NextResponse.json(
      { error: "type 'subscription' veya 'onetime' olmalıdır." },
      { status: 400 }
    );
  }

  // 3. Fiyat doğrulaması ve birim dönüştürme
  let units: string;
  let nanos: number;
  try {
    const converted = convertPriceToUnitsAndNanos(price);
    units = converted.units;
    nanos = converted.nanos;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Geçersiz fiyat." },
      { status: 400 }
    );
  }

  // 4. PLAY_ALLOWED_PRODUCT_IDS kontrolü (Test aşaması güvenlik bariyeri)
  if (!isProductAllowed(productId)) {
    return NextResponse.json(
      {
        error: `Bu ürünün (${productId}) fiyatı yapılandırma gereği (PLAY_ALLOWED_PRODUCT_IDS) değiştirilemez. Yalnızca izin verilen test ürünleri düzenlenebilir.`,
      },
      { status: 403 }
    );
  }

  const supabase = await createClient();

  // 5. Mock Modu İşlemleri
  if (isMockMode()) {
    const mockProduct = MOCK_PLAY_PRODUCTS.find((p) => p.productId === productId);
    const oldPrice = mockProduct?.currentPrice ?? 0;

    // Log kaydı oluştur
    const logStatus = dryRun ? "dry_run" : "success";
    try {
      await supabase.from("price_change_logs").insert({
        admin_user_id: auth.userId,
        product_id: productId,
        type,
        old_price: oldPrice,
        new_price: price,
        apply_to_existing: type === "subscription" ? applyToExisting : false,
        status: logStatus,
        error: null,
      });
    } catch (logErr) {
      console.warn("Mock price change log write error:", logErr);
    }

    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        mock: true,
        message: `[MOCK ÖNİZLEME]: ${productId} için fiyat ${oldPrice} ₺ → ${price} ₺ olarak güncellenecekti. (Units: "${units}", Nanos: ${nanos})`,
        details: {
          productId,
          basePlanId: basePlanId || null,
          oldPrice,
          newPrice: price,
          units,
          nanos,
          applyToExisting: type === "subscription" ? applyToExisting : false,
        },
      });
    }

    // Mock başarılı güncelleme → app_settings senkronize et
    await syncPriceToSettings(supabase, productId, price);

    return NextResponse.json({
      success: true,
      dryRun: false,
      mock: true,
      message: `[MOCK]: ${productId} fiyatı başarıyla ${price} ₺ olarak güncellendi.`,
      details: {
        productId,
        basePlanId: basePlanId || null,
        oldPrice,
        newPrice: price,
        units,
        nanos,
        applyToExisting: type === "subscription" ? applyToExisting : false,
      },
    });
  }

  // 6. Canlı Google Play API İşlemleri
  let oldPrice: number | null = null;

  try {
    const { play, packageName } = getPlayClient();

    if (type === "subscription") {
      // 6a. Abonelik getir
      const subRes = await play.monetization.subscriptions.get({
        packageName,
        productId,
      });

      const subscription = subRes.data;
      if (!subscription.basePlans || subscription.basePlans.length === 0) {
        throw new Error(`Abonelik için base plan bulunamadı (${productId}).`);
      }

      // Sadece aktif base plan'lar arasından seçim yap
      const activePlans = (subscription.basePlans || []).filter(
        (plan) => plan.state === "ACTIVE"
      );
      if (activePlans.length === 0) {
        throw new Error(`Abonelik için aktif bir base plan bulunamadı (${productId}).`);
      }

      // Hedef plan bulunamazsa başka bir planın fiyatını değiştirmemek için işlemi durdur
      let targetBasePlan;
      if (basePlanId) {
        targetBasePlan = activePlans.find((bp) => bp.basePlanId === basePlanId);
        if (!targetBasePlan) {
          throw new Error(`Aktif base plan bulunamadı (${productId} / ${basePlanId}). Fiyat değiştirilmedi.`);
        }
      } else if (activePlans.length === 1) {
        targetBasePlan = activePlans[0];
      } else {
        throw new Error(`${productId} için birden fazla aktif base plan var; basePlanId belirtilmelidir. Fiyat değiştirilmedi.`);
      }

      // TR regionalConfig'i bul veya ekle
      if (!targetBasePlan.regionalConfigs) {
        targetBasePlan.regionalConfigs = [];
      }

      let trConfig = targetBasePlan.regionalConfigs.find(
        (rc) => rc.regionCode?.toUpperCase() === "TR"
      );

      if (trConfig?.price) {
        const prevUnits = trConfig.price.units || "0";
        const prevNanos = trConfig.price.nanos || 0;
        oldPrice = Math.round((Number(prevUnits) + prevNanos / 1_000_000_000) * 100) / 100;
      }

      // Dry-Run ise API'ye yazma yapmadan çık
      if (dryRun) {
        await supabase.from("price_change_logs").insert({
          admin_user_id: auth.userId,
          product_id: productId,
          type: "subscription",
          old_price: oldPrice,
          new_price: price,
          apply_to_existing: applyToExisting,
          status: "dry_run",
          error: null,
        });

        return NextResponse.json({
          success: true,
          dryRun: true,
          message: `Önizleme Başarılı: ${productId} (${targetBasePlan.basePlanId}) fiyatı ${oldPrice ?? "0"} ₺'den ${price} ₺'ye değiştirilecektir. (Mevcut abonelere geçiş: ${applyToExisting ? "Açık" : "Kapalı"})`,
          details: {
            productId,
            basePlanId: targetBasePlan.basePlanId,
            oldPrice,
            newPrice: price,
            units,
            nanos,
            applyToExisting,
          },
        });
      }

      // Yeni fiyatı TR config'e yaz
      if (!trConfig) {
        trConfig = {
          regionCode: "TR",
          newSubscriberAvailability: true,
          price: {
            currencyCode: "TRY",
            units,
            nanos,
          },
        };
        targetBasePlan.regionalConfigs.push(trConfig);
      } else {
        trConfig.newSubscriberAvailability = true;
        trConfig.price = {
          currencyCode: "TRY",
          units,
          nanos,
        };
      }

      let regionsVersion = getLatestRegionsVersion(subscription);

      // Subscriptions.patch çağrısı (Sürüm uyuşmazlığı olursa Play'in talep ettiği sürüme otomatik adapte olur)
      try {
        await play.monetization.subscriptions.patch({
          packageName,
          productId,
          "regionsVersion.version": regionsVersion,
          updateMask: "basePlans",
          requestBody: subscription,
        });
      } catch (patchErr: any) {
        const errMsg = patchErr?.message || patchErr?.response?.data?.error?.message || "";
        const match = errMsg.match(/versionId=([0-9/]+)/);
        if (match && match[1] && match[1] !== regionsVersion) {
          regionsVersion = match[1];
          await play.monetization.subscriptions.patch({
            packageName,
            productId,
            "regionsVersion.version": regionsVersion,
            updateMask: "basePlans",
            requestBody: subscription,
          });
        } else {
          throw patchErr;
        }
      }

      // 6b. Mevcut abonelere de fiyat artışı uygulanacaksa (migratePrices)
      let migrated = false;
      if (applyToExisting && targetBasePlan.basePlanId) {
        try {
          await play.monetization.subscriptions.basePlans.migratePrices({
            packageName,
            productId,
            basePlanId: targetBasePlan.basePlanId,
            requestBody: {
              packageName,
              productId,
              basePlanId: targetBasePlan.basePlanId,
              regionsVersion: { version: regionsVersion },
              regionalPriceMigrations: [
                {
                  regionCode: "TR",
                },
              ],
            },
          });
          migrated = true;
        } catch (migErr) {
          console.error("Play migratePrices error:", migErr);
          throw new Error(
            `Fiyat yeni aboneler için güncellendi ancak mevcut abonelere geçiş (migratePrices) başarısız oldu: ${migErr instanceof Error ? migErr.message : "Hata"}`
          );
        }
      }

      // Başarılı log kaydı
      await supabase.from("price_change_logs").insert({
        admin_user_id: auth.userId,
        product_id: productId,
        type: "subscription",
        old_price: oldPrice,
        new_price: price,
        apply_to_existing: applyToExisting,
        status: "success",
        error: null,
      });

      // app_settings tablosunu senkronize et
      await syncPriceToSettings(supabase, productId, price);

      return NextResponse.json({
        success: true,
        dryRun: false,
        message: `Abonelik fiyatı başarıyla ${price} ₺ olarak güncellendi.${migrated ? " Mevcut aboneler için fiyat geçişi başlatıldı." : ""}`,
        details: {
          productId,
          basePlanId: targetBasePlan.basePlanId,
          oldPrice,
          newPrice: price,
          migrated,
        },
      });
    } else {
      // 6c. Tek seferlik ürün getir (onetimeproducts.get)
      const otpRes = await play.monetization.onetimeproducts.get({
        packageName,
        productId,
      });

      const otp = otpRes.data;
      if (!otp.purchaseOptions || otp.purchaseOptions.length === 0) {
        throw new Error(`Tek seferlik ürün için purchase option bulunamadı (${productId}).`);
      }

      // Ürün listesindeki basePlanId, tek seferlik ürünlerde purchaseOptionId'dir
      const activePurchaseOptions = otp.purchaseOptions.filter(
        (po) => !po.state || po.state === "ACTIVE"
      );
      let targetPurchaseOption;
      if (basePlanId) {
        targetPurchaseOption = activePurchaseOptions.find((po) => po.purchaseOptionId === basePlanId);
        if (!targetPurchaseOption) {
          throw new Error(`Aktif purchase option bulunamadı (${productId} / ${basePlanId}). Fiyat değiştirilmedi.`);
        }
      } else if (activePurchaseOptions.length === 1) {
        targetPurchaseOption = activePurchaseOptions[0];
      } else {
        throw new Error(`${productId} için birden fazla aktif purchase option var; basePlanId belirtilmelidir. Fiyat değiştirilmedi.`);
      }

      if (!targetPurchaseOption.regionalPricingAndAvailabilityConfigs) {
        targetPurchaseOption.regionalPricingAndAvailabilityConfigs = [];
      }

      let trConfig = targetPurchaseOption.regionalPricingAndAvailabilityConfigs.find(
        (rc) => rc.regionCode?.toUpperCase() === "TR"
      );

      if (trConfig?.price) {
        const prevUnits = trConfig.price.units || "0";
        const prevNanos = trConfig.price.nanos || 0;
        oldPrice = Math.round((Number(prevUnits) + prevNanos / 1_000_000_000) * 100) / 100;
      }

      // Dry-Run ise çık
      if (dryRun) {
        await supabase.from("price_change_logs").insert({
          admin_user_id: auth.userId,
          product_id: productId,
          type: "onetime",
          old_price: oldPrice,
          new_price: price,
          apply_to_existing: false,
          status: "dry_run",
          error: null,
        });

        return NextResponse.json({
          success: true,
          dryRun: true,
          message: `Önizleme Başarılı: ${productId} (${targetPurchaseOption.purchaseOptionId}) tek seferlik ürün fiyatı ${oldPrice ?? "0"} ₺'den ${price} ₺'ye değiştirilecektir.`,
          details: {
            productId,
            basePlanId: targetPurchaseOption.purchaseOptionId,
            oldPrice,
            newPrice: price,
            units,
            nanos,
          },
        });
      }

      // Yeni fiyatı yaz
      if (!trConfig) {
        trConfig = {
          regionCode: "TR",
          price: {
            currencyCode: "TRY",
            units,
            nanos,
          },
        };
        targetPurchaseOption.regionalPricingAndAvailabilityConfigs.push(trConfig);
      } else {
        trConfig.price = {
          currencyCode: "TRY",
          units,
          nanos,
        };
      }

      let regionsVersion = getLatestRegionsVersion(otp);

      try {
        await play.monetization.onetimeproducts.patch({
          packageName,
          productId,
          "regionsVersion.version": regionsVersion,
          updateMask: "purchaseOptions",
          requestBody: otp,
        });
      } catch (patchErr: any) {
        const errMsg = patchErr?.message || patchErr?.response?.data?.error?.message || "";
        const match = errMsg.match(/versionId=([0-9/]+)/);
        if (match && match[1] && match[1] !== regionsVersion) {
          regionsVersion = match[1];
          await play.monetization.onetimeproducts.patch({
            packageName,
            productId,
            "regionsVersion.version": regionsVersion,
            updateMask: "purchaseOptions",
            requestBody: otp,
          });
        } else {
          throw patchErr;
        }
      }

      // Başarılı log kaydı
      await supabase.from("price_change_logs").insert({
        admin_user_id: auth.userId,
        product_id: productId,
        type: "onetime",
        old_price: oldPrice,
        new_price: price,
        apply_to_existing: false,
        status: "success",
        error: null,
      });

      // app_settings tablosunu senkronize et
      await syncPriceToSettings(supabase, productId, price);

      return NextResponse.json({
        success: true,
        dryRun: false,
        message: `Tek seferlik ürün fiyatı başarıyla ${price} ₺ olarak güncellendi.`,
        details: {
          productId,
          oldPrice,
          newPrice: price,
        },
      });
    }
  } catch (err) {
    const { status, message } = formatPlayError(err);

    // Başarısızlığı log tablosuna kaydet
    try {
      await supabase.from("price_change_logs").insert({
        admin_user_id: auth.userId,
        product_id: productId,
        type,
        old_price: oldPrice,
        new_price: price,
        apply_to_existing: applyToExisting,
        status: "failed",
        error: message,
      });
    } catch (logErr) {
      console.warn("Failed to write price error log:", logErr);
    }

    return NextResponse.json({ error: message }, { status });
  }
}
