import { getAdminDb } from "@/src/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";

export function getCompanyRef(companyId: string) {
  return getAdminDb().collection("companies").doc(companyId);
}

export function getJobsRef(companyId: string) {
  return getAdminDb().collection(`companies/${companyId}/jobs`);
}

export function getJobRef(companyId: string, jobId: string) {
  return getAdminDb().doc(`companies/${companyId}/jobs/${jobId}`);
}

export function getPhotosRef(companyId: string, jobId: string) {
  return getAdminDb().collection(`companies/${companyId}/jobs/${jobId}/photos`);
}

export function getNotesRef(companyId: string, jobId: string) {
  return getAdminDb().collection(`companies/${companyId}/jobs/${jobId}/notes`);
}

export function getCrewRef(companyId: string) {
  return getAdminDb().collection(`companies/${companyId}/crew`);
}

export function getCrewMemberRef(companyId: string, crewId: string) {
  return getAdminDb().doc(`companies/${companyId}/crew/${crewId}`);
}

export function getActivityRef(companyId: string) {
  return getAdminDb().collection(`companies/${companyId}/activity`);
}

export function getProcessingLogsRef(companyId: string, jobId: string) {
  return getAdminDb().collection(`companies/${companyId}/jobs/${jobId}/processingLogs`);
}

export function getSyncStateRef(companyId: string, provider: "snuggpro" | "companycam") {
  return getAdminDb().doc(`companies/${companyId}/syncState/${provider}`);
}

export function getUserRef(uid: string) {
  return getAdminDb().collection("users").doc(uid);
}

export function timestampToDate(ts: Timestamp | null | undefined): Date | null {
  if (!ts) return null;
  return ts.toDate();
}

export function dateToTimestamp(date: Date): Timestamp {
  return Timestamp.fromDate(date);
}

export function toFirestoreData<T extends Record<string, unknown>>(data: T): T {
  const result = { ...data };
  for (const key of Object.keys(result)) {
    if (result[key] instanceof Date) {
      (result as Record<string, unknown>)[key] = Timestamp.fromDate(result[key] as Date);
    }
  }
  return result;
}
