import { NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/auth/session";
import { getCompanyRef } from "@/src/lib/firestore/helpers";
import { SnuggProClient } from "@/src/lib/api-clients/snuggpro";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyDoc = await getCompanyRef(user.companyId).get();
  const companyData = companyDoc.data()!;

  if (!companyData.snuggproPublicKey || !companyData.snuggproPrivateKey) {
    return NextResponse.json({ error: "SnuggPro not configured" }, { status: 400 });
  }

  const client = new SnuggProClient({
    publicKey: companyData.snuggproPublicKey,
    privateKey: companyData.snuggproPrivateKey,
    baseUrl: companyData.snuggproBaseUrl,
  });

  const rawResponse = await client.getJobs();
  const isArray = Array.isArray(rawResponse);

  let firstJob = null;
  let firstJobDetail = null;
  let jobCount = 0;

  if (isArray && rawResponse.length > 0) {
    jobCount = rawResponse.length;
    firstJob = rawResponse[0];
    // Fetch detail for first job
    try {
      firstJobDetail = await client.getJob(String(firstJob.id));
    } catch (e) {
      firstJobDetail = { error: String(e) };
    }
  } else if (!isArray && rawResponse && typeof rawResponse === "object") {
    const obj = rawResponse as Record<string, unknown>;
    const arrayField = Object.entries(obj).find(([, v]) => Array.isArray(v));
    if (arrayField) {
      const arr = arrayField[1] as unknown[];
      jobCount = arr.length;
      firstJob = arr[0];
    }
  }

  return NextResponse.json({
    rawResponseIsArray: isArray,
    topLevelKeys: !isArray ? Object.keys(rawResponse as Record<string, unknown>) : undefined,
    jobCount,
    firstJob,
    firstJobDetail,
  }, { status: 200 });
}
