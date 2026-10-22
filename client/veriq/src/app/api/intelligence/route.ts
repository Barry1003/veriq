import { NextRequest, NextResponse } from "next/server";
import { sessionVeriqApi } from "@/services/api/session-reader";
import { requireSession } from "@/lib/session";
import { VeriqApiError } from "@/services/api/veriq";
import {
  getInvestigationQueue,
  getInvestigationWorkspace,
  getLiveIssues,
  getOperationalIntelligence,
} from "@/services/adapters/live-investigations";
import {
  checkMutation,
  SessionError,
} from "../../../../../shared/server/demo-session";
function failure(error: unknown) {
  const status =
    error instanceof SessionError || error instanceof VeriqApiError
      ? (error.status ?? 503)
      : 503;
  return NextResponse.json(
    {
      error:
        error instanceof Error
          ? error.message
          : "Intelligence is temporarily unavailable.",
    },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}
export async function GET(request: NextRequest) {
  try {
    const api = await sessionVeriqApi();
    if (!api)
      throw new VeriqApiError(
        "A live intelligence connection is required.",
        503,
      );
    const view = request.nextUrl.searchParams.get("view"),
      id = request.nextUrl.searchParams.get("id") ?? "";
    const data =
      view === "queue"
        ? await getInvestigationQueue(api, true)
        : view === "operations"
          ? await getOperationalIntelligence(api)
          : view === "issues"
            ? await getLiveIssues(api)
            : view === "workspace"
              ? await getInvestigationWorkspace(
                  api,
                  id,
                  (await requireSession()).role === "admin",
                )
              : null;
    if (!data) throw new VeriqApiError("Unknown intelligence view.", 404);
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession(["admin"]);
    checkMutation(request, "veriq", session);
    if (Number(request.headers.get("content-length") ?? 0) > 8000)
      throw new VeriqApiError("Request is too large.", 413);
    const body = await request.json();
    if (
      typeof body.id !== "string" ||
      typeof body.revisionId !== "string" ||
      typeof body.rationale !== "string" ||
      body.rationale.trim().length < 5 ||
      body.rationale.length > 2000 ||
      !["review", "state"].includes(body.action)
    )
      throw new VeriqApiError(
        "Provide the investigation, revision and a rationale of 5–2000 characters.",
        422,
      );
    if (
      body.action === "state" &&
      !["open", "investigating", "resolved"].includes(body.state)
    )
      throw new VeriqApiError("Invalid investigation state.", 422);
    const api = await sessionVeriqApi();
    if (!api) throw new VeriqApiError("Live intelligence is unavailable.", 503);
    const current = await api.workspace(body.id);
    if (current.investigation.data.latest_revision_id !== body.revisionId)
      throw new VeriqApiError(
        "The investigation has a newer revision. Refresh before submitting.",
        409,
      );
    const result = await api.investigationAction(body.id, body.action, {
      rationale: body.rationale,
      ...(body.action === "state" ? { state: body.state } : {}),
    });
    // The backend pins review notes under its lock. Surface a race instead of claiming the old revision was reviewed.
    if (body.action === "review" && result.data.revision_id !== body.revisionId)
      return NextResponse.json(
        {
          error:
            "A new revision arrived while the review was recorded. Inspect the review history before continuing.",
        },
        { status: 409 },
      );
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return failure(error);
  }
}
