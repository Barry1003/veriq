import type { Metadata } from "next";
import { ExpandedDependencyGraph } from "@/features/institutional-knowledge/expanded-dependency-graph";
import { getDependencyGraph } from "@/services/dependency-graph";
import "./expanded-dependency-graph.css";

export const metadata: Metadata = {
    title: "Institutional Dependency Explorer | Veriq",
    description: "Source-qualified dependencies, bank validity, evidence receipt and investigation context",
};

export default async function DependencyGraphPage() {
    try {
        const snapshot = await getDependencyGraph();
        return <ExpandedDependencyGraph snapshot={snapshot} />;
    } catch {
        return (
            <section className="dg-page" role="status">
                <h1>Dependency evidence unavailable</h1>
                <p>Source and temporal evidence could not be loaded.</p>
            </section>
        );
    }
}