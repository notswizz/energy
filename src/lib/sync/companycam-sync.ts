import { CompanyCamClient } from "@/src/lib/api-clients/companycam";
import { getCompanyRef, getJobsRef, getPhotosRef, getSyncStateRef, dateToTimestamp } from "@/src/lib/firestore/helpers";
import { normalizeAddress, matchAddresses } from "@/src/lib/utils/address";
import { mapCompanyCamPhoto } from "./mappers";
import type { CompanyCamProject } from "@/src/types/companycam";

export interface CompanyCamSyncResult {
  projectsMatched: number;
  photosImported: number;
  unmatched: string[];
  errors: string[];
}

function getProjectAddress(project: CompanyCamProject): string {
  const addr = project.address;
  if (!addr) return project.name;
  return [addr.street_address_1, addr.city, addr.state, addr.postal_code]
    .filter(Boolean)
    .join(", ");
}

export async function syncCompanyCam(companyId: string): Promise<CompanyCamSyncResult> {
  const syncRef = getSyncStateRef(companyId, "companycam");

  await syncRef.set(
    { status: "syncing", lastError: null },
    { merge: true }
  );

  try {
    const companyDoc = await getCompanyRef(companyId).get();
    if (!companyDoc.exists) throw new Error("Company not found");

    const companyData = companyDoc.data()!;
    if (!companyData.companycamToken) throw new Error("CompanyCam token not configured");

    const client = new CompanyCamClient({ token: companyData.companycamToken });

    // Fetch all projects
    const projects = await client.getAllProjects();

    // Build address lookup from existing jobs
    const jobsSnapshot = await getJobsRef(companyId).get();
    const jobsByAddress = new Map<string, { id: string; normalized: string }>();
    const jobsById = new Map<string, string>(); // companycamProjectId -> jobId

    for (const doc of jobsSnapshot.docs) {
      const data = doc.data();
      const normalized = data.address?.normalized || "";
      if (normalized) {
        jobsByAddress.set(normalized, { id: doc.id, normalized });
      }
      if (data.companycamProjectId) {
        jobsById.set(data.companycamProjectId, doc.id);
      }
    }

    let projectsMatched = 0;
    let photosImported = 0;
    const unmatched: string[] = [];
    const errors: string[] = [];

    for (const project of projects) {
      try {
        // Check if already linked
        let jobId = jobsById.get(project.id);

        if (!jobId) {
          // Try to match by address
          const projectAddr = getProjectAddress(project);
          const normalizedProjectAddr = normalizeAddress(projectAddr);

          // Exact match first
          const exactMatch = jobsByAddress.get(normalizedProjectAddr);
          if (exactMatch) {
            jobId = exactMatch.id;
          } else {
            // Fuzzy match
            let bestScore = 0;
            let bestJobId: string | null = null;

            for (const [, job] of jobsByAddress) {
              const result = matchAddresses(projectAddr, job.normalized);
              if (result.isMatch && result.score > bestScore) {
                bestScore = result.score;
                bestJobId = job.id;
              }
            }

            if (bestJobId) {
              jobId = bestJobId;
            }
          }
        }

        if (!jobId) {
          unmatched.push(getProjectAddress(project));
          continue;
        }

        // Link the project to the job
        const jobRef = getJobsRef(companyId).doc(jobId);
        await jobRef.update({
          companycamProjectId: project.id,
          updatedAt: dateToTimestamp(new Date()),
        });

        // Fetch and store photos
        const photos = await client.getAllProjectPhotos(project.id);
        const photosRef = getPhotosRef(companyId, jobId);

        for (const photo of photos) {
          const mapped = mapCompanyCamPhoto(photo);
          await photosRef.doc(photo.id).set({
            ...mapped,
            takenAt: dateToTimestamp(mapped.takenAt),
          });
        }

        // Update photo count
        await jobRef.update({
          photoCount: photos.length,
          updatedAt: dateToTimestamp(new Date()),
        });

        projectsMatched++;
        photosImported += photos.length;
      } catch (error) {
        errors.push(
          `Project ${project.id}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    await syncRef.set({
      provider: "companycam",
      lastSyncAt: dateToTimestamp(new Date()),
      status: "idle",
      lastError: null,
      itemsSynced: projectsMatched,
    });

    return { projectsMatched, photosImported, unmatched, errors };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await syncRef.set(
      { status: "error", lastError: message },
      { merge: true }
    );
    return { projectsMatched: 0, photosImported: 0, unmatched: [], errors: [message] };
  }
}
