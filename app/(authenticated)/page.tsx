import { getCurrentUser } from "@/src/lib/auth/session";
import { getJobsRef, getActivityRef } from "@/src/lib/firestore/helpers";
import { JOB_STAGES, normalizeStage } from "@/src/types";
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

  for (const doc of jobsSnapshot.docs) {
    const data = doc.data();
    totalJobs++;
    photosSynced += data.photoCount || 0;

    const stage = normalizeStage(data.stage, { hasAuditDate: !!data.auditDate, hasEnergyData: !!data.energyBaseline });
    jobsByStage[stage] = (jobsByStage[stage] || 0) + 1;
    rebateValueByStage[stage] = (rebateValueByStage[stage] || 0) + (data.rebateEstimate || 0);

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

  // Fallback activity from recent jobs if no activity collection entries yet
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
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      <PipelineSummary
        jobsByStage={jobsByStage}
        rebateValueByStage={rebateValueByStage}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Jobs" value={totalJobs} />
        <StatCard title="Photos Synced" value={photosSynced} />
        <StatCard
          title="Completed This Month"
          value={completedThisMonth}
          subtitle={`${completedLastMonth} last month`}
        />
        <StatCard title="Rebate Pipeline" value={`$${Object.values(rebateValueByStage).reduce((a, b) => a + b, 0).toLocaleString()}`} />
      </div>

      <ActivityFeed items={fallbackActivity} />
    </div>
  );
}
