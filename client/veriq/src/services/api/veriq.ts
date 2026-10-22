import "server-only";

export class VeriqApiError extends Error {
  constructor(message: string, readonly status: number | null) { super(message); }
}

export type JsonObject = Record<string, unknown>;
export type Row = {
  id: string;
  kind: string;
  classification: "internal" | "restricted";
  created_at: string;
  data: JsonObject;
};

export function object(value: unknown): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new VeriqApiError("Veriq returned an invalid object.", null);
  return value as JsonObject;
}

export function string(value: unknown): string {
  if (typeof value !== "string") throw new VeriqApiError("Veriq returned an invalid text field.", null);
  return value;
}

export function number(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new VeriqApiError("Veriq returned an invalid numeric field.", null);
  return value;
}

export function array<T>(value: unknown, decode: (item: unknown) => T): T[] {
  if (!Array.isArray(value)) throw new VeriqApiError("Veriq returned an invalid list.", null);
  return value.map(decode);
}

export function row(value: unknown): Row {
  const record = object(value);
  if (record.classification !== "internal" && record.classification !== "restricted")
    throw new VeriqApiError("Veriq returned an invalid classification.", null);
  return { id: string(record.id), kind: string(record.kind), classification: record.classification, created_at: string(record.created_at), data: object(record.data) };
}

export const collections = {
  sources: "/v1/sources",
  evidence: "/v1/evidence",
  assertions: "/v1/knowledge/assertions",
  reviews: "/v1/knowledge/reviews",
  observations: "/v1/observations",
  incidents: "/v1/incidents",
  interactions: "/v1/interactions",
  issues: "/v1/issues",
  investigations: "/v1/investigations",
  intents: "/v1/processing/intents",
  tasks: "/v1/inference/tasks",
} as const;

export const singletonPaths = {
  access: "/v1/access/me",
  setup: "/v1/setup",
  readiness: "/v1/setup/readiness",
  runtime: "/v1/inference/status",
  context: "/v1/knowledge/context",
} as const;

const identifier = (value: string) => {
  if (!/^[a-zA-Z0-9_.:-]{1,100}$/.test(value)) throw new VeriqApiError("Invalid evidence identifier.", 422);
  return encodeURIComponent(value);
};

/** Called only after a trusted server session selects its application principal. */
export function createVeriqApi(config: { baseUrl: string; token: string }, request: typeof fetch = fetch) {
  const base = new URL(config.baseUrl);
  if (!config.token || !["http:", "https:"].includes(base.protocol) || base.username || base.password || base.search || base.hash)
    throw new VeriqApiError("Veriq server connection is not configured.", null);

  async function get(path: string, body?: JsonObject): Promise<unknown> {
    let response: Response;
    try {
      response = await request(new URL(path, base), {
        cache: "no-store", redirect: "error",
        method: body ? "POST" : "GET",
        headers: { Accept: "application/json", Authorization: `Bearer ${config.token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: AbortSignal.timeout(12_000),
      });
    } catch {
      throw new VeriqApiError("Veriq is unreachable. The current evidence could not be refreshed.", null);
    }
    if (!response.ok) {
      const messages: Record<number, string> = {
        401: "The Veriq session credential was rejected.",
        403: "This principal cannot access the requested evidence.",
        404: "The record is unavailable or no longer visible.",
        409: "The evidence changed. Refresh the current revision.",
        422: "Veriq rejected the request fields.",
        429: "Veriq is busy. Refresh after the queue settles.",
        502: "An upstream evidence source is unavailable.",
        503: "Veriq is temporarily unavailable.",
      };
      throw new VeriqApiError(messages[response.status] ?? `Veriq returned HTTP ${response.status}.`, response.status);
    }
    try { return await response.json(); }
    catch { throw new VeriqApiError("Veriq returned invalid JSON.", null); }
  }

  return {
    investigationAction: async (id: string, action: "review" | "state", body: JsonObject) => row(await get(`/v1/investigations/${identifier(id)}/${action}`, body)),
    rows: async (collection: keyof typeof collections) => array(await get(collections[collection]), row),
    snapshot: async (name: keyof typeof singletonPaths) => object(await get(singletonPaths[name])),
    workspace: async (id: string) => {
      const value = object(await get(`/v1/investigations/${identifier(id)}/workspace`));
      return { investigation: row(value.investigation), revisions: array(value.revisions, row), review_history: array(value.review_history, row), inference_runs: array(value.inference_runs, row), evidence: array(value.evidence, row) };
    },
    task: async (id: string) => row(await get(`/v1/inference/tasks/${identifier(id)}`)),
    steps: async (id: string) => {
      const value = object(await get(`/v1/inference/tasks/${identifier(id)}/steps`));
      if (typeof value.redacted !== "boolean") throw new VeriqApiError("Invalid evidence visibility state.", null);
      // Revocation must discard content even if a malformed response includes cached steps.
      return { task_id: string(value.task_id), state: string(value.state), redacted: value.redacted, reason: typeof value.reason === "string" ? value.reason : null, steps: value.redacted ? [] : array(value.steps, row) };
    },
  };
}

export type VeriqApi = ReturnType<typeof createVeriqApi>;

export function requireVeriqApi(api?: VeriqApi): VeriqApi {
  if (!api) throw new VeriqApiError("Live access requires the approved server session-to-principal mapping. Contact the deployment administrator.", 401);
  return api;
}
