import { NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getCurrentUser } from "@/src/lib/auth/session";
import { getJobRef, getPhotosRef, getActivityRef } from "@/src/lib/firestore/helpers";
import { getAdminDb } from "@/src/lib/firebase/admin";
import type { JobStage, IncomeTier } from "@/src/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const jobDoc = await getJobRef(user.companyId, id).get();

  if (!jobDoc.exists) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  // Fetch photos
  const photosSnapshot = await getPhotosRef(user.companyId, id)
    .orderBy("takenAt", "desc")
    .get();

  const photos = photosSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  return NextResponse.json({
    id: jobDoc.id,
    ...jobDoc.data(),
    photos,
  });
}

const ALLOWED_FIELDS = new Set(["stage", "homeowner", "incomeTier", "crewLeadId", "rebateEstimate", "auditDate", "inspectionDate", "rebateTracker", "costing"]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  // Filter to allowed fields only
  const updates: Record<string, unknown> = {};
  for (const key of Object.keys(body)) {
    if (ALLOWED_FIELDS.has(key)) {
      updates[key] = body[key];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const jobRef = getJobRef(user.companyId, id);
  const jobDoc = await jobRef.get();
  if (!jobDoc.exists) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const now = Timestamp.now();
  const jobData = jobDoc.data()!;
  const db = getAdminDb();
  const batch = db.batch();

  // Auto-advance: setting an audit date on a lead moves it to audit_scheduled
  if (updates.auditDate && !updates.stage && (jobData.stage === "lead" || jobData.stage === "audit")) {
    updates.stage = "audit_scheduled";
  }

  // On stage change: append to stageHistory + write activity
  if (updates.stage && updates.stage !== jobData.stage) {
    const historyEntry = {
      stage: updates.stage as JobStage,
      timestamp: now,
      user: user.displayName,
    };
    batch.update(jobRef, {
      ...updates,
      stageHistory: FieldValue.arrayUnion(historyEntry),
      updatedAt: now,
    });

    // Write activity entry
    const activityRef = getActivityRef(user.companyId).doc();
    batch.set(activityRef, {
      type: "stage_changed",
      message: `${jobData.address?.raw || "Job"} moved to ${updates.stage}`,
      jobId: id,
      jobAddress: jobData.address?.raw || "",
      authorId: user.uid,
      authorName: user.displayName,
      timestamp: now,
    });
  } else {
    batch.update(jobRef, { ...updates, updatedAt: now });
  }

  await batch.commit();

  const updated = await jobRef.get();
  return NextResponse.json({ id: updated.id, ...updated.data() });
}
