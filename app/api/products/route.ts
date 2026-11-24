import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ownerKey = process.env.OWNER_ACCESS_KEY_V3 || process.env.OWNER_ACCESS_KEY_V2 || process.env.OWNER_ACCESS_KEY;

function admin(request: NextRequest) {
  const supplied = request.headers.get("x-owner-key");
  return Boolean(ownerKey && supplied && supplied === ownerKey);
}
function unavailable() {
  return NextResponse.json({ error: "إعدادات قاعدة البيانات غير مكتملة." }, { status: 503 });
}

export async function GET(request: NextRequest) {
  if (!url || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || (admin(request) && !serviceKey)) return unavailable();
  const isAdmin = admin(request);
  const endpoint = isAdmin
    ? `${url}/rest/v1/products?select=*&order=created_at.desc`
    : `${url}/rest/v1/products?select=*&is_active=eq.true&order=created_at.desc`;
  try {
    const response = await fetch(endpoint, {
      headers: isAdmin
        ? { apikey: serviceKey!, Authorization: `Bearer ${serviceKey}` }
        : { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY! },
      cache: "no-store",
    });
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 500);
      return NextResponse.json({ error: "تعذر تحميل المنتجات.", supabaseStatus: response.status, detail }, { status: 502 });
    }
    const products = await response.json();
    return NextResponse.json({ products }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown fetch error";
    return NextResponse.json({ error: "تعذر الاتصال بقاعدة البيانات.", detail: message.slice(0, 300) }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  if (!admin(request)) return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  if (!url || !serviceKey) return unavailable();
  try {
    const body = await request.json();
    if (!body?.name || typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json({ error: "اسم المنتج مطلوب." }, { status: 400 });
    }
    const product = {
      name: body.name.trim(),
      description: typeof body.description === "string" ? body.description.slice(0, 2000) : "",
      price: Number.isFinite(Number(body.price)) ? Number(body.price) : 0,
      image_urls: Array.isArray(body.image_urls) ? body.image_urls.filter((v: unknown) => typeof v === "string").slice(0, 8) : [],
      sizes: Array.isArray(body.sizes) ? body.sizes.filter((v: unknown) => typeof v === "string").slice(0, 20) : [],
      colors: Array.isArray(body.colors) ? body.colors.filter((v: unknown) => typeof v === "string").slice(0, 20) : [],
      stock: Math.max(0, Number.parseInt(body.stock, 10) || 0),
      is_active: body.is_active !== false,
    };
    const response = await fetch(`${url}/rest/v1/products`, {
      method: "POST",
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify(product),
      cache: "no-store",
    });
    if (!response.ok) return NextResponse.json({ error: "تعذرت إضافة المنتج." }, { status: 502 });
    return NextResponse.json({ product: (await response.json())[0] }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "بيانات المنتج غير صحيحة." }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!admin(request)) return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  if (!url || !serviceKey) return unavailable();
  try {
    const body = await request.json();
    if (!body?.id) return NextResponse.json({ error: "معرّف المنتج مطلوب." }, { status: 400 });
    const allowed = ["name", "description", "price", "image_urls", "sizes", "colors", "stock", "is_active"];
    const update: Record<string, unknown> = {};
    for (const key of allowed) if (body[key] !== undefined) update[key] = body[key];
    const response = await fetch(`${url}/rest/v1/products?id=eq.${encodeURIComponent(String(body.id))}`, {
      method: "PATCH",
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify(update),
      cache: "no-store",
    });
    if (!response.ok) return NextResponse.json({ error: "تعذر تعديل المنتج." }, { status: 502 });
    return NextResponse.json({ product: (await response.json())[0] ?? null });
  } catch {
    return NextResponse.json({ error: "بيانات التعديل غير صحيحة." }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!admin(request)) return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  if (!url || !serviceKey) return unavailable();
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "معرّف المنتج مطلوب." }, { status: 400 });
  const response = await fetch(`${url}/rest/v1/products?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    cache: "no-store",
  });
  if (!response.ok) return NextResponse.json({ error: "تعذر حذف المنتج." }, { status: 502 });
  return NextResponse.json({ ok: true });
}
