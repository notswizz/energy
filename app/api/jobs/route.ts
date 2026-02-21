import { NextResponse, type NextRequest } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { getCurrentUser } from "@/src/lib/auth/session";
import { getJobsRef, getCompanyRef, getActivityRef } from "@/src/lib/firestore/helpers";
import { getAdminDb } from "@/src/lib/firebase/admin";
import { SnuggProClient } from "@/src/lib/api-clients/snuggpro";
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

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { firstName, lastName, email, phone, street, city, state, zip } = body as {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    street: string;
    city: string;
    state: string;
    zip: string;
  };

  if (!firstName || !lastName || !street || !city || !state || !zip) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const raw = `${street}, ${city}, ${state} ${zip}`;
  const now = Timestamp.now();

  // Try to create on SnuggPro
  let snuggproId: string | null = null;
  try {
    const companyDoc = await getCompanyRef(user.companyId).get();
    const companyData = companyDoc.data();
    if (companyData?.snuggproApiKey) {
      const client = new SnuggProClient({
        publicKey: companyData.snuggproApiKey,
        privateKey: companyData.snuggproPrivateKey || "",
        baseUrl: companyData.snuggproBaseUrl,
      });
      const result = await client.createJob({
        firstName,
        lastName,
        address1: street,
        city,
        state,
        zip,
        email: email || undefined,
        homePhone: phone || undefined,
      });
      snuggproId = result.id;
    }
  } catch (err) {
    console.error("Failed to create SnuggPro job:", err);
    // Continue without SnuggPro — job still gets created locally
  }

  const jobData = {
    snuggproId: snuggproId || "",
    companycamProjectId: null,
    address: { raw, normalized: raw, street, city, state, zip },
    homeowner: { name: `${firstName} ${lastName}`, email: email || "", phone: phone || "" },
    stage: "lead" as JobStage,
    crew: [],
    rebateTracker: [],
    costing: null,
    energyBaseline: null,
    energyImproved: null,
    savingsPercent: null,
    measures: [],
    hvac: {},
    attic: {},
    walls: {},
    windows: {},
    rebates: null,
    photoCount: 0,
    stageHistory: [{ stage: "lead", timestamp: now }],
    lastSyncedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await getJobsRef(user.companyId).add(jobData);

  // Log activity
  await getActivityRef(user.companyId).add({
    type: "job_created",
    message: `New job created: ${raw}`,
    jobId: docRef.id,
    jobAddress: raw,
    authorId: user.uid,
    authorName: user.displayName || user.email,
    timestamp: now,
  });

  return NextResponse.json({ id: docRef.id, snuggproId }, { status: 201 });
}
