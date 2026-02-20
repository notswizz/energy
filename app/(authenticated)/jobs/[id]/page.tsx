import { notFound } from "next/navigation";
import { getCurrentUser } from "@/src/lib/auth/session";
import { getJobRef, getPhotosRef, getNotesRef, getCrewRef } from "@/src/lib/firestore/helpers";
import { StageBadge } from "@/src/components/ui/stage-badge";
import { JobDetailClient } from "@/src/components/jobs/job-detail-client";
import { CrmPanel } from "@/src/components/jobs/crm-panel";
import { serializeNote } from "@/src/lib/firestore/serialize";
import { normalizeStage, type IncomeTier } from "@/src/types";

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

  const job = {
    id: jobDoc.id,
    address: jobData.address || { raw: "Unknown" },
    homeowner: jobData.homeowner || { name: "Unknown" },
    stage: normalizeStage(jobData.stage, { hasAuditDate: !!jobData.auditDate, hasEnergyData: !!jobData.energyBaseline }),
    crew: jobData.crew || [],
    energyBaseline: jobData.energyBaseline || null,
    energyImproved: jobData.energyImproved || null,
    savingsPercent: jobData.savingsPercent || null,
    measures: jobData.measures || [],
    hvac: jobData.hvac || {},
    attic: jobData.attic || {},
    walls: jobData.walls || {},
    windows: jobData.windows || {},
    rebates: jobData.rebates || null,
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
    incomeTier: (jobData.incomeTier || null) as IncomeTier | null,
    rebateEstimate: jobData.rebateEstimate ?? null,
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
          {job.snuggproId && (
            <a
              href={`https://app.snuggpro.com/job/${job.snuggproId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700 transition-colors"
            >
              Open in SnuggPro
            </a>
          )}
          {job.companycamProjectId && (
            <a
              href={`https://app.companycam.com/projects/${job.companycamProjectId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700 transition-colors"
            >
              Open in CompanyCam
            </a>
          )}
          <button
            disabled
            className="px-3 py-1.5 text-sm bg-gray-100 rounded-md text-gray-400 cursor-not-allowed"
            title="Coming soon"
          >
            Submit to Neighborly
          </button>
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
        rebates={job.rebates}
        stageHistory={job.stageHistory}
        notes={notes}
        currentUserName={user.displayName}
      />
    </div>
  );
}
