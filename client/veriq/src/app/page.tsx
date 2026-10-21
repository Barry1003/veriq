import Link from "next/link";
import { workspaceNavigation } from "@/config/workspace-navigation";

const featuredSlugs = [
  "knowledge",
  "operations",
  "customer-experience",
  "investigations",
] as const;

export default function Home() {
  const featuredSections = featuredSlugs.map((slug) => {
    const section = workspaceNavigation.find((item) => item.slug === slug);
    if (!section) throw new Error(`Missing workspace section: ${slug}`);
    return section;
  });

  return (
    <section className="workspace-page" aria-labelledby="workspace-page-title">
      <div className="workspace-heading">
        <p className="workspace-eyebrow">VERIQ / INTELLIGENCE WORKSPACE</p>
        <h1 id="workspace-page-title">Institutional intelligence</h1>
        <p className="workspace-lead">
          Explore the connected knowledge, operational, and customer experience areas that
          support evidence-based investigation.
        </p>
      </div>

      <div className="workspace-notice" role="note">
        <strong>Workspace shell preview</strong>
        <p>
          Navigation is functional. Intelligence data, investigations, and live integrations
          have not been implemented in this screen.
        </p>
      </div>

      <div className="workspace-section-heading">
        <h2>Explore the workspace</h2>
        <p>The three intelligence pillars and their investigation workspace.</p>
      </div>

      <div className="workspace-card-grid">
        {featuredSections.map((section, index) => (
          <article className="workspace-feature-card" key={section.href}>
            <span className="workspace-card-number">0{index + 1}</span>
            <h3>{section.title}</h3>
            <p>{section.description}</p>
            <Link className="workspace-card-link" href={section.href}>
              Open section <span aria-hidden="true">→</span>
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}