import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { parseSessionValue, SESSION_COOKIE } from "@/lib/auth-accounts";

export function middleware(req: NextRequest) {
  const session = parseSessionValue(req.cookies.get(SESSION_COOKIE)?.value);
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/admin")) {
    if (session?.role !== "admin") {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      url.searchParams.set("need", "admin");
      return NextResponse.redirect(url);
    }
  }

  if (pathname.startsWith("/designer") || pathname === "/cart" || pathname === "/checkout") {
    if (session?.role === "admin") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
    if (session?.role !== "user") {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname + req.nextUrl.search);
      url.searchParams.set("need", "user");
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/designer", "/cart", "/checkout"],
};
