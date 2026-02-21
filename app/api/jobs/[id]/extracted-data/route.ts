import { getCurrentUser } from "@/src/lib/auth/session";
import { getJobRef } from "@/src/lib/firestore/helpers";
import { extractedToSnuggproMapped } from "@/src/lib/ai/extracted-data-converter";
import type { ExtractedData } from "@/src/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const jobRef = getJobRef(user.companyId, id);
  const jobDoc = await jobRef.get();

  if (!jobDoc.exists) {
    return Response.json({ error: "Job not found" }, { status: 404 });
  }

  const { extractedData } = (await request.json()) as { extractedData: ExtractedData };

  if (!extractedData) {
    return Response.json({ error: "extractedData required" }, { status: 400 });
  }

  // Regenerate snuggproMapped from the (possibly edited) extractedData
  const snuggproMapped = extractedToSnuggproMapped(extractedData);

  await jobRef.update({
    extractedData,
    snuggproMapped,
    extractionStatus: "reviewed",
    updatedAt: new Date(),
  });

  return Response.json({ success: true, snuggproMapped });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const jobDoc = await getJobRef(user.companyId, id).get();

  if (!jobDoc.exists) {
    return Response.json({ error: "Job not found" }, { status: 404 });
  }

  const data = jobDoc.data()!;
  return Response.json({
    extractedData: data.extractedData || null,
    snuggproMapped: data.snuggproMapped || null,
    extractionStatus: data.extractionStatus || null,
  });
}
