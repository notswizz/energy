import { Timestamp } from "firebase-admin/firestore";
import { SnuggProClient } from "@/src/lib/api-clients/snuggpro";
import { getCompanyRef, getJobsRef, getSyncStateRef, dateToTimestamp } from "@/src/lib/firestore/helpers";
import { mapSnuggProJob } from "./mappers";

// Recursively convert Date objects to Firestore Timestamps, drop invalid dates
function sanitizeForFirestore(obj: unknown): unknown {
  if (obj === null || obj === undefined) return null;
  if (obj instanceof Date) {
    return isNaN(obj.getTime()) ? null : Timestamp.fromDate(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForFirestore);
  }
  if (typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[key] = sanitizeForFirestore(value);
    }
    return result;
  }
  return obj;
}

export interface SyncResult {
  jobsSynced: number;
  errors: string[];
  debug?: unknown;
}

type ProgressCallback = (data: Record<string, unknown>) => void;

function createClient(companyData: Record<string, unknown>) {
  return new SnuggProClient({
    publicKey: companyData.snuggproPublicKey as string,
    privateKey: companyData.snuggproPrivateKey as string,
    baseUrl: companyData.snuggproBaseUrl as string,
  });
}

interface ProcessResult {
  address: string;
  detailErrors: string[];
}

async function processJob(
  client: SnuggProClient,
  jobId: string,
  jobsRef: FirebaseFirestore.CollectionReference
): Promise<ProcessResult> {
  // /jobs only returns {id, altId}, so fetch full detail
  const fullJob = await client.getJob(jobId);

  const endpointNames = ["metrics", "recommendations", "hvacs", "attics", "walls", "windows", "hesScore", "rebates", "stageHistory"];
  const results = await Promise.allSettled([
    client.getMetricsSummary(jobId),
    client.getRecommendations(jobId),
    client.getHvacs(jobId),
    client.getAttics(jobId),
    client.getWalls(jobId),
    client.getWindows(jobId),
    client.getHesScore(jobId),
    client.getRebatesIncentives(jobId),
    client.getJobStageHistory(jobId),
  ]);

  const [metrics, recommendations, hvacs, attics, walls, windows, hesScore, rebates, stageHistory] = results;

  // Track which detail endpoints failed
  const detailErrors: string[] = [];
  for (let i = 0; i < results.length; i++) {
    if (results[i].status === "rejected") {
      const reason = (results[i] as PromiseRejectedResult).reason;
      detailErrors.push(`${endpointNames[i]}: ${reason?.message || String(reason)}`);
    }
  }

  const details = {
    metrics: metrics.status === "fulfilled" ? metrics.value : null,
    recommendations: recommendations.status === "fulfilled" ? recommendations.value : [],
    hvacs: hvacs.status === "fulfilled" ? hvacs.value : [],
    attics: attics.status === "fulfilled" ? attics.value : [],
    walls: walls.status === "fulfilled" ? walls.value : [],
    windows: windows.status === "fulfilled" ? windows.value : [],
    hesScore: hesScore.status === "fulfilled" ? hesScore.value : null,
    rebates: rebates.status === "fulfilled" ? rebates.value : [],
    stageHistory: stageHistory.status === "fulfilled" ? stageHistory.value : [],
  };

  const mappedJob = mapSnuggProJob(fullJob as never, details);
  const sanitized = sanitizeForFirestore(mappedJob) as Record<string, unknown>;
  const now = dateToTimestamp(new Date());

  const docRef = jobsRef.doc(jobId);
  const existing = await docRef.get();

  if (existing.exists) {
    // Protect CRM-owned fields: stage, homeowner, stageHistory are only set on creation
    const { stage, homeowner, stageHistory, ...syncFields } = sanitized;
    await docRef.update({ ...syncFields, lastSyncedAt: now, updatedAt: now });
  } else {
    await docRef.set({
      ...sanitized,
      companycamProjectId: null,
      photoCount: 0,
      createdAt: now,
      updatedAt: now,
      lastSyncedAt: now,
    });
  }

  const addr = (fullJob as Record<string, unknown>).address1 || (fullJob as Record<string, unknown>).firstName || jobId;
  return { address: String(addr), detailErrors };
}

export async function syncSnuggProStreamed(companyId: string, send: ProgressCallback) {
  const syncRef = getSyncStateRef(companyId, "snuggpro");
  await syncRef.set({ status: "syncing", lastError: null }, { merge: true });

  try {
    const companyDoc = await getCompanyRef(companyId).get();
    if (!companyDoc.exists) throw new Error("Company not found");

    const companyData = companyDoc.data()!;
    if (!companyData.snuggproPublicKey || !companyData.snuggproPrivateKey) {
      throw new Error("SnuggPro API keys not configured");
    }

    const client = createClient(companyData);

    send({ type: "status", message: "Fetching job list from SnuggPro..." });

    const rawResponse = await client.getJobs();
    const jobs: Record<string, unknown>[] = Array.isArray(rawResponse)
      ? rawResponse
      : [];

    const total = jobs.length;
    send({ type: "status", message: `Found ${total} jobs. Starting sync...` });

    const jobsRef = getJobsRef(companyId);
    const concurrency = 5;
    let synced = 0;
    let errCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < jobs.length; i += concurrency) {
      const batch = jobs.slice(i, i + concurrency);
      const settled = await Promise.allSettled(
        batch.map((job) => processJob(client, String(job.id), jobsRef))
      );

      const batchAddresses: string[] = [];
      const batchDetailWarnings: string[] = [];

      for (const result of settled) {
        if (result.status === "fulfilled") {
          synced++;
          batchAddresses.push(result.value.address);
          // Report detail endpoint failures as warnings
          for (const de of result.value.detailErrors) {
            batchDetailWarnings.push(`${result.value.address}: ${de}`);
          }
        } else {
          errCount++;
          errors.push(result.reason?.message || String(result.reason));
        }
      }

      // Send detail warnings so they show in the terminal
      if (batchDetailWarnings.length > 0) {
        send({ type: "detail_warnings", warnings: batchDetailWarnings });
      }

      send({
        type: "progress",
        synced,
        errCount,
        total,
        percent: Math.round((synced + errCount) / total * 100),
        batch: batchAddresses,
      });
    }

    await syncRef.set({
      provider: "snuggpro",
      lastSyncAt: dateToTimestamp(new Date()),
      status: "idle",
      lastError: null,
      itemsSynced: synced,
    });

    send({
      type: "done",
      jobsSynced: synced,
      errors: errors.slice(0, 20),
      errorCount: errCount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await syncRef.set({ status: "error", lastError: message }, { merge: true });
    send({ type: "error", message });
  }
}

// Keep non-streamed version for backwards compat
export async function syncSnuggPro(companyId: string): Promise<SyncResult> {
  let result: SyncResult = { jobsSynced: 0, errors: [] };
  await syncSnuggProStreamed(companyId, (data) => {
    if (data.type === "done") {
      result = {
        jobsSynced: data.jobsSynced as number,
        errors: data.errors as string[],
      };
    } else if (data.type === "error") {
      result = { jobsSynced: 0, errors: [data.message as string] };
    }
  });
  return result;
}
