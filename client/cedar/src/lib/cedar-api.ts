import "server-only";

export type BankRow<T = Record<string, unknown>> = {
    id: string;
    kind: string;
    classification: "internal" | "restricted";
    created_at: string;
    data: T;
};
export type Account = {
    account_id: string;
    customer_id: string;
    currency: string;
    balance_minor: number;
    reserved_minor: number;
};
export type Transaction = {
    transaction_id: string;
    customer_id: string;
    account_id: string;
    amount_minor: number;
    currency: string;
    route_id: string;
    gateway_id: string;
    status: "pending" | "completed" | "failed";
    response: string;
    occurred_at: string;
    version: number;
    beneficiary_verified?: boolean;
};
export type Interaction = {
    customer_id: string;
    channel: "in_app" | "email" | "contact_centre" | "branch";
    text: string;
    transaction_id?: string | null;
    occurred_at: string;
    source_id?: string;
};
export type Knowledge = {
    knowledge: {
        entities: Array<{
            native_id: string;
            kind: string;
            name: string;
        }>;
        relationships: Array<{
            subject: string;
            predicate: string;
            object: string;
        }>;
        valid_from: string;
    };
    routes: Record<string, string>;
};
export type Feed = {
    items: Array<{
        sequence: number;
        envelope: {
            source_id: string;
            native_record_id: string;
            occurred_at?: string;
            observed_at?: string;
            payload: Record<string, unknown>;
        };
    }>;
    next_cursor: number;
    synthetic: boolean;
    coverage_complete?: boolean;
};
export type Channel = {
    channel: string;
    source_id: string;
    received: number;
    last_received_at: string | null;
    state: string;
    transport: string;
};
export type Load<T> = {
    data: T | null;
    error: string | null;
    mode: "preview" | "api";
};
export const dataMode = process.env.CEDAR_DATA_SOURCE === "api" ? "api" : "preview";
type Credential = "staff" | "customer" | "feed" | "channel";
const credentialNames: Record<Credential, string> = {
    staff: "CEDAR_STAFF_TOKEN",
    customer: "CEDAR_CUSTOMER_TOKEN",
    feed: "CEDAR_FEED_TOKEN",
    channel: "CEDAR_CHANNEL_TOKEN",
};
export async function bankGet<T>(path: string, role: Credential = "staff"): Promise<Load<T>> {
    if (dataMode === "preview")
        return { data: null, error: null, mode: "preview" };
    const token = process.env[credentialNames[role]];
    if (!token)
        return { data: null, error: "Bank credential unavailable for this source.", mode: "api" };
    try {
        const response = await fetch(new URL(path, process.env.CEDAR_API_URL ?? "http://127.0.0.1:8101"), {
            cache: "no-store",
            headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
            signal: AbortSignal.timeout(9000),
        });
        if (!response.ok)
            return {
                data: null,
                error: response.status === 403 ? "Access is not authorized for this source." : response.status === 401 ? "The bank credential was rejected." : `Bank API error ${response.status}.`,
                mode: "api",
            };
        return { data: await response.json() as T, error: null, mode: "api" };
    }
    catch {
        return { data: null, error: "The bank API is unreachable.", mode: "api" };
    }
}
export async function bankGetRecentOperationalFeed(): Promise<Load<Feed>> {
    if (dataMode === "preview") return { data: null, error: null, mode: "preview" };
    const observed: Feed["items"] = [];
    let cursor = 0;
    let complete = false;
    for (let page = 0; page < 10; page++) {
        const response = await bankGet<Feed>(`/v1/feed?source_id=cedar-operations&limit=500&after=${cursor}`, "feed");
        if (!response.data) return { data: null, error: response.error ?? "Operational feed unavailable.", mode: "api" };
        const { items, next_cursor } = response.data;
        observed.push(...items);
        if (items.length < 500) { complete = true; cursor = next_cursor; break; }
        if (next_cursor <= cursor) break;
        cursor = next_cursor;
    }
    return {
        data: { items: observed.slice(-200), next_cursor: cursor, synthetic: true, coverage_complete: complete },
        error: complete ? null : "Feed scan reached its safety limit; the latest bank event cannot be confirmed.",
        mode: "api",
    };
}

export { naira, dateLabel } from "./format";

