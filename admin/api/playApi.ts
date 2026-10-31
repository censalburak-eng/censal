import type { PlayProductItem } from "@/lib/playAuth";

export interface PlayProductsResponse {
  success: boolean;
  mock: boolean;
  packageName: string;
  products: PlayProductItem[];
  error?: string;
}

export interface PriceChangeLogItem {
  id: string;
  admin_user_id: string | null;
  product_id: string;
  type: "subscription" | "onetime";
  old_price: number | null;
  new_price: number;
  apply_to_existing: boolean;
  status: "success" | "failed" | "dry_run";
  error: string | null;
  created_at: string;
}

export interface PriceChangeResponse {
  success?: boolean;
  dryRun?: boolean;
  mock?: boolean;
  message: string;
  details?: {
    productId: string;
    basePlanId?: string | null;
    oldPrice: number | null;
    newPrice: number;
    units?: string;
    nanos?: number;
    applyToExisting?: boolean;
    migrated?: boolean;
  };
  error?: string;
}

export const playApi = {
  async getProducts(): Promise<PlayProductsResponse> {
    const res = await fetch("/api/play/products", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Ürün listesi yüklenemedi.");
    }
    return data;
  },

  async updatePrice(params: {
    type: "subscription" | "onetime";
    productId: string;
    basePlanId?: string | null;
    price: number;
    dryRun?: boolean;
    applyToExisting?: boolean;
  }): Promise<PriceChangeResponse> {
    const res = await fetch("/api/play/price", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Fiyat güncellenemedi.");
    }
    return data;
  },

  async getPriceLogs(): Promise<PriceChangeLogItem[]> {
    const res = await fetch("/api/play/logs", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Fiyat logları yüklenemedi.");
    }
    return data.logs || [];
  },
};
