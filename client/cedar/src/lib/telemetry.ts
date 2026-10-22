import type { Feed } from "./cedar-api";

export type GatewayObservation = {
  id: string;
  gateway: string;
  route: string;
  attempts: number;
  timeouts: number;
  windowSeconds: number;
  eventTime: string | null;
  sequence: number;
  rate: number;
};

export function observationsFromFeed(feed: Feed | null): GatewayObservation[] {
  if (!feed) return [];
  return feed.items.flatMap(({ sequence, envelope }) => {
    const p = envelope.payload;
    const attempts = p.attempts;
    const timeouts = p.timeouts;
    const seconds = p.window_seconds;
    if (typeof p.gateway_id !== "string" || typeof p.route_id !== "string") return [];
    if (typeof attempts !== "number" || !Number.isSafeInteger(attempts) || attempts <= 0) return [];
    if (typeof timeouts !== "number" || !Number.isSafeInteger(timeouts) || timeouts < 0 || timeouts > attempts) return [];
    if (typeof seconds !== "number" || !Number.isSafeInteger(seconds) || seconds < 1) return [];
    const occurred = typeof p.occurred_at === "string" ? p.occurred_at : null;
    return [{
      id: envelope.native_record_id,
      gateway: p.gateway_id,
      route: p.route_id,
      attempts,
      timeouts,
      windowSeconds: seconds,
      eventTime: occurred ?? envelope.occurred_at ?? envelope.observed_at ?? null,
      sequence,
      rate: timeouts / attempts * 100,
    }];
  }).sort((a, b) => b.sequence - a.sequence);
}

export function latestObservationForGateway(rows: GatewayObservation[], gateway: string) {
  return rows.find(item => item.gateway === gateway) ?? null;
}
