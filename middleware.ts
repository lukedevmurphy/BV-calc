import { NextResponse } from "next/server";
import { auth } from "@/auth";

/** Paths that must stay reachable without a session: the sign-in page itself
 *  and NextAuth's own OAuth/callback endpoints. Everything else requires a
 *  logged-in user — the whole app sits behind the Google front door. */
const PUBLIC_PREFIXES = ["/signin", "/api/auth"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (isPublic || req.auth) return NextResponse.next();

  // API callers get a clean 401 instead of an HTML redirect they can't follow.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "authentication required" }, { status: 401 });
  }

  const signInUrl = new URL("/signin", req.nextUrl.origin);
  signInUrl.searchParams.set("callbackUrl", pathname + req.nextUrl.search);
  return NextResponse.redirect(signInUrl);
});

export const config = {
  // Run on every route except Next internals and static asset files.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
  ],
};
