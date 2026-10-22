import { NextRequest } from "next/server";
import { cookieName, sessionResponse } from "../../../../../shared/server/demo-session";
export function GET(request: NextRequest) { return sessionResponse(request, "cedar", request.cookies.get(cookieName("cedar"))?.value); }
export function POST(request: NextRequest) { return sessionResponse(request, "cedar", request.cookies.get(cookieName("cedar"))?.value); }
