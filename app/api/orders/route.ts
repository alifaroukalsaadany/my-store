import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ownerKey = process.env.OWNER_ACCESS_KEY_V4 || process.env.OWNER_ACCESS_KEY_V3 || process.env.OWNER_ACCESS_KEY_V2 || process.env.OWNER_ACCESS_KEY;

function configured() {
  return Boolean(supabaseUrl && serviceKey && ownerKey);
}

export async function POST(request: NextRequest) {
  if (!configured()) return NextResponse.json({ error: "Order storage is not configured." }, { status: 503 });
  try {
    const body = await request.json();
    const required = ["id","name","phone","address"];
    if (!body || required.some((key) => typeof body[key] !== "string" || !body[key].trim() || body[key].length > 1000)) {
      return NextResponse.json({ error: "Invalid order." }, { status: 400 });
    }
    const items = Array.isArray(body.items) && body.items.length
      ? body.items.slice(0, 50).map((item: Record<string, unknown>) => ({
          name: String(item.name || "").slice(0, 300), color: String(item.color || "").slice(0, 100),
          size: String(item.size || "").slice(0, 100), quantity: Math.max(1, Math.min(99, Number(item.quantity) || 1)),
          price: Number.isFinite(Number(item.price)) && Number(item.price) >= 0 ? Number(item.price) : 0,
        }))
      : [{ name: String(body.product || ""), color: String(body.color || ""), size: String(body.size || ""), quantity: 1, price: 0 }];
    if (items.some((item: {name:string;color:string;size:string}) => !item.name || !item.color || !item.size)) {
      return NextResponse.json({ error: "Invalid order items." }, { status: 400 });
    }
    let userId: string | null = null;
    const authorization = request.headers.get("authorization") || "";
    const accessToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (accessToken) {
      const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: { apikey: serviceKey!, Authorization: `Bearer ${accessToken}` }, cache: "no-store"
      });
      if (userResponse.ok) {
        const authUser = await userResponse.json();
        if (typeof authUser.id === "string") userId = authUser.id;
      }
    }
    const allowedPaymentMethods = ["نقدًا عند الاستلام", "محفظة إلكترونية", "إنستا باي"];
    const paymentMethod = allowedPaymentMethods.includes(body.paymentMethod) ? body.paymentMethod : "نقدًا عند الاستلام";
    const customerNotes = typeof body.notes === "string" ? body.notes.slice(0, 1500) : "";
    const governorate = typeof body.governorate === "string" ? body.governorate.trim().slice(0, 100) : "";
    const city = typeof body.city === "string" ? body.city.trim().slice(0, 100) : "";
    const senderNumber = typeof body.senderNumber === "string" ? body.senderNumber.trim().slice(0, 40) : "";
    const proofImageUrl = typeof body.proofImageUrl === "string" && /^https:\/\//i.test(body.proofImageUrl) ? body.proofImageUrl.slice(0, 1000) : "";
    const totalAmount = Number.isFinite(Number(body.totalAmount)) && Number(body.totalAmount) >= 0 ? Number(body.totalAmount) : 0;
    const order = {
      order_id: body.id.slice(0, 40),
      customer_name: body.name.trim(),
      phone: body.phone.trim(),
      delivery_address: [governorate, city, body.address.trim()].filter(Boolean).join(" - "),
      product: items.map((item: {name:string;color:string;size:string;quantity:number}) => `${item.name} · ${item.color} · ${item.size} · الكمية: ${item.quantity}`).join("\\n").slice(0, 1000),
      color: items.length === 1 ? items[0].color : "متعدد",
      size: items.length === 1 ? items[0].size : "متعدد",
      user_id: userId,
      items,
      notes: [`حالة الطلب: تم استلام طلبك`, `طريقة الدفع: ${paymentMethod}`, `الإجمالي: ${totalAmount} ج.م`, governorate ? `المحافظة: ${governorate}` : "", city ? `المدينة: ${city}` : "", senderNumber ? `رقم التحويل منه: ${senderNumber}` : "", proofImageUrl ? `صورة التحويل: ${proofImageUrl}` : "", customerNotes].filter(Boolean).join("\n").slice(0, 4000),
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
  if (!response.ok) {
    const detail = await response.text();
    console.error("Order load failed:", response.status, detail);
    return NextResponse.json({ error: "Could not load orders." }, { status: 502 });
  }
  const rows = await response.json();
  return NextResponse.json({
    orders: rows.map((row: Record<string, string>) => ({
      id: row.order_id, createdAt: row.created_at, name: row.customer_name, phone: row.phone,
      status: (row.notes || "").match(/^حالة الطلب: ([^\n]+)/m)?.[1] || "تم استلام طلبك",
      address: row.delivery_address, product: row.product, color: row.color, size: row.size,
      paymentMethod: (row.notes || "").match(/^طريقة الدفع: ([^\n]+)/)?.[1] || "غير محددة",
      totalAmount: Number((row.notes || "").match(/^الإجمالي: ([0-9.]+)/m)?.[1] || 0),
      governorate: (row.notes || "").match(/^المحافظة: ([^\n]+)/m)?.[1] || "",
      city: (row.notes || "").match(/^المدينة: ([^\n]+)/m)?.[1] || "",
      senderNumber: (row.notes || "").match(/^رقم التحويل منه: ([^\n]+)/m)?.[1] || "",
      proofImageUrl: (row.notes || "").match(/^صورة التحويل: (https:\/\/[^\n]+)/m)?.[1] || "",
      notes: (row.notes || "").split("\n").filter((line: string) => !/^(حالة الطلب:|طريقة الدفع:|الإجمالي:|المحافظة:|المدينة:|رقم التحويل منه:|صورة التحويل:)/.test(line)).join("\n"),
    })),
  }, { headers: { "Cache-Control": "no-store" } });
}
export async function PATCH(request: NextRequest) {
  if (!configured()) return NextResponse.json({ error: "Order storage is not configured." }, { status: 503 });
  const supplied = request.headers.get("x-owner-key");
  if (!supplied || supplied !== ownerKey) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  try {
    const body = await request.json();
    const statuses = ["تم استلام طلبك", "تم تجهيز طلبك", "طلبك في الطريق", "تم تسليم طلبك"];
    if (typeof body.id !== "string" || !statuses.includes(body.status)) return NextResponse.json({ error: "Invalid order status." }, { status: 400 });
    const lookup = await fetch(`${supabaseUrl}/rest/v1/orders?order_id=eq.${encodeURIComponent(body.id)}&select=notes`, {
      headers: { apikey: serviceKey!, Authorization: `Bearer ${serviceKey}` }, cache: "no-store"
    });
    if (!lookup.ok) return NextResponse.json({ error: "Could not find order." }, { status: 502 });
    const rows = await lookup.json();
    if (!rows.length) return NextResponse.json({ error: "Order not found." }, { status: 404 });
    const notes = String(rows[0].notes || "").split("\n").filter((line: string) => !line.startsWith("حالة الطلب:"));
    const updatedNotes = [`حالة الطلب: ${body.status}`, ...notes].join("\n").slice(0, 4000);
    const update = await fetch(`${supabaseUrl}/rest/v1/orders?order_id=eq.${encodeURIComponent(body.id)}`, {
      method: "PATCH",
      headers: { apikey: serviceKey!, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ notes: updatedNotes }), cache: "no-store"
    });
    if (!update.ok) return NextResponse.json({ error: "Could not update order status." }, { status: 502 });
    return NextResponse.json({ ok: true, status: body.status });
  } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
}
