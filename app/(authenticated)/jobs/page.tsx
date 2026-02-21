import { getCurrentUser } from "@/src/lib/auth/session";
import { getJobsRef, getCrewRef } from "@/src/lib/firestore/helpers";
import { JobsPageClient } from "@/src/components/jobs/jobs-page-client";
import { normalizeStage } from "@/src/types";

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const params = await searchParams;

  // Fetch jobs and crew in parallel
  const [jobsSnapshot, crewSnapshot] = await Promise.all([
    getJobsRef(user.companyId).orderBy("updatedAt", "desc").get(),
    getCrewRef(user.companyId).orderBy("name").get(),
  ]);

  const crewMap = new Map<string, string>();
  const crewLeads: Array<{ id: string; name: string }> = [];
  for (const doc of crewSnapshot.docs) {
    const data = doc.data();
    crewMap.set(doc.id, data.name || "");
    crewLeads.push({ id: doc.id, name: data.name || "" });
  }

  const jobs = jobsSnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      address: data.address?.street || data.address?.raw || "Unknown address",
      homeowner: data.homeowner?.name || "Unknown",
      stage: normalizeStage(data.stage, { hasAuditDate: !!data.auditDate, hasEnergyData: !!data.energyBaseline }),
      crewLeadName: data.crewLeadId ? crewMap.get(data.crewLeadId) || null : null,
      rebateEstimate: data.rebateEstimate ?? null,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      stageHistory: (data.stageHistory || []).map((h: Record<string, unknown>) => ({
        stage: h.stage as string,
        timestamp: typeof h.timestamp === "object" && h.timestamp !== null && "toDate" in h.timestamp
          ? (h.timestamp as { toDate: () => Date }).toDate().toISOString()
          : new Date().toISOString(),
      })),
    };
  });

  return (
    <JobsPageClient
      jobs={jobs}
      crewLeads={crewLeads}
      defaultView={(params.view as "kanban" | "table") || "kanban"}
      totalCount={jobs.length}
    />
  );
}
