import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "اختار صورة التحويل أولًا." }, { status: 400 });
    }
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type) || file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "الصورة لازم تكون JPG أو PNG أو WebP وبحد أقصى 5 ميجابايت." }, { status: 400 });
    }
    const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const blob = await put(`payment-proofs/${crypto.randomUUID()}.${extension}`, file, {
      access: "public",
      addRandomSuffix: true,
      contentType: file.type,
    });
    return NextResponse.json({ url: blob.url }, { status: 201 });
  } catch (error) {
    console.error("Payment proof upload failed:", error);
    return NextResponse.json({ error: "تعذر رفع صورة التحويل. حاول مرة أخرى." }, { status: 500 });
  }
}
