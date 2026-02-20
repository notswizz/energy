import { STAGE_CONFIG, type JobStage } from "@/src/types";

export function StageBadge({ stage }: { stage: JobStage }) {
  const config = STAGE_CONFIG[stage] || STAGE_CONFIG.lead;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bgClass} ${config.textClass}`}>
      {config.label}
    </span>
  );
}
