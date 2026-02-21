import { STAGE_CONFIG, type JobStage } from "@/src/types";

interface StageHistoryEntry {
  stage: string;
  timestamp: string;
  user?: string;
}

export function TimelineTab({ history }: { history: StageHistoryEntry[] }) {
  if (history.length === 0) {
    return (
      <p className="text-sm text-gray-500 py-8 text-center">
        No stage history available.
      </p>
    );
  }

  return (
    <div className="relative">
      <div className="absolute left-3 top-2 bottom-2 w-px bg-gray-200" />
      <div className="space-y-4">
        {history.map((entry, i) => {
          const config = STAGE_CONFIG[entry.stage as JobStage];
          return (
            <div key={i} className="relative flex items-start gap-4 pl-8">
              <div
                className="absolute left-1.5 top-1.5 w-3 h-3 rounded-full border-2 bg-white"
                style={{ borderColor: config?.color || "#9ca3af" }}
              />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {config?.label || entry.stage}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(entry.timestamp).toLocaleString()}
                  {entry.user && <span className="text-gray-400"> by {entry.user}</span>}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
