import { NextResponse } from "next/server";
import { createClient } from "@/lib/server";
import { verifyAdmin } from "@/lib/playAuth";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await verifyAdmin();
  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("price_change_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Fetch price change logs error:", error);
      return NextResponse.json(
        { error: "Fiyat değişiklik geçmişi alınamadı." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      logs: data || [],
    });
  } catch (err) {
    console.error("Price logs error:", err);
    return NextResponse.json(
      { error: "Sunucu hatası oluştu." },
      { status: 500 }
    );
  }
}
