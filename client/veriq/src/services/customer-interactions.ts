import { requireVeriqApi, type VeriqApi } from "./api/veriq";
import { getLiveCustomerInteractions } from "./adapters/live-customer-interactions";
import { getMockCustomerInteractions } from "@/services/adapters/customer-interactions";
import type { CustomerInteractionSnapshot } from "@/types/customer-interactions";

export async function getCustomerInteractions(api?: VeriqApi): Promise<CustomerInteractionSnapshot> {
  const mode = process.env.VERIQ_DATA_SOURCE ?? process.env.NEXT_PUBLIC_DATA_SOURCE ?? "mock";
  if (mode === "mock") return getMockCustomerInteractions();
  if (mode === "api") return getLiveCustomerInteractions(requireVeriqApi(api));
  throw new Error(`Unsupported Veriq data source: ${mode}`);
}

