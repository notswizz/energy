import Link from "next/link";
import { getCurrentUser } from "@/src/lib/auth/session";
import { getJobsRef, getActivityRef } from "@/src/lib/firestore/helpers";
import { JOB_STAGES, STAGE_CONFIG, normalizeStage } from "@/src/types";
import { serializeActivity } from "@/src/lib/firestore/serialize";
import { StatCard } from "@/src/components/ui/stat-card";
import { ActivityFeed } from "@/src/components/dashboard/activity-feed";
import { PipelineSummary } from "@/src/components/dashboard/pipeline-summary";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [jobsSnapshot, activitySnap] = await Promise.all([
    getJobsRef(user.companyId).get(),
    getActivityRef(user.companyId).orderBy("timestamp", "desc").limit(10).get(),
  ]);

  let totalJobs = 0;
  let photosSynced = 0;
  const jobsByStage: Record<string, number> = {};
  const rebateValueByStage: Record<string, number> = {};
  for (const s of JOB_STAGES) {
    jobsByStage[s] = 0;
    rebateValueByStage[s] = 0;
  }

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  let completedThisMonth = 0;
  let completedLastMonth = 0;

  let totalApprovedRebates = 0;
  let totalCosts = 0;
  let pipelineValue = 0;
  let jobsThisMonth = 0;
  const margins: number[] = [];

  // Upcoming audits/inspections
  const upcoming: Array<{ id: string; address: string; date: string; type: "audit" | "inspection" }> = [];

  for (const doc of jobsSnapshot.docs) {
    const data = doc.data();
    totalJobs++;
    photosSynced += data.photoCount || 0;

    const stage = normalizeStage(data.stage, { hasAuditDate: !!data.auditDate, hasEnergyData: !!data.energyBaseline });
    jobsByStage[stage] = (jobsByStage[stage] || 0) + 1;
    rebateValueByStage[stage] = (rebateValueByStage[stage] || 0) + (data.rebateEstimate || 0);

    const createdAt = data.createdAt?.toDate?.() || null;
    if (createdAt && createdAt >= thisMonthStart) jobsThisMonth++;

    const tracker = (data.rebateTracker || []) as Array<{ status: string; amountApproved: number | null; amountPaid: number | null }>;
    let jobApproved = 0;
    for (const entry of tracker) {
      if ((entry.status === "approved" || entry.status === "paid") && entry.amountApproved != null) {
        totalApprovedRebates += entry.amountApproved;
        jobApproved += entry.amountApproved;
      }
    }

    if (stage !== "complete") {
      pipelineValue += data.rebateEstimate || 0;
    }

    const costing = data.costing as { labor: number; materials: number; equipment: number; other: number } | null;
    if (costing) {
      const jobCost = costing.labor + costing.materials + costing.equipment + costing.other;
      totalCosts += jobCost;
      if (jobApproved > 0) {
        margins.push(((jobApproved - jobCost) / jobApproved) * 100);
      }
    }

    // Upcoming dates
    const addr = data.address?.raw || data.address?.street || "Unknown";
    const today = now.toISOString().split("T")[0];
    if (data.auditDate && data.auditDate >= today && stage !== "complete") {
      upcoming.push({ id: doc.id, address: addr, date: data.auditDate, type: "audit" });
    }
    if (data.inspectionDate && data.inspectionDate >= today && stage !== "complete") {
      upcoming.push({ id: doc.id, address: addr, date: data.inspectionDate, type: "inspection" });
    }

    const history = data.stageHistory || [];
    for (const entry of history) {
      if (entry.stage === "complete") {
        const ts = entry.timestamp?.toDate?.() || null;
        if (ts) {
          if (ts >= thisMonthStart) completedThisMonth++;
          else if (ts >= lastMonthStart && ts < thisMonthStart) completedLastMonth++;
        }
      }
    }
  }

  upcoming.sort((a, b) => a.date.localeCompare(b.date));
  const profit = totalApprovedRebates - totalCosts;
  const avgMargin = margins.length > 0 ? margins.reduce((a, b) => a + b, 0) / margins.length : 0;

  const recentActivity = activitySnap.docs.map((doc) => {
    const s = serializeActivity(doc);
    return {
      id: s.id as string,
      type: s.type as string,
      message: s.message as string,
      timestamp: s.timestamp as string,
      jobId: s.jobId as string | undefined,
      jobAddress: s.jobAddress as string | undefined,
      authorName: s.authorName as string | undefined,
    };
  });

  const fallbackActivity = recentActivity.length > 0
    ? recentActivity
    : jobsSnapshot.docs
        .sort((a, b) => {
          const aTime = a.data().updatedAt?.toDate?.()?.getTime() || 0;
          const bTime = b.data().updatedAt?.toDate?.()?.getTime() || 0;
          return bTime - aTime;
        })
        .slice(0, 10)
        .map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            type: "stage_changed",
            message: `${data.address?.raw || "Unknown"} — ${data.stage}`,
            timestamp: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
            jobId: doc.id,
          };
        });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        <Link
          href="/jobs"
          className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors shadow-sm"
        >
          View All Jobs
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard
          title="Profit"
          value={`${profit >= 0 ? "" : "-"}$${Math.abs(profit).toLocaleString()}`}
          subtitle="Rebates - costs"
          accent={profit >= 0 ? "green" : "red"}
        />
        <StatCard title="Total Rebates" value={`$${totalApprovedRebates.toLocaleString()}`} subtitle="Approved rebates" />
        <StatCard title="Avg Margin" value={margins.length > 0 ? `${avgMargin.toFixed(1)}%` : "—"} subtitle={`${margins.length} job${margins.length !== 1 ? "s" : ""} tracked`} />
        <StatCard title="Jobs This Month" value={jobsThisMonth} subtitle={`${totalJobs} total`} />
        <StatCard title="Pipeline Value" value={`$${pipelineValue.toLocaleString()}`} subtitle="In-progress est." />
      </div>

      {/* Pipeline */}
      <PipelineSummary jobsByStage={jobsByStage} rebateValueByStage={rebateValueByStage} />

      {/* Bottom row: Activity + Upcoming */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <ActivityFeed items={fallbackActivity} />
        </div>

        {/* Upcoming */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-5 pt-4 pb-2">
            <h2 className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Upcoming</h2>
          </div>
          {upcoming.length === 0 ? (
            <div className="px-5 pb-5">
              <p className="text-sm text-gray-400 py-6 text-center">No upcoming audits or inspections</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {upcoming.slice(0, 8).map((item) => (
                <Link
                  key={`${item.id}-${item.type}`}
                  href={`/jobs/${item.id}`}
                  className="flex items-center gap-3 px-5 py-2.5 hover:bg-gray-50/50 transition-colors"
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${item.type === "audit" ? "bg-blue-500" : "bg-purple-500"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-700 truncate">{item.address}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] font-medium uppercase ${item.type === "audit" ? "text-blue-500" : "text-purple-500"}`}>
                      {item.type}
                    </span>
                    <span className="text-[10px] text-gray-300 tabular-nums">
                      {new Date(item.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
