import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(request: NextRequest) {
  if (!supabaseUrl || !serviceKey) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${token}` }, cache: "no-store"
  });
  if (!userResponse.ok) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const user = await userResponse.json();
  const response = await fetch(`${supabaseUrl}/rest/v1/orders?user_id=eq.${encodeURIComponent(user.id)}&select=order_id,created_at,product,items,notes&order=created_at.desc&limit=100`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }, cache: "no-store"
  });
  if (!response.ok) return NextResponse.json({ error: "Could not load orders." }, { status: 502 });
  const rows = await response.json();
  return NextResponse.json({ orders: rows.map((row: Record<string, any>) => ({
    id: row.order_id, createdAt: row.created_at, product: row.product, items: row.items || [],
    status: String(row.notes || "").match(/^حالة الطلب: ([^\\n]+)/m)?.[1] || "تم استلام طلبك"
  })) }, { headers: { "Cache-Control": "no-store" } });
}
