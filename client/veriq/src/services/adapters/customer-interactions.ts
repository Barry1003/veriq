import { customerInteractionFixture } from "@/data/customer-interactions";
import type { CustomerInteractionSnapshot } from "@/types/customer-interactions";

export async function getMockCustomerInteractions(): Promise<CustomerInteractionSnapshot> {
  return customerInteractionFixture;
}

