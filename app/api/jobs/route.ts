import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/src/lib/auth/session";
import { getJobsRef } from "@/src/lib/firestore/helpers";
import type { Job, JobStage } from "@/src/types";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const stage = searchParams.get("stage") as JobStage | null;
  const search = searchParams.get("search");
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  let query = getJobsRef(user.companyId).orderBy("updatedAt", "desc");

  if (stage) {
    query = query.where("stage", "==", stage);
  }

  const snapshot = await query.get();
  let jobs = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<Job, "id">),
  }));

  // Client-side search filter (Firestore doesn't support substring search)
  if (search) {
    const lower = search.toLowerCase();
    jobs = jobs.filter((job) => {
      const addr = (job.address?.raw || "").toLowerCase();
      const name = (job.homeowner?.name || "").toLowerCase();
      return addr.includes(lower) || name.includes(lower);
    });
  }

  const total = jobs.length;
  jobs = jobs.slice(offset, offset + limit);

  return NextResponse.json({ jobs, total });
}
