import { NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/auth/session";
import { getCompanyRef, getJobsRef, getPhotosRef, dateToTimestamp } from "@/src/lib/firestore/helpers";
import { CompanyCamClient } from "@/src/lib/api-clients/companycam";
import { mapCompanyCamPhoto } from "@/src/lib/sync/mappers";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { jobId, companycamProjectId } = await request.json();
  if (!jobId || !companycamProjectId) {
    return NextResponse.json({ error: "jobId and companycamProjectId are required" }, { status: 400 });
  }

  // Verify job exists
  const jobRef = getJobsRef(user.companyId).doc(jobId);
  const jobDoc = await jobRef.get();
  if (!jobDoc.exists) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  // Link the project
  await jobRef.update({
    companycamProjectId,
    updatedAt: dateToTimestamp(new Date()),
  });

  // Fetch and import photos
  const companyDoc = await getCompanyRef(user.companyId).get();
  const companycamToken = companyDoc.data()?.companycamToken;

  if (companycamToken) {
    const client = new CompanyCamClient({ token: companycamToken });
    const photos = await client.getAllProjectPhotos(companycamProjectId);
    const photosRef = getPhotosRef(user.companyId, jobId);

    for (const photo of photos) {
      const mapped = mapCompanyCamPhoto(photo);
      await photosRef.doc(photo.id).set({
        ...mapped,
        takenAt: dateToTimestamp(mapped.takenAt),
      });
    }

    await jobRef.update({
      photoCount: photos.length,
      updatedAt: dateToTimestamp(new Date()),
    });
  }

  return NextResponse.json({ success: true });
}
