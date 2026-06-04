import { NextResponse } from "next/server";

const PROD_DOMAIN = "peak-academy.net";

export function middleware(request) {
  const host = request.headers.get("host") || "";
  const path = request.nextUrl.pathname;
  const isProdDomain = host === PROD_DOMAIN || host === `www.${PROD_DOMAIN}`;

  if (isProdDomain && path !== "/") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"]
};
