import Link from "next/link";
import { JOB_STAGES, STAGE_CONFIG } from "@/src/types";

interface Props {
  jobsByStage: Record<string, number>;
  rebateValueByStage: Record<string, number>;
}

export function PipelineSummary({ jobsByStage, rebateValueByStage }: Props) {
  const totalJobs = Object.values(jobsByStage).reduce((a, b) => a + b, 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Progress bar */}
      {totalJobs > 0 && (
        <div className="flex h-1.5">
          {JOB_STAGES.map((stage) => {
            const count = jobsByStage[stage] || 0;
            if (count === 0) return null;
            return (
              <div
                key={stage}
                className="transition-all duration-500"
                style={{
                  width: `${(count / totalJobs) * 100}%`,
                  backgroundColor: STAGE_CONFIG[stage].color,
                }}
              />
            );
          })}
        </div>
      )}

      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Pipeline</h2>
          <span className="text-[10px] text-gray-400">{totalJobs} total</span>
        </div>

        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {JOB_STAGES.map((stage) => {
            const config = STAGE_CONFIG[stage];
            const count = jobsByStage[stage] || 0;
            const rebateValue = rebateValueByStage[stage] || 0;

            return (
              <Link
                key={stage}
                href={`/jobs?stage=${stage}`}
                className="group rounded-lg p-2.5 transition-all hover:shadow-sm border border-transparent hover:border-gray-200"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: config.color }}
                  />
                  <p className="text-[10px] font-medium text-gray-500 truncate">{config.label}</p>
                </div>
                <p className="text-xl font-bold text-gray-900 tabular-nums">{count}</p>
                {rebateValue > 0 && (
                  <p className="text-[10px] text-gray-400 tabular-nums mt-0.5">${rebateValue.toLocaleString()}</p>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
