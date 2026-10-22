"use client";
import type { AssessmentViewModel } from "@/types/investigations";
import { ShieldCheck } from "lucide-react";
import { Card, Statements } from "./investigation-presentation";
export function InvestigationAnalysis({
  assessment,
  onInspect,
}: {
  assessment: AssessmentViewModel | undefined;
  onInspect: (id: string) => void;
}) {
  return (
    <Card title="Investigation analysis" id="analysis">
      <div className="iw-section-lead">
        <ShieldCheck size={23} />
        <div>
          <strong>
            {assessment
              ? assessment.state.replaceAll("_", " ")
              : "No reviewable AI assessment"}
          </strong>
          <p>
            {assessment
              ? `Qualification: ${assessment.qualification} · Acceptance: ${assessment.acceptance}`
              : "Source findings remain available while inference is unavailable or awaiting a valid assessment."}
          </p>
        </div>
      </div>
      {assessment?.state === "reviewable_assessment" && (
        <>
          <h3>Source facts</h3>
          <Statements items={assessment.sourceFacts} onInspect={onInspect} />
          <h3>Checked derived findings</h3>
          <Statements items={assessment.findings} onInspect={onInspect} />
          <h3>Unverified hypotheses · proposed support and contradictions</h3>
          <Statements items={assessment.hypotheses} onInspect={onInspect} />
          <h3>Contradictions</h3>
          <Statements items={assessment.contradictions} onInspect={onInspect} />
          <h3>Uncertainty and missing information</h3>
          <ul>
            {assessment.unknowns.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
          <h3>Recommended next checks</h3>
          <ul>
            {assessment.nextChecks.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}
