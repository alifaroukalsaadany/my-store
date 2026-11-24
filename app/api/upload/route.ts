import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const ownerKey =
  process.env.OWNER_ACCESS_KEY_V4 ||
  process.env.OWNER_ACCESS_KEY_V3 ||
  process.env.OWNER_ACCESS_KEY_V2 ||
  process.env.OWNER_ACCESS_KEY;

export async function POST(request: Request) {
  if (!ownerKey) {
    return NextResponse.json({ error: "إعدادات رفع الصور غير مكتملة." }, { status: 503 });
  }

  try {
    const body = (await request.json()) as HandleUploadBody;
    const response = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        if (!clientPayload || clientPayload !== ownerKey) {
          throw new Error("غير مصرح برفع الصور.");
        }

        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp"],
          maximumSizeInBytes: 8 * 1024 * 1024,
          addRandomSuffix: true,
        };
      },
    });

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "تعذر رفع الصورة." },
      { status: 400 },
    );
  }
}
