import Link from "next/link";

interface ActivityItem {
  id: string;
  type?: string;
  message: string;
  timestamp: string;
  jobId?: string;
  jobAddress?: string;
  authorName?: string;
}

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>

      {items.length === 0 ? (
        <p className="text-sm text-gray-500">No recent activity. Sync your integrations to get started.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const dotColor =
              item.type === "stage_changed"
                ? "bg-blue-400"
                : item.type === "note_added"
                ? "bg-yellow-400"
                : "bg-gray-300";

            return (
              <div key={item.id} className="flex items-start gap-3 py-1">
                <div className={`w-2 h-2 rounded-full ${dotColor} mt-1.5 shrink-0`} />
                <div className="min-w-0 flex-1">
                  {item.jobId ? (
                    <Link
                      href={`/jobs/${item.jobId}`}
                      className="text-sm text-gray-900 hover:text-blue-600"
                    >
                      {item.message}
                    </Link>
                  ) : (
                    <p className="text-sm text-gray-900">{item.message}</p>
                  )}
                  <div className="flex items-center gap-2 mt-0.5">
                    {item.authorName && (
                      <span className="text-xs font-medium text-gray-500">{item.authorName}</span>
                    )}
                    <span className="text-xs text-gray-400">
                      {new Date(item.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
