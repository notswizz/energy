import { getCurrentUser } from "@/src/lib/auth/session";
import { getJobRef } from "@/src/lib/firestore/helpers";
import { parseChecklistPdf } from "@/src/lib/parsers/checklist-pdf";
import { mapToSnuggPro } from "@/src/lib/ai/snuggpro-mapper";
import { snuggproMappedToExtracted, mergeExtractedData } from "@/src/lib/ai/extracted-data-converter";
import { pinDataToJob } from "@/src/lib/ai/address-matcher";
import type { FieldConfidence, FieldSource, ExtractedData } from "@/src/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: jobId } = await params;
  const jobRef = getJobRef(user.companyId, jobId);
  const jobDoc = await jobRef.get();
  if (!jobDoc.exists) {
    return Response.json({ error: "Job not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const pdfFile = formData.get("pdf") as File | null;
  const pdfType = (formData.get("pdfType") as string) || "checklist";

  if (!pdfFile) {
    return Response.json({ error: "No PDF file" }, { status: 400 });
  }

  try {
    const pdfBuffer = Buffer.from(await pdfFile.arrayBuffer());
    const { checklist, photoCount, sectionsFound } = await parseChecklistPdf(pdfBuffer);

    // Map text-parsed data to SnuggPro format (no AI — empty aiResults)
    const snuggproMapped = mapToSnuggPro(checklist.sections, []);

    // Build confidence map — all text-parsed fields get "high"
    const confidenceMap: Record<string, FieldConfidence> = {};
    const sourceMap: Record<string, FieldSource> = {};

    const textFields = [
      "yearBuilt", "conditionedArea", "avgWallHeight", "floorsAboveGrade",
      "numOccupants", "numBedrooms", "frontOrientation", "typeOfHome",
      "foundationBasementPct", "foundationCrawlPct", "foundationSlabPct",
      "foundationAboveGradeHeight", "basementWallInsulation", "basementHeating", "basementCooling",
      "rangeFuelType", "ovenFuelType", "dryerFuelType", "washerType",
      "dishwasherInstalled", "refrigeratorAge",
      "blowerDoorCfm50", "blowerDoorTestPerformed",
      "panelOpenSpots", "panelMaxAmps",
      "pctCflsOrLeds", "totalLightBulbs",
      "hasPv", "hasPool", "hasHotTub", "hasEv",
      "concernsSummary",
    ];
    for (const key of textFields) {
      confidenceMap[key] = "high";
      sourceMap[key] = "text_parse";
    }

    // Convert to ExtractedData
    const extractedResult = snuggproMappedToExtracted(snuggproMapped, confidenceMap, sourceMap);

    // If this is a 2nd PDF, merge with existing data
    const jobData = jobDoc.data()!;
    let finalExtracted: ExtractedData = extractedResult;
    if (pdfType === "inspection" && jobData.extractedData) {
      finalExtracted = mergeExtractedData(jobData.extractedData as ExtractedData, extractedResult);
    }

    // Save to Firestore
    await pinDataToJob(user.companyId, jobId, {
      snuggproMapped: snuggproMapped as unknown as Record<string, unknown>,
      extractedData: finalExtracted as unknown as Record<string, unknown>,
      checklistParsed: { savedAt: new Date().toISOString() },
    });

    await jobRef.update({
      extractionStatus: "extracted",
      [`${pdfType}PdfUrl`]: pdfFile.name,
      updatedAt: new Date(),
    });

    // Count how many fields the text parser filled
    const filledFields = Object.entries(snuggproMapped.basedata).length;
    const hvacCount = snuggproMapped.hvacs.length;
    const dhwCount = snuggproMapped.dhws.length;

    return Response.json({
      success: true,
      checklist: {
        projectName: checklist.projectName,
        address: checklist.address,
        sectionsFound,
        photoCount,
      },
      stats: {
        filledFields,
        hvacSystems: hvacCount,
        dhwSystems: dhwCount,
        atticSections: snuggproMapped.attics.length,
        wallSections: snuggproMapped.walls.length,
        windowConfigs: snuggproMapped.windows.length,
        doors: snuggproMapped.doors.length,
        healthFields: Object.keys(snuggproMapped.health).length,
      },
    });
  } catch (err) {
    return Response.json(
      { error: `Processing failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }
}
