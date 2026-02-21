import { getCurrentUser } from "@/src/lib/auth/session";
import { getJobRef, getCompanyRef } from "@/src/lib/firestore/helpers";
import { SnuggProClient } from "@/src/lib/api-clients/snuggpro";
import { extractedToSnuggproMapped, aiSummaryToSnuggproMapped } from "@/src/lib/ai/extracted-data-converter";
import type { SnuggProMappedData } from "@/src/lib/ai/snuggpro-mapper";
import type { AiSummary, ExtractedData } from "@/src/types";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const [jobDoc, companyDoc] = await Promise.all([
    getJobRef(user.companyId, id).get(),
    getCompanyRef(user.companyId).get(),
  ]);

  if (!jobDoc.exists) {
    return Response.json({ error: "Job not found" }, { status: 404 });
  }

  const jobData = jobDoc.data()!;
  const companyData = companyDoc.data();
  if (!companyData?.snuggproApiKey) {
    return Response.json({ error: "SnuggPro not configured" }, { status: 400 });
  }

  // Resolve mapped data: snuggproMapped > extractedData > aiSummary
  let mapped: SnuggProMappedData | null = null;

  if (jobData.snuggproMapped && Object.keys(jobData.snuggproMapped).length > 0) {
    mapped = jobData.snuggproMapped as SnuggProMappedData;
  } else if (jobData.extractedData) {
    mapped = extractedToSnuggproMapped(jobData.extractedData as ExtractedData);
  } else if (jobData.aiSummary) {
    mapped = aiSummaryToSnuggproMapped(jobData.aiSummary as AiSummary);
  }

  if (!mapped) {
    return Response.json(
      { error: "No data to push. Upload a PDF or process photos first." },
      { status: 400 }
    );
  }

  const client = new SnuggProClient({
    publicKey: companyData.snuggproApiKey,
    privateKey: companyData.snuggproPrivateKey || "",
    baseUrl: companyData.snuggproBaseUrl,
  });

  // Auto-create SnuggPro job if none linked
  let snuggproId = jobData.snuggproId as string | undefined;
  if (!snuggproId) {
    try {
      const homeowner = jobData.homeowner || {};
      const address = jobData.address || {};
      const nameParts = (homeowner.name || "").split(" ");
      const result = await client.createJob({
        firstName: nameParts[0] || "Unknown",
        lastName: nameParts.slice(1).join(" ") || "Homeowner",
        address1: address.street || address.raw || "",
        city: address.city || "",
        state: address.state || "",
        zip: address.zip || "",
        email: homeowner.email,
        homePhone: homeowner.phone,
      });
      snuggproId = result.id;
      // Save snuggproId back to Firestore
      await getJobRef(user.companyId, id).update({ snuggproId });
    } catch (err) {
      return Response.json(
        { error: `Failed to create SnuggPro job: ${err instanceof Error ? err.message : String(err)}` },
        { status: 500 }
      );
    }
  }

  const pushed: string[] = [];
  const errors: string[] = [];

  // Build push operations from mapped data
  const pushOps: Array<{ name: string; fn: () => Promise<void> }> = [];

  // Basedata (building, foundation, thermostat, appliances, lighting, air leakage, panel, misc)
  if (mapped.basedata && Object.keys(mapped.basedata).length > 0) {
    pushOps.push({
      name: `basedata (${Object.keys(mapped.basedata).length} fields)`,
      fn: () => client.updateBasedata(snuggproId!, mapped!.basedata),
    });
  }

  // HVAC systems
  for (const hvac of mapped.hvacs || []) {
    if (Object.keys(hvac).length === 0) continue;
    const label = (hvac as { manufacturer?: string }).manufacturer || "unit";
    pushOps.push({
      name: `hvac (${label})`,
      fn: () => client.createHvac(snuggproId!, hvac),
    });
  }

  // DHW systems
  for (const dhw of mapped.dhws || []) {
    if (Object.keys(dhw).length === 0) continue;
    pushOps.push({
      name: "dhw",
      fn: () => client.updateDhw(snuggproId!, dhw),
    });
  }

  // Attic sections
  for (const attic of mapped.attics || []) {
    if (Object.keys(attic).length === 0) continue;
    pushOps.push({
      name: "attic",
      fn: () => client.createAttic(snuggproId!, attic),
    });
  }

  // Wall sections
  for (const wall of mapped.walls || []) {
    if (Object.keys(wall).length === 0) continue;
    pushOps.push({
      name: "wall",
      fn: () => client.createWall(snuggproId!, wall),
    });
  }

  // Window configs
  for (const win of mapped.windows || []) {
    if (Object.keys(win).length === 0) continue;
    pushOps.push({
      name: "window",
      fn: () => client.createWindow(snuggproId!, win),
    });
  }

  // Doors
  for (const door of mapped.doors || []) {
    if (Object.keys(door).length === 0) continue;
    const label = (door as { material?: string }).material || "door";
    pushOps.push({
      name: `door (${label})`,
      fn: () => client.createDoor(snuggproId!, door),
    });
  }

  // Health & Safety
  if (mapped.health && Object.keys(mapped.health).length > 0) {
    pushOps.push({
      name: "health & safety",
      fn: () => client.updateHealth(snuggproId!, mapped!.health),
    });
  }

  // Execute all push operations (best-effort)
  for (const op of pushOps) {
    try {
      await op.fn();
      pushed.push(op.name);
    } catch (err) {
      errors.push(`${op.name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Update extraction status
  const allFailed = pushed.length === 0 && errors.length > 0;
  await getJobRef(user.companyId, id).update({
    extractionStatus: allFailed ? "error" : "submitted",
    updatedAt: new Date(),
  });

  return Response.json({ pushed, errors, snuggproId });
}
