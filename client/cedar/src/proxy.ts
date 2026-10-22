import { NextRequest, NextResponse } from "next/server";
export function proxy(request: NextRequest) {
    if (process.env.CEDAR_DATA_SOURCE !== "api")
        return NextResponse.next();
    const username = process.env.CEDAR_UI_USERNAME;
    const password = process.env.CEDAR_UI_PASSWORD;
    if (!username || !password)
        return new NextResponse("Cedar UI access has not been configured.", { status: 503 });
    const raw = request.headers.get("authorization") ?? "";
    let provided = "";
    if (raw.startsWith("Basic ")) {
        try {
            provided = atob(raw.slice(6));
        }
        catch {
            provided = "";
        }
    }
    if (provided !== `${username}:${password}`)
        return new NextResponse("Authentication required", {
            status: 401,
            headers: { "WWW-Authenticate": 'Basic realm="Cedar synthetic workspace"', "Cache-Control": "no-store" },
        });
    return NextResponse.next();
}
export const config = { matcher: ["/staff/:path*", "/operator/:path*", "/banking/:path*", "/api/cedar/:path*"] };

