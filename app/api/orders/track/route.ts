import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function normalizePhone(value: string) { return value.replace(/\D/g, "").replace(/^20/, "0"); }

export async function POST(request: NextRequest) {
  if (!supabaseUrl || !serviceKey) return NextResponse.json({ error: "خدمة متابعة الطلب غير متاحة حاليًا." }, { status: 503 });
  try {
    const body = await request.json();
    if (typeof body.orderId !== "string" || typeof body.phone !== "string" || !body.orderId.trim() || !body.phone.trim()) {
      return NextResponse.json({ error: "اكتب رقم الطلب ورقم الموبايل." }, { status: 400 });
    }
    const response = await fetch(`${supabaseUrl}/rest/v1/orders?order_id=eq.${encodeURIComponent(body.orderId.trim())}&select=order_id,customer_name,phone,product,created_at,notes&limit=1`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }, cache: "no-store"
    });
    if (!response.ok) return NextResponse.json({ error: "تعذر البحث عن الطلب حاليًا." }, { status: 502 });
    const rows = await response.json();
    const row = rows[0];
    if (!row || normalizePhone(String(row.phone)) !== normalizePhone(body.phone)) {
      return NextResponse.json({ error: "رقم الطلب أو رقم الموبايل غير صحيح." }, { status: 404 });
    }
    const status = String(row.notes || "").match(/^حالة الطلب: ([^\n]+)/m)?.[1] || "تم استلام طلبك";
    return NextResponse.json({ order: { id: row.order_id, name: row.customer_name, product: row.product, createdAt: row.created_at, status } }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "حدث خطأ، حاول مرة أخرى." }, { status: 400 }); }
}
