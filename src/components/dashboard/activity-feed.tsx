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

const TYPE_CONFIG: Record<string, { icon: string; color: string }> = {
  stage_changed: { icon: "arrow", color: "text-blue-500" },
  note_added: { icon: "note", color: "text-amber-500" },
  photos_synced: { icon: "photo", color: "text-purple-500" },
  sync_completed: { icon: "sync", color: "text-green-500" },
  job_created: { icon: "plus", color: "text-emerald-500" },
};

function ActivityIcon({ type }: { type: string }) {
  const cfg = TYPE_CONFIG[type] || { icon: "dot", color: "text-gray-400" };

  switch (cfg.icon) {
    case "arrow":
      return (
        <svg className={`w-3.5 h-3.5 ${cfg.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      );
    case "note":
      return (
        <svg className={`w-3.5 h-3.5 ${cfg.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
        </svg>
      );
    case "plus":
      return (
        <svg className={`w-3.5 h-3.5 ${cfg.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      );
    default:
      return <span className={`w-1.5 h-1.5 rounded-full bg-current ${cfg.color}`} />;
  }
}

function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="px-5 pt-4 pb-2">
        <h2 className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Recent Activity</h2>
      </div>

      {items.length === 0 ? (
        <div className="px-5 pb-5">
          <p className="text-sm text-gray-400 py-6 text-center">No recent activity</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 px-5 py-2.5 hover:bg-gray-50/50 transition-colors">
              <div className="w-6 h-6 rounded-full bg-gray-50 flex items-center justify-center shrink-0">
                <ActivityIcon type={item.type || ""} />
              </div>
              <div className="min-w-0 flex-1">
                {item.jobId ? (
                  <Link href={`/jobs/${item.jobId}`} className="text-sm text-gray-700 hover:text-gray-900 truncate block">
                    {item.message}
                  </Link>
                ) : (
                  <p className="text-sm text-gray-700 truncate">{item.message}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {item.authorName && (
                  <span className="text-[10px] font-medium text-gray-400">{item.authorName}</span>
                )}
                <span className="text-[10px] text-gray-300 tabular-nums">{timeAgo(item.timestamp)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
