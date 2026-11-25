import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ownerKey = process.env.OWNER_ACCESS_KEY_V4 || process.env.OWNER_ACCESS_KEY_V3 || process.env.OWNER_ACCESS_KEY_V2 || process.env.OWNER_ACCESS_KEY;

function configured() {
  return Boolean(supabaseUrl && serviceKey && ownerKey);
}

export async function GET() {
  if (!configured()) return NextResponse.json({ error: "Payment settings are not configured." }, { status: 503 });
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/store_settings?id=eq.1&select=instapay_account,wallet_number&limit=1`, {
      headers: { apikey: serviceKey!, Authorization: `Bearer ${serviceKey}` },
      cache: "no-store",
    });
    if (!response.ok) return NextResponse.json({ error: "Could not load payment settings." }, { status: 502 });
    const rows = await response.json();
    const row = rows[0] || {};
    return NextResponse.json({
      instapayAccount: row.instapay_account || "",
      walletNumber: row.wallet_number || "",
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Could not load payment settings." }, { status: 502 });
  }
}

export async function PUT(request: NextRequest) {
  if (!configured()) return NextResponse.json({ error: "Payment settings are not configured." }, { status: 503 });
  const supplied = request.headers.get("x-owner-key");
  if (!supplied || supplied !== ownerKey) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  try {
    const body = await request.json();
    const instapayAccount = typeof body.instapayAccount === "string" ? body.instapayAccount.trim().slice(0, 120) : "";
    const walletNumber = typeof body.walletNumber === "string" ? body.walletNumber.trim().slice(0, 40) : "";
    const response = await fetch(`${supabaseUrl}/rest/v1/store_settings?on_conflict=id`, {
      method: "POST",
      headers: {
        apikey: serviceKey!,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({ id: 1, instapay_account: instapayAccount, wallet_number: walletNumber }),
      cache: "no-store",
    });
    if (!response.ok) {
      const detail = await response.text();
      console.error("Payment settings save failed:", response.status, detail);
      return NextResponse.json({ error: "Could not save payment settings." }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid payment settings." }, { status: 400 });
  }
}
