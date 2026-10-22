import { redirect } from "next/navigation";
import { IntelligenceWorkbench } from "@/features/investigations/intelligence-workbench";
export default async function InvestigationsPage({searchParams}:{searchParams:Promise<{case?:string}>}) {
  const query=await searchParams;
  if(query.case)redirect(`/investigations/${encodeURIComponent(query.case)}`);
  return <IntelligenceWorkbench view="queue"/>;
}
