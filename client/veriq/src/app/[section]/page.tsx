import Link from "next/link";
import { notFound } from "next/navigation";
import {
  secondaryRoutes,
  workspaceNavigation,
} from "@/config/workspace-navigation";

type Props = { params: Promise<{ section: string }> };

export default async function UnimplementedSection({ params }: Props) {
  const { section } = await params;
  const target = [...workspaceNavigation, ...secondaryRoutes].find(
    (item) => item.slug === section && item.href !== "/",
  );
  if (!target) notFound();
  return (
    <section className="vw-preview-section">
      <p className="vw-overline">VERIQ</p>
      <h1>{target.title}</h1>
      <p>{target.description}</p>
      <p>This section is not available yet.</p>
      <Link href="/" className="vw-preview-link">
        Return to Intelligence Overview
      </Link>
    </section>
  );
}
