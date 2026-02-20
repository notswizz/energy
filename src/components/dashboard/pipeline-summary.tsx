import Link from "next/link";
import { JOB_STAGES, STAGE_CONFIG, type JobStage } from "@/src/types";

interface Props {
  jobsByStage: Record<string, number>;
  rebateValueByStage: Record<string, number>;
}

export function PipelineSummary({ jobsByStage, rebateValueByStage }: Props) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Pipeline</h2>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {JOB_STAGES.map((stage) => {
          const config = STAGE_CONFIG[stage];
          const count = jobsByStage[stage] || 0;
          const rebateValue = rebateValueByStage[stage] || 0;

          return (
            <Link
              key={stage}
              href={`/jobs?stage=${stage}`}
              className={`flex-shrink-0 w-36 rounded-lg border-l-4 p-3 bg-gray-50 hover:bg-gray-100 transition-colors`}
              style={{ borderLeftColor: config.color }}
            >
              <p className="text-xs font-medium text-gray-500">{config.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{count}</p>
              {rebateValue > 0 && (
                <p className="text-xs text-green-600 mt-1">${rebateValue.toLocaleString()}</p>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
