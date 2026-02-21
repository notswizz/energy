import { getCurrentUser } from "@/src/lib/auth/session";
import { getJobRef } from "@/src/lib/firestore/helpers";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const { id } = await params;
  const jobDoc = await getJobRef(user.companyId, id).get();

  if (!jobDoc.exists) {
    return new Response(JSON.stringify({ error: "Job not found" }), { status: 404 });
  }

  const aiSummary = jobDoc.data()?.aiSummary || null;

  return new Response(JSON.stringify({ aiSummary }), {
    headers: { "Content-Type": "application/json" },
  });
}
