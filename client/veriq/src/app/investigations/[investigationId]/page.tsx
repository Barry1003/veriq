import { IntelligenceWorkbench } from "@/features/investigations/intelligence-workbench";
export default async function InvestigationPage({params}:{params:Promise<{investigationId:string}>}) {
  const {investigationId}=await params;
  return <IntelligenceWorkbench key={investigationId} view="workspace" id={investigationId}/>;
}
