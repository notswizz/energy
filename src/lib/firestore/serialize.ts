import { normalizeStage } from "@/src/types";

function toISO(val: unknown): string {
  if (!val) return new Date().toISOString();
  if (typeof val === "string") return val;
  if (val instanceof Date) return val.toISOString();
  if (typeof val === "object" && val !== null && "toDate" in val) {
    return (val as { toDate: () => Date }).toDate().toISOString();
  }
  return new Date().toISOString();
}

export function serializeJob(doc: FirebaseFirestore.DocumentSnapshot): Record<string, unknown> {
  const data = doc.data()!;
  return {
    id: doc.id,
    snuggproId: data.snuggproId || "",
    companycamProjectId: data.companycamProjectId || null,
    address: data.address || { raw: "Unknown" },
    homeowner: data.homeowner || { name: "Unknown" },
    stage: normalizeStage(data.stage, { hasAuditDate: !!data.auditDate, hasEnergyData: !!data.energyBaseline }),
    crew: data.crew || [],
    crewLeadId: data.crewLeadId || null,
    incomeTier: data.incomeTier || null,
    rebateEstimate: data.rebateEstimate ?? null,
    auditDate: data.auditDate || null,
    inspectionDate: data.inspectionDate || null,
    energyBaseline: data.energyBaseline || null,
    energyImproved: data.energyImproved || null,
    savingsPercent: data.savingsPercent ?? null,
    measures: data.measures || [],
    hvac: data.hvac || {},
    attic: data.attic || {},
    walls: data.walls || {},
    windows: data.windows || {},
    rebates: data.rebates || null,
    photoCount: data.photoCount || 0,
    stageHistory: (data.stageHistory || []).map((h: Record<string, unknown>) => ({
      stage: normalizeStage(h.stage as string),
      timestamp: toISO(h.timestamp),
      user: h.user || undefined,
    })),
    lastSyncedAt: toISO(data.lastSyncedAt),
    createdAt: toISO(data.createdAt),
    updatedAt: toISO(data.updatedAt),
  };
}

export function serializeCrewMember(doc: FirebaseFirestore.DocumentSnapshot): Record<string, unknown> {
  const data = doc.data()!;
  return {
    id: doc.id,
    name: data.name || "",
    email: data.email || null,
    phone: data.phone || null,
    role: data.role || "",
    createdAt: toISO(data.createdAt),
    updatedAt: toISO(data.updatedAt),
  };
}

export function serializeNote(doc: FirebaseFirestore.DocumentSnapshot): Record<string, unknown> {
  const data = doc.data()!;
  return {
    id: doc.id,
    text: data.text || "",
    authorId: data.authorId || "",
    authorName: data.authorName || "",
    createdAt: toISO(data.createdAt),
    type: data.type || "note",
  };
}

export function serializeActivity(doc: FirebaseFirestore.DocumentSnapshot): Record<string, unknown> {
  const data = doc.data()!;
  return {
    id: doc.id,
    type: data.type || "stage_changed",
    message: data.message || "",
    jobId: data.jobId || null,
    jobAddress: data.jobAddress || null,
    authorId: data.authorId || null,
    authorName: data.authorName || null,
    timestamp: toISO(data.timestamp),
  };
}
