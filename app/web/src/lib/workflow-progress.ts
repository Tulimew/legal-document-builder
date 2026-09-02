import type { ProjectWorkflowReadModel, WorkflowStageInstance, WorkflowStageInstanceStatus } from "@legal-document-builder/contracts";

export type ProjectProgressStep = { code: string; name: string; order: number; status: WorkflowStageInstanceStatus | "NOT_STARTED"; sequence?: number };
export type ProjectProgress = { steps: ProjectProgressStep[]; completed: number; percentage: number; current?: ProjectProgressStep };

export function deriveProjectProgress(configuration: ProjectWorkflowReadModel, instances: WorkflowStageInstance[]): ProjectProgress {
  const steps = [...configuration.stages].sort((a, b) => a.order - b.order).map((definition) => {
    const latest = instances.filter((item) => item.stageCode === definition.code && item.status !== "CANCELLED").sort((a, b) => b.sequence - a.sequence)[0];
    return { code: definition.code, name: definition.name, order: definition.order, status: latest?.status ?? "NOT_STARTED", ...(latest ? { sequence: latest.sequence } : {}) } satisfies ProjectProgressStep;
  });
  const completed = steps.filter((step) => step.status === "COMPLETED").length;
  const current = steps.find((step) => step.status === "ACTIVE" || step.status === "BLOCKED") ?? steps.find((step) => step.status !== "COMPLETED");
  return { steps, completed, percentage: steps.length ? Math.round(completed * 100 / steps.length) : 0, ...(current ? { current } : {}) };
}
