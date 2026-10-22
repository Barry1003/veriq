import { sessionVeriqApi } from "@/services/api/session-reader";
import { CustomerInteractionsScreen } from "@/features/customer-intelligence/customer-interactions-screen";
import { getCustomerInteractions } from "@/services/customer-interactions";
import "./customer-interactions.css";

export default async function CustomerExperiencePage() {
  const api = await sessionVeriqApi();
  const snapshot = await getCustomerInteractions(api).catch(() => null);
  if (!snapshot) {
    return (
      <section className="cx-page" aria-labelledby="cx-unavailable">
        <h1 id="cx-unavailable">Customer interactions unavailable</h1>
        <p>Interaction records could not be loaded.</p>
      </section>
    );
  }
  return <CustomerInteractionsScreen snapshot={snapshot} />;
}

