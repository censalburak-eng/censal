import { NextResponse } from "next/server";
import {
  verifyAdmin,
  isMockMode,
  getPlayClient,
  formatPlayError,
  isProductAllowed,
  MOCK_PLAY_PRODUCTS,
  type PlayProductItem,
} from "@/lib/playAuth";

export async function GET() {
  // 1. Admin yetki kontrolü
  const auth = await verifyAdmin();
  if (!auth.authorized) {
    return auth.response;
  }

  // 2. Mock mod kontrolü
  if (isMockMode()) {
    const products = MOCK_PLAY_PRODUCTS.map((p) => ({
      ...p,
      allowed: isProductAllowed(p.productId),
    }));
    return NextResponse.json({
      success: true,
      mock: true,
      packageName: process.env.PLAY_PACKAGE_NAME || "com.censal.app (Mock)",
      products,
    });
  }

  // 3. Canlı Google Play API çağrısı
  try {
    const { play, packageName } = getPlayClient();
    const productItems: PlayProductItem[] = [];

    // 3a. Abonelikleri listele (monetization.subscriptions.list)
    try {
      const subRes = await play.monetization.subscriptions.list({
        packageName,
        pageSize: 100,
      });

      const subs = subRes.data.subscriptions || [];
      for (const sub of subs) {
        if (!sub.productId) continue;

        // Başlık: Öncelikle Türkçe listing, yoksa ilk listing
        const listings = sub.listings || [];
        const trListing = listings.find((l) => l.languageCode?.toLowerCase().startsWith("tr"));
        const title = trListing?.title || listings[0]?.title || sub.productId;

        // Sadece aktif base plan'ları getir
        const activePlans = (sub.basePlans || []).filter(
          (plan) => plan.state === "ACTIVE"
        );

        for (const bp of activePlans) {
          const trConfig = (bp.regionalConfigs || []).find(
            (rc) => rc.regionCode?.toUpperCase() === "TR"
          );

          const units = trConfig?.price?.units || "0";
          const nanos = trConfig?.price?.nanos || 0;
          const currency = trConfig?.price?.currencyCode || "TRY";
          const priceVal = Number(units) + nanos / 1_000_000_000;

          productItems.push({
            productId: sub.productId,
            title,
            type: "subscription",
            basePlanId: bp.basePlanId || null,
            currentPrice: trConfig ? Math.round(priceVal * 100) / 100 : null,
            currency,
            units,
            nanos,
            regionsVersion: (sub as any).regionsVersion?.version ?? null,
            allowed: isProductAllowed(sub.productId),
          });
        }
      }
    } catch (subErr) {
      console.warn("Play Subscriptions list error:", subErr);
      // Tek seferlik ürünleri okumaya devam et, hata detayını logla
    }

    // 3b. Tek Seferlik Ürünleri Listele (monetization.onetimeproducts.list)
    try {
      const otpRes = await play.monetization.onetimeproducts.list({
        packageName,
        pageSize: 100,
      });

      const otps = otpRes.data.oneTimeProducts || [];
      for (const otp of otps) {
        if (!otp.productId) continue;

        const listings = otp.listings || [];
        const trListing = listings.find((l) => l.languageCode?.toLowerCase().startsWith("tr"));
        const title = trListing?.title || listings[0]?.title || otp.productId;

        // Sadece aktif purchase option'ları getir
        const activePurchaseOptions = (otp.purchaseOptions || []).filter(
          (po) => !po.state || po.state === "ACTIVE"
        );

        for (const po of activePurchaseOptions) {
          const trConfig = (po.regionalPricingAndAvailabilityConfigs || []).find(
            (rc) => rc.regionCode?.toUpperCase() === "TR"
          );

          const units = trConfig?.price?.units || "0";
          const nanos = trConfig?.price?.nanos || 0;
          const currency = trConfig?.price?.currencyCode || "TRY";
          const priceVal = Number(units) + nanos / 1_000_000_000;

          productItems.push({
            productId: otp.productId,
            title,
            type: "onetime",
            basePlanId: po.purchaseOptionId || null,
            currentPrice: trConfig ? Math.round(priceVal * 100) / 100 : null,
            currency,
            units,
            nanos,
            regionsVersion: otp.regionsVersion?.version ?? null,
            allowed: isProductAllowed(otp.productId),
          });
        }
      }
    } catch (otpErr) {
      console.warn("Play OneTimeProducts list error:", otpErr);
    }

    return NextResponse.json({
      success: true,
      mock: false,
      packageName,
      products: productItems,
    });
  } catch (err) {
    const { status, message } = formatPlayError(err);
    return NextResponse.json({ error: message }, { status });
  }
}
