import { NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/auth/session";
import { getCompanyRef } from "@/src/lib/firestore/helpers";
import { SnuggProClient } from "@/src/lib/api-clients/snuggpro";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyDoc = await getCompanyRef(user.companyId).get();
  const data = companyDoc.data()!;

  if (!data.snuggproPublicKey || !data.snuggproPrivateKey) {
    return NextResponse.json({ error: "Not configured" }, { status: 400 });
  }

  const client = new SnuggProClient({
    publicKey: data.snuggproPublicKey as string,
    privateKey: data.snuggproPrivateKey as string,
    baseUrl: data.snuggproBaseUrl as string,
  });

  // Allow specifying a job ID via ?jobId=xxx
  const url = new URL(request.url);
  const jobIdParam = url.searchParams.get("jobId");

  // Get job list
  const jobs = await client.getJobs();
  const jobId = jobIdParam || String((jobs as Record<string, unknown>[])[0]?.id);

  if (!jobId) {
    return NextResponse.json({ error: "No jobs found" }, { status: 404 });
  }

  // Fetch the job detail
  const jobDetail = await client.getJob(jobId);

  // Try all detail endpoints and capture what succeeds/fails
  const endpoints = [
    { name: "recommendations", fn: () => client.getRecommendations(jobId) },
    { name: "hvacs", fn: () => client.getHvacs(jobId) },
    { name: "attics", fn: () => client.getAttics(jobId) },
    { name: "walls", fn: () => client.getWalls(jobId) },
    { name: "windows", fn: () => client.getWindows(jobId) },
    { name: "hesScore", fn: () => client.getHesScore(jobId) },
    { name: "rebates", fn: () => client.getRebatesIncentives(jobId) },
    { name: "stageHistory", fn: () => client.getJobStageHistory(jobId) },
    { name: "utilities", fn: () => client.getUtilities(jobId) },
    { name: "metrics", fn: () => client.getMetricsSummary(jobId) },
  ];

  const results: Record<string, unknown> = {};
  for (const ep of endpoints) {
    try {
      const data = await ep.fn();
      results[ep.name] = { ok: true, data };
    } catch (err) {
      results[ep.name] = { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  return NextResponse.json({
    jobId,
    jobDetail,
    endpoints: results,
  });
}
