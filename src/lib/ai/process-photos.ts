import { getPhotosRef, getJobRef, getProcessingLogsRef } from "@/src/lib/firestore/helpers";
import { classifyPhoto, extractData } from "./replicate-client";
import { aggregateAiSummary } from "./aggregate-summary";

type SendFn = (data: Record<string, unknown>) => void;

// Simple semaphore to cap concurrent Replicate calls
class Semaphore {
  private queue: Array<() => void> = [];
  private running = 0;

  constructor(private max: number) {}

  async acquire(): Promise<void> {
    if (this.running < this.max) {
      this.running++;
      return;
    }
    return new Promise<void>((resolve) => {
      this.queue.push(() => {
        this.running++;
        resolve();
      });
    });
  }

  release(): void {
    this.running--;
    const next = this.queue.shift();
    if (next) next();
  }
}

const semaphore = new Semaphore(10);

async function withSemaphore<T>(fn: () => Promise<T>): Promise<T> {
  await semaphore.acquire();
  try {
    return await fn();
  } finally {
    semaphore.release();
  }
}

export async function processJobPhotos(
  jobId: string,
  companyId: string,
  send: SendFn
) {
  const photosRef = getPhotosRef(companyId, jobId);
  const logsRef = getProcessingLogsRef(companyId, jobId);
  const snapshot = await photosRef.get();

  const allPhotos = snapshot.docs.map((doc) => ({
    id: doc.id,
    ref: doc.ref,
    data: doc.data(),
  }));

  // Filter to unprocessed photos
  const unprocessed = allPhotos.filter(
    (p) => p.data.processingStatus !== "extracted"
  );

  const total = unprocessed.length;
  if (total === 0) {
    send({ type: "info", message: "All photos already processed" });

    // Still regenerate summary from all photos
    const allPhotoData = allPhotos.map((p) => ({
      classification: p.data.classification as string | undefined,
      extractedData: p.data.extractedData as Record<string, unknown> | undefined,
      processedAt: p.data.processedAt?.toDate?.()?.toISOString() || undefined,
    }));
    const summary = aggregateAiSummary(allPhotoData);
    await getJobRef(companyId, jobId).update({ aiSummary: summary });
    send({ type: "done", summary });
    return;
  }

  send({ type: "start", total, message: `Processing ${total} photos` });

  // Stage 1: Classify in batches of 5
  let classifiedCount = 0;
  for (let i = 0; i < unprocessed.length; i += 5) {
    const batch = unprocessed.slice(i, i + 5);
    const results = await Promise.allSettled(
      batch.map((photo) =>
        withSemaphore(async () => {
          const imageUrl = photo.data.url as string;
          const startTime = Date.now();
          const classification = await classifyPhoto(imageUrl);
          const duration = Date.now() - startTime;

          await photo.ref.update({
            classification,
            processingStatus: "classified",
          });

          await logsRef.add({
            photoId: photo.id,
            stage: "classify",
            model: "moondream2",
            result: classification,
            durationMs: duration,
            createdAt: new Date(),
          });

          return { photoId: photo.id, classification };
        })
      )
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        classifiedCount++;
        send({
          type: "classified",
          photoId: result.value.photoId,
          classification: result.value.classification,
          progress: classifiedCount,
          total,
        });
      } else {
        classifiedCount++;
        const failedPhoto = batch[results.indexOf(result)];
        send({
          type: "error",
          photoId: failedPhoto?.id,
          stage: "classify",
          message: result.reason?.message || "Classification failed",
        });
        if (failedPhoto) {
          await failedPhoto.ref.update({ processingStatus: "error" });
        }
      }
    }
  }

  // Refresh photo data after classification
  const classifiedSnapshot = await photosRef.get();
  const classifiedPhotos = classifiedSnapshot.docs
    .map((doc) => ({
      id: doc.id,
      ref: doc.ref,
      data: doc.data(),
    }))
    .filter(
      (p) =>
        p.data.processingStatus === "classified" && p.data.classification !== "other"
    );

  // Stage 2: Extract in batches of 3
  let extractedCount = 0;
  const extractTotal = classifiedPhotos.length;
  send({ type: "extraction_start", total: extractTotal });

  for (let i = 0; i < classifiedPhotos.length; i += 3) {
    const batch = classifiedPhotos.slice(i, i + 3);
    const results = await Promise.allSettled(
      batch.map((photo) =>
        withSemaphore(async () => {
          const imageUrl = photo.data.url as string;
          const category = photo.data.classification as string;
          const startTime = Date.now();
          const data = await extractData(imageUrl, category);
          const duration = Date.now() - startTime;

          const processedAt = new Date();
          await photo.ref.update({
            extractedData: data,
            processingStatus: "extracted",
            processedAt,
          });

          await logsRef.add({
            photoId: photo.id,
            stage: "extract",
            model: "llava-v1.6-mistral-7b",
            category,
            result: data,
            durationMs: duration,
            createdAt: processedAt,
          });

          return { photoId: photo.id, data };
        })
      )
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        extractedCount++;
        send({
          type: "extracted",
          photoId: result.value.photoId,
          data: result.value.data,
          progress: extractedCount,
          total: extractTotal,
        });
      } else {
        extractedCount++;
        const failedPhoto = batch[results.indexOf(result)];
        send({
          type: "error",
          photoId: failedPhoto?.id,
          stage: "extract",
          message: result.reason?.message || "Extraction failed",
        });
        if (failedPhoto) {
          await failedPhoto.ref.update({ processingStatus: "error" });
        }
      }
    }
  }

  // Aggregate all photo data into summary
  const finalSnapshot = await photosRef.get();
  const allPhotoData = finalSnapshot.docs.map((doc) => {
    const d = doc.data();
    return {
      classification: d.classification as string | undefined,
      extractedData: d.extractedData as Record<string, unknown> | undefined,
      processedAt: d.processedAt?.toDate?.()?.toISOString() || undefined,
    };
  });

  const summary = aggregateAiSummary(allPhotoData);
  await getJobRef(companyId, jobId).update({ aiSummary: summary });

  send({ type: "done", summary });
}
