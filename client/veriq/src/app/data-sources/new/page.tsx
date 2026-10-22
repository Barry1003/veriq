import type { Metadata } from "next";
import { GuidedKnowledgeAcquisition } from "@/features/institutional-knowledge/guided-knowledge-acquisition";
import "../knowledge-sources.css";
import "./knowledge-acquisition.css";

export const metadata: Metadata = {
  title: "Add Knowledge Source | Veriq",
  description: "Configure institution-approved knowledge acquisition and preserve source provenance",
};

export default function AddKnowledgeSourcePage() {
  return <GuidedKnowledgeAcquisition />;
}
