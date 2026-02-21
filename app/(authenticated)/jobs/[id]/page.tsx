import { notFound } from "next/navigation";
import { getCurrentUser } from "@/src/lib/auth/session";
import { getJobRef, getPhotosRef, getNotesRef, getCrewRef } from "@/src/lib/firestore/helpers";
import { StageBadge } from "@/src/components/ui/stage-badge";
import { JobDetailClient } from "@/src/components/jobs/job-detail-client";
import { CrmPanel } from "@/src/components/jobs/crm-panel";
import { PdfUploadButton } from "@/src/components/jobs/pdf-upload-button";
import { serializeNote } from "@/src/lib/firestore/serialize";
import { normalizeStage, type IncomeTier, type Measure } from "@/src/types";

/**
 * Georgia HER (Home Efficiency Rebates) program calculation.
 *
 * Below 80% AMI:
 *   20-34% savings → 98% of project cost, max $10,000
 *   35%+ savings   → 98% of project cost, max $16,000
 *
 * 80-150% AMI (or no tier set):
 *   20-34% savings → 50% of project cost, max $2,000
 *   35%+ savings   → 50% of project cost, max $4,000
 *
 * Above 150% AMI: same as 80-150% tier
 */
function calculateGeorgiaHerRebate(
  savingsPercent: number | null,
  incomeTier: IncomeTier | null,
  projectCost: number
): number | null {
  if (savingsPercent == null || savingsPercent < 20) return null;

  const isLowIncome = incomeTier === "below_80_ami";
  const highSavings = savingsPercent >= 35;

  if (isLowIncome) {
    const covered = Math.round(projectCost * 0.98);
    const cap = highSavings ? 16000 : 10000;
    return Math.min(covered, cap);
  } else {
    const covered = Math.round(projectCost * 0.5);
    const cap = highSavings ? 4000 : 2000;
    return Math.min(covered, cap);
  }
}

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const { id } = await params;
  const [jobDoc, photosSnapshot, notesSnapshot, crewSnapshot] = await Promise.all([
    getJobRef(user.companyId, id).get(),
    getPhotosRef(user.companyId, id).orderBy("takenAt", "desc").get(),
    getNotesRef(user.companyId, id).orderBy("createdAt", "desc").get(),
    getCrewRef(user.companyId).orderBy("name").get(),
  ]);

  if (!jobDoc.exists) notFound();

  const jobData = jobDoc.data()!;

  const photos = photosSnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      url: (data.url as string) || "",
      thumbnailUrl: (data.thumbnailUrl as string) || "",
      takenAt: data.takenAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      lat: (data.lat as number) ?? null,
      lng: (data.lng as number) ?? null,
      tags: (data.tags as string[]) || [],
    };
  });

  const notes = notesSnapshot.docs.map((doc) => serializeNote(doc) as {
    id: string;
    text: string;
    authorId: string;
    authorName: string;
    createdAt: string;
    type: "note" | "stage_change" | "system";
  });

  const crewLeads = crewSnapshot.docs.map((doc) => ({
    id: doc.id,
    name: doc.data().name || "",
  }));

  const measures: Measure[] = (jobData.measures || []) as Measure[];
  const savingsPercent: number | null = jobData.savingsPercent || null;
  const incomeTier = (jobData.incomeTier || null) as IncomeTier | null;
  const totalMeasureCost = measures.reduce((sum, m) => sum + (m.cost || 0), 0);

  // Georgia HER rebate calculation based on savings % and income tier
  const rebateEstimate = calculateGeorgiaHerRebate(savingsPercent, incomeTier, totalMeasureCost);

  const job = {
    id: jobDoc.id,
    address: jobData.address || { raw: "Unknown" },
    homeowner: jobData.homeowner || { name: "Unknown" },
    stage: normalizeStage(jobData.stage, { hasAuditDate: !!jobData.auditDate, hasEnergyData: !!jobData.energyBaseline }),
    crew: jobData.crew || [],
    energyBaseline: jobData.energyBaseline || null,
    energyImproved: jobData.energyImproved || null,
    savingsPercent,
    measures,
    hvac: jobData.hvac || {},
    attic: jobData.attic || {},
    walls: jobData.walls || {},
    windows: jobData.windows || {},
    checklistData: jobData.checklistData || null,
    dhw: jobData.dhw || {},
    healthSafety: jobData.healthSafety || null,
    rebates: jobData.rebates || null,
    rebateTracker: (jobData.rebateTracker || []) as import("@/src/types").RebateTrackerEntry[],
    costing: (jobData.costing || null) as import("@/src/types").JobCosting | null,
    stageHistory: (jobData.stageHistory || []).map((h: Record<string, unknown>) => ({
      ...h,
      stage: h.stage as string,
      timestamp: typeof h.timestamp === "object" && h.timestamp !== null && "toDate" in h.timestamp
        ? (h.timestamp as { toDate: () => Date }).toDate().toISOString()
        : new Date().toISOString(),
    })),
    snuggproId: jobData.snuggproId || "",
    companycamProjectId: jobData.companycamProjectId || null,
    crewLeadId: jobData.crewLeadId || null,
    incomeTier,
    rebateEstimate,
    auditDate: jobData.auditDate || null,
    inspectionDate: jobData.inspectionDate || null,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{job.address.raw}</h1>
          <div className="flex items-center gap-3 mt-2">
            <StageBadge stage={job.stage} />
          </div>
        </div>

        <div className="flex gap-2">
          <PdfUploadButton
            jobId={job.id}
            hasChecklist={!!jobData.checklistPdfUrl || !!jobData.extractedData}
            extractionStatus={jobData.extractionStatus || null}
          />
          {job.snuggproId && (
            <a
              href={`https://app.snuggpro.com/job/${job.snuggproId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700 transition-colors"
            >
              SnuggPro
            </a>
          )}
          {job.companycamProjectId && (
            <a
              href={`https://app.companycam.com/projects/${job.companycamProjectId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700 transition-colors"
            >
              CompanyCam
            </a>
          )}
        </div>
      </div>

      {/* CRM Panel */}
      <CrmPanel
        jobId={job.id}
        initial={{
          homeowner: job.homeowner,
          stage: job.stage,
          incomeTier: job.incomeTier,
          crewLeadId: job.crewLeadId,
          rebateEstimate: job.rebateEstimate,
          auditDate: job.auditDate,
          inspectionDate: job.inspectionDate,
          rebateTracker: job.rebateTracker,
          costing: job.costing,
        }}
        crewLeads={crewLeads}
      />

      {/* Tabs */}
      <JobDetailClient
        jobId={job.id}
        photos={photos}
        baseline={job.energyBaseline}
        improved={job.energyImproved}
        savingsPercent={job.savingsPercent}
        measures={job.measures}
        hvac={job.hvac}
        attic={job.attic}
        walls={job.walls}
        windows={job.windows}
        checklistData={job.checklistData}
        dhw={job.dhw}
        healthSafety={job.healthSafety}
        rebates={job.rebates}
        stageHistory={job.stageHistory}
        notes={notes}
        currentUserName={user.displayName}
        aiSummary={jobData.aiSummary || null}
        hasSnuggpro={!!job.snuggproId}
        snuggproId={job.snuggproId || undefined}
        extractedData={jobData.extractedData || null}
        extractionStatus={jobData.extractionStatus || null}
      />
    </div>
  );
}
