import { NextResponse, type NextRequest } from "next/server";

function allowedOrigins(req: NextRequest): string[] {
  const list = (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim().replace(/\/$/, ""))
    .filter(Boolean);
  const self = req.nextUrl.origin;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "");
  const extra = host ? [`${proto}://${host}`, `https://${host}`, `http://${host}`] : [];
  if (process.env.NEXT_PUBLIC_SITE_URL) list.push(process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, ""));
  return [...new Set([self, ...extra, ...list])];
}

function corsHeaders(origin: string | null, allowed: string[]) {
  const h = new Headers();
  if (origin && allowed.includes(origin)) {
    h.set("Access-Control-Allow-Origin", origin);
    h.set("Access-Control-Allow-Credentials", "true");
    h.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    h.set("Access-Control-Allow-Headers", "Content-Type");
    h.set("Access-Control-Max-Age", "600");
    h.set("Vary", "Origin");
  }
  return h;
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/")) {
    const origin = req.headers.get("origin");
    const allowed = allowedOrigins(req);
    const originAllowed = !origin || allowed.includes(origin);

    if (req.method === "OPTIONS") {
      if (!originAllowed) return new NextResponse(null, { status: 403 });
      return new NextResponse(null, { status: 204, headers: corsHeaders(origin, allowed) });
    }

    if (!["GET", "HEAD"].includes(req.method)) {
      if (!originAllowed) return NextResponse.json({ error: "Origin غير مسموح", code: "cors" }, { status: 403 });
      const site = req.headers.get("sec-fetch-site");
      if (site && site === "cross-site" && !origin) return NextResponse.json({ error: "طلب غير مسموح", code: "csrf" }, { status: 403 });
    }

    const res = NextResponse.next();
    corsHeaders(origin, allowed).forEach((v, k) => res.headers.set(k, v));
    return res;
  }

  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login") && !pathname.startsWith("/admin/setup")) {
    if (!req.cookies.get("rivo_admin")?.value) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*", "/admin/:path*"],
};
