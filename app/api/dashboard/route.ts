import { NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/auth/session";
import { getJobsRef, getSyncStateRef, getActivityRef } from "@/src/lib/firestore/helpers";
import { serializeActivity } from "@/src/lib/firestore/serialize";
import { JOB_STAGES, normalizeStage, type SyncState } from "@/src/types";

const DEFAULT_SYNC_STATE: SyncState = {
  provider: "snuggpro",
  lastSyncAt: null,
  status: "idle",
  lastError: null,
  itemsSynced: 0,
};

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const jobsSnapshot = await getJobsRef(user.companyId).get();

  let totalJobs = 0;
  let photosSynced = 0;
  let auditsCompleted = 0;
  let rebatesPending = 0;

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

  // For avgDaysPerStage
  const stageDurations: Record<string, number[]> = {};

  for (const doc of jobsSnapshot.docs) {
    const data = doc.data();
    totalJobs++;
    photosSynced += data.photoCount || 0;

    const stage = normalizeStage(data.stage, { hasAuditDate: !!data.auditDate, hasEnergyData: !!data.energyBaseline });
    if (["complete", "paid"].includes(stage)) auditsCompleted++;
    if (data.rebates?.submissionStatus === "pending") rebatesPending++;

    jobsByStage[stage] = (jobsByStage[stage] || 0) + 1;
    rebateValueByStage[stage] = (rebateValueByStage[stage] || 0) + (data.rebateEstimate || 0);

    // Count completed this/last month from stageHistory
    const history = data.stageHistory || [];
    for (const entry of history) {
      if (entry.stage === "complete") {
        const ts = entry.timestamp?.toDate?.() || (typeof entry.timestamp === "string" ? new Date(entry.timestamp) : null);
        if (ts) {
          if (ts >= thisMonthStart) completedThisMonth++;
          else if (ts >= lastMonthStart && ts < thisMonthStart) completedLastMonth++;
        }
      }
    }

    // Compute duration between consecutive stage history entries
    if (history.length >= 2) {
      const sorted = [...history].sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
        const aTs = (a.timestamp as { toDate?: () => Date })?.toDate?.()?.getTime() || 0;
        const bTs = (b.timestamp as { toDate?: () => Date })?.toDate?.()?.getTime() || 0;
        return aTs - bTs;
      });
      for (let i = 0; i < sorted.length - 1; i++) {
        const fromTs = (sorted[i].timestamp as { toDate?: () => Date })?.toDate?.()?.getTime();
        const toTs = (sorted[i + 1].timestamp as { toDate?: () => Date })?.toDate?.()?.getTime();
        if (fromTs && toTs) {
          const days = (toTs - fromTs) / (1000 * 60 * 60 * 24);
          const stageName = sorted[i].stage as string;
          if (!stageDurations[stageName]) stageDurations[stageName] = [];
          stageDurations[stageName].push(days);
        }
      }
    }
  }

  const avgDaysPerStage: Record<string, number> = {};
  for (const [stage, durations] of Object.entries(stageDurations)) {
    if (durations.length > 0) {
      avgDaysPerStage[stage] = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
    }
  }

  // Get sync states
  const [snuggproDoc, companycamDoc] = await Promise.all([
    getSyncStateRef(user.companyId, "snuggpro").get(),
    getSyncStateRef(user.companyId, "companycam").get(),
  ]);

  const snuggproSync: SyncState = snuggproDoc.exists
    ? { ...DEFAULT_SYNC_STATE, ...snuggproDoc.data(), provider: "snuggpro" }
    : { ...DEFAULT_SYNC_STATE, provider: "snuggpro" };

  const companycamSync: SyncState = companycamDoc.exists
    ? { ...DEFAULT_SYNC_STATE, ...companycamDoc.data(), provider: "companycam" }
    : { ...DEFAULT_SYNC_STATE, provider: "companycam" };

  // Recent activity from activity collection
  const activitySnap = await getActivityRef(user.companyId)
    .orderBy("timestamp", "desc")
    .limit(10)
    .get();

  const recentActivity = activitySnap.docs.map(serializeActivity);

  return NextResponse.json({
    totalJobs,
    photosSynced,
    auditsCompleted,
    rebatesPending,
    jobsByStage,
    rebateValueByStage,
    completedThisMonth,
    completedLastMonth,
    avgDaysPerStage,
    recentActivity,
    syncStatus: {
      snuggpro: snuggproSync,
      companycam: companycamSync,
    },
  });
}
