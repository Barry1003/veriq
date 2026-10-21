import Link from "next/link";
import { notFound } from "next/navigation";
import { adminNavigation } from "@/config/admin-navigation";

export default async function AdminPreview({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const match = adminNavigation.find(
    (item) =>
      item.href === `/administration/${section}` && section !== "system-health",
  );
  if (!match) notFound();
  return (
    <section
      className="sh-page sh-preview"
      aria-labelledby="admin-preview-heading"
    >
      <p className="sh-overline">ADMINISTRATION / DESIGN PREVIEW</p>
      <h1 id="admin-preview-heading">{match.label}</h1>
      <p>
        This section is represented in Veriq Figma but is not yet implemented in
        the frontend.
      </p>
      <div className="sh-panel">
        <h2>Implementation boundary</h2>
        <p>
          Real access control, model tests, source connections, and audit
          evidence require authenticated backend operations. None are simulated
          by this preview route.
        </p>
        <Link
          className="sh-secondary-link"
          href="/administration/system-health"
        >
          Back to System Health
        </Link>
      </div>
    </section>
  );
}
