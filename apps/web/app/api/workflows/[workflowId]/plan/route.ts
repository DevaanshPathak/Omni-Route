import { proxyWorkflowOperation } from "../../../../../lib/workflow-proxy";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  context: { params: Promise<{ workflowId: string }> },
) {
  const { workflowId } = await context.params;
  return proxyWorkflowOperation(workflowId, "plan");
}
