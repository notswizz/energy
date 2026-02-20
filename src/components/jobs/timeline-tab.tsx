interface StageHistoryEntry {
  stage: string;
  timestamp: string;
  user?: string;
}

const STAGE_LABELS: Record<string, string> = {
  audit: "Audit",
  in_progress: "In Progress",
  inspection: "Inspection",
  completed: "Completed",
  paid: "Paid",
};

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
      <div className="space-y-6">
        {history.map((entry, i) => (
          <div key={i} className="relative flex items-start gap-4 pl-8">
            <div className="absolute left-1.5 top-1.5 w-3 h-3 rounded-full bg-white border-2 border-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-900">
                {STAGE_LABELS[entry.stage] || entry.stage}
              </p>
              <p className="text-xs text-gray-500">
                {new Date(entry.timestamp).toLocaleString()}
                {entry.user && ` by ${entry.user}`}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
