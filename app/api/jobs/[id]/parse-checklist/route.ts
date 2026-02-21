import { getCurrentUser } from "@/src/lib/auth/session";
import { getJobRef } from "@/src/lib/firestore/helpers";
import { parseChecklistPdf } from "@/src/lib/parsers/checklist-pdf";

export async function POST(
  request: Request,
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

  const formData = await request.formData();
  const file = formData.get("pdf") as File | null;

  if (!file) {
    return Response.json({ error: "No PDF file uploaded" }, { status: 400 });
  }

  if (!file.type.includes("pdf") && !file.name.endsWith(".pdf")) {
    return Response.json({ error: "File must be a PDF" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await parseChecklistPdf(buffer);

    // Mark job as uploaded
    await getJobRef(user.companyId, id).update({
      extractionStatus: "uploaded",
      updatedAt: new Date(),
    });

    return Response.json(result);
  } catch (err) {
    return Response.json(
      { error: `PDF parsing failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }
}
