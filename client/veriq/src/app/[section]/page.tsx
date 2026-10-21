import Link from "next/link";
import { notFound } from "next/navigation";
import { workspaceNavigation } from "@/config/workspace-navigation";

type SectionPageProps = { params: Promise<{ section: string }> };

export default async function SectionPage({ params }: SectionPageProps) {
  const { section } = await params;
  const definition = workspaceNavigation.find(
    (item) => item.slug === section && item.href !== "/",
  );

  if (!definition) notFound();

  return (
    <section className="workspace-page" aria-labelledby="section-page-title">
      <div className="workspace-heading">
        <p className="workspace-eyebrow">VERIQ / WORKSPACE SECTION</p>
        <h1 id="section-page-title">{definition.title}</h1>
        <p className="workspace-lead">{definition.description}</p>
      </div>
      <div className="workspace-empty-state">
        <span className="workspace-empty-mark" aria-hidden="true">◇</span>
        <h2>Section layout pending design approval</h2>
        <p>
          This route is ready. Its data, visualizations, and interactions will be built from
          the reviewed Figma screen and typed data contracts—not simulated here.
        </p>
        <Link href="/" className="workspace-card-link">
          <span aria-hidden="true">←</span> Back to overview
        </Link>
      </div>
    </section>
  );
}