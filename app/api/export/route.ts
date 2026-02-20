import { getCurrentUser } from "@/src/lib/auth/session";
import { getJobsRef, getPhotosRef } from "@/src/lib/firestore/helpers";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Schema line
      controller.enqueue(
        encoder.encode(
          JSON.stringify({
            _schema: "energy-export-v1",
            exportedAt: new Date().toISOString(),
            companyId: user.companyId,
          }) + "\n"
        )
      );

      const jobsSnapshot = await getJobsRef(user.companyId).get();

      for (const jobDoc of jobsSnapshot.docs) {
        const jobData = jobDoc.data();

        // Fetch photos for this job
        const photosSnapshot = await getPhotosRef(user.companyId, jobDoc.id).get();
        const photos = photosSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const record = {
          _type: "job",
          id: jobDoc.id,
          ...jobData,
          photos,
        };

        controller.enqueue(encoder.encode(JSON.stringify(record) + "\n"));
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Content-Disposition": `attachment; filename="energy-export-${Date.now()}.jsonl"`,
    },
  });
}
