import { getMockCustomerInteractions } from "@/services/adapters/customer-interactions";
import type { CustomerInteractionSnapshot } from "@/types/customer-interactions";

export async function getCustomerInteractions(): Promise<CustomerInteractionSnapshot> {
  const mode = process.env.NEXT_PUBLIC_DATA_SOURCE ?? "mock";
  if (mode === "mock") return getMockCustomerInteractions();
  if (mode === "api") {
    throw new Error("The authorized customer interaction API contract is not available yet.");
  }
  throw new Error(`Unsupported Veriq data source: ${mode}`);
}

