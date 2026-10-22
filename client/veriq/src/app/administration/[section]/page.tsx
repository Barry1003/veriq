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
      className="sh-page"
      aria-labelledby="admin-section-heading"
    >
      <p className="sh-overline">ADMINISTRATION</p>
      <h1 id="admin-section-heading">{match.label}</h1>
      <p>This section is not available yet.</p>
      <div className="sh-panel">
        <h2>Administration section unavailable</h2>
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
