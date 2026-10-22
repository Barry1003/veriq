import { NextRequest, NextResponse } from "next/server";
import { cookieName, readSession, authorize, pageRoles, SessionError } from "../../shared/server/demo-session";
export function proxy(request: NextRequest) {
  if (process.env.CEDAR_DATA_SOURCE !== "api") return NextResponse.next();
  try {
    const session = readSession("cedar", request.cookies.get(cookieName("cedar"))?.value);
    if (!request.nextUrl.pathname.startsWith("/api/")) authorize(session, pageRoles("cedar", request.nextUrl.pathname));
    return NextResponse.next();
  } catch (error) {
    const status = error instanceof SessionError ? error.status : 503;
    if (status === 401 && !request.nextUrl.pathname.startsWith("/api/")) return NextResponse.redirect(new URL("/login", request.url));
    return NextResponse.json({ error: error instanceof SessionError ? error.message : "Authentication unavailable." }, { status, headers: { "Cache-Control": "no-store" } });
  }
}
export const config = { matcher: ["/staff/:path*", "/operator/:path*", "/banking/:path*", "/api/cedar/:path*"] };
