import { NextRequest, NextResponse } from "next/server";
import { cookieName, readSession, authorize, pageRoles, SessionError } from "../../shared/server/demo-session";
export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  // The hackathon entry point is onboarding. Activation sets this browser marker
  // before sending the presenter to the intelligence workspace.
  if (
    pathname !== "/onboarding" &&
    !pathname.startsWith("/onboarding/") &&
    !pathname.startsWith("/api/") &&
    request.cookies.get("veriq-onboarding-complete")?.value !== "1"
  ) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }
  if ((process.env.VERIQ_DATA_SOURCE ?? process.env.NEXT_PUBLIC_DATA_SOURCE ?? "mock") !== "api") return NextResponse.next();
  try {
    const session = readSession("veriq", request.cookies.get(cookieName("veriq"))?.value);
    if (!pathname.startsWith("/api/")) authorize(session, pageRoles("veriq", pathname));
    return NextResponse.next();
  } catch (error) {
    const status = error instanceof SessionError ? error.status : 503;
    if (status === 401 && !request.nextUrl.pathname.startsWith("/api/")) return NextResponse.redirect(new URL("/login", request.url));
    return NextResponse.json({ error: error instanceof SessionError ? error.message : "Authentication unavailable." }, { status, headers: { "Cache-Control": "no-store" } });
  }
}
export const config = { matcher: ["/((?!login|api/session|_next/static|_next/image|favicon.ico|images|icons|fonts).*)"] };
