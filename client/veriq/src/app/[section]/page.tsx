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
      <p className="vw-overline">VERIQ / DESIGN PREVIEW</p>
      <h1>{target.title}</h1>
      <p>{target.description}</p>
      <div className="vw-preview-notice">
        This route is not connected to an approved implementation or backend
        data source. Its screen will follow the corresponding Figma frame.
      </div>
      <Link href="/" className="vw-preview-link">
        Return to Intelligence Overview
      </Link>
    </section>
  );
}
