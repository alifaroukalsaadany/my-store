import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ownerKey = process.env.OWNER_ACCESS_KEY;

function configured() {
  return Boolean(supabaseUrl && serviceKey && ownerKey);
}

export async function POST(request: NextRequest) {
  if (!configured()) return NextResponse.json({ error: "Order storage is not configured." }, { status: 503 });
  try {
    const body = await request.json();
    const required = ["id","name","phone","address","product","color","size"];
    if (!body || required.some((key) => typeof body[key] !== "string" || !body[key].trim() || body[key].length > 1000)) {
      return NextResponse.json({ error: "Invalid order." }, { status: 400 });
    }
    const order = {
      order_id: body.id.slice(0, 40),
      customer_name: body.name.trim(),
      phone: body.phone.trim(),
      delivery_address: body.address.trim(),
      product: body.product.trim(),
      color: body.color.trim(),
      size: body.size.trim(),
      notes: typeof body.notes === "string" ? body.notes.slice(0, 2000) : "",
    };
    const response = await fetch(`${supabaseUrl}/rest/v1/orders`, {
      method: "POST",
      headers: {
        apikey: serviceKey!,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(order),
      cache: "no-store",
    });
    if (!response.ok) {
      const detail = await response.text();
      console.error("Order insert failed:", response.status, detail);
      return NextResponse.json({ error: "Could not save order." }, { status: 502 });
    }
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}

export async function GET(request: NextRequest) {
  if (!configured()) return NextResponse.json({ error: "Order storage is not configured." }, { status: 503 });
  const supplied = request.headers.get("x-owner-key");
  if (!supplied || supplied !== ownerKey) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const response = await fetch(
    `${supabaseUrl}/rest/v1/orders?select=*&order=created_at.desc&limit=200`,
    { headers: { apikey: serviceKey!, Authorization: `Bearer ${serviceKey}` }, cache: "no-store" }
  );
  if (!response.ok) return NextResponse.json({ error: "Could not load orders." }, { status: 502 });
  const rows = await response.json();
  return NextResponse.json({
    orders: rows.map((row: Record<string, string>) => ({
      id: row.order_id, createdAt: row.created_at, name: row.customer_name, phone: row.phone,
      address: row.delivery_address, product: row.product, color: row.color, size: row.size, notes: row.notes,
    })),
  }, { headers: { "Cache-Control": "no-store" } });
}