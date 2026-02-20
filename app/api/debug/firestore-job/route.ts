import { NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/auth/session";
import { getJobsRef } from "@/src/lib/firestore/helpers";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const snapshot = await getJobsRef(user.companyId).limit(1).get();
  if (snapshot.empty) {
    return NextResponse.json({ error: "No jobs found" }, { status: 404 });
  }

  const doc = snapshot.docs[0];
  return NextResponse.json({
    id: doc.id,
    data: doc.data(),
  });
}
