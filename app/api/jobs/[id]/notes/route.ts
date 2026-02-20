import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { getCurrentUser } from "@/src/lib/auth/session";
import { getJobRef, getNotesRef, getActivityRef } from "@/src/lib/firestore/helpers";
import { getAdminDb } from "@/src/lib/firebase/admin";
import { serializeNote } from "@/src/lib/firestore/serialize";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const notesRef = getNotesRef(user.companyId, id);
  const snapshot = await notesRef.orderBy("createdAt", "desc").get();
  const notes = snapshot.docs.map(serializeNote);

  return NextResponse.json({ notes });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  if (!body.text || typeof body.text !== "string" || body.text.trim().length === 0) {
    return NextResponse.json({ error: "Note text is required" }, { status: 400 });
  }

  // Verify job exists
  const jobDoc = await getJobRef(user.companyId, id).get();
  if (!jobDoc.exists) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const now = Timestamp.now();
  const jobData = jobDoc.data()!;
  const db = getAdminDb();
  const batch = db.batch();

  // Create note
  const noteRef = getNotesRef(user.companyId, id).doc();
  const noteData = {
    text: body.text.trim(),
    authorId: user.uid,
    authorName: user.displayName,
    createdAt: now,
    type: "note" as const,
  };
  batch.set(noteRef, noteData);

  // Write activity entry
  const activityRef = getActivityRef(user.companyId).doc();
  batch.set(activityRef, {
    type: "note_added",
    message: `Note added on ${jobData.address?.raw || "job"}`,
    jobId: id,
    jobAddress: jobData.address?.raw || "",
    authorId: user.uid,
    authorName: user.displayName,
    timestamp: now,
  });

  await batch.commit();

  return NextResponse.json({
    id: noteRef.id,
    ...noteData,
    createdAt: now.toDate().toISOString(),
  });
}
