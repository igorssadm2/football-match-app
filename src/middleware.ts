import { NextRequest, NextResponse } from "next/server";

const PROTECTED_PAGES = ["/dashboard", "/cadastro"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PAGES.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (!isProtected) return NextResponse.next();

  const session = request.cookies.get("__session")?.value;
  if (!session) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/cadastro/:path*"],
};
