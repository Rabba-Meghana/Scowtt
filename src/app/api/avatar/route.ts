import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

// Proxies the Google profile image server-side so it always loads
// regardless of browser referrer or CORS policy
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse(null, { status: 401 });
  }

  const url = req.nextUrl.searchParams.get("url");
  if (!url) return new NextResponse(null, { status: 400 });

  // Only proxy Google profile images
  if (!url.includes("googleusercontent.com") && !url.includes("google.com")) {
    return new NextResponse(null, { status: 403 });
  }

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    if (!res.ok) return new NextResponse(null, { status: 404 });

    const buf = await res.arrayBuffer();
    const ct  = res.headers.get("content-type") ?? "image/jpeg";

    return new NextResponse(buf, {
      headers: {
        "Content-Type":  ct,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new NextResponse(null, { status: 500 });
  }
}
