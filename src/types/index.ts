export type JobStage =
  | "lead"
  | "audit_scheduled"
  | "audit_complete"
  | "work_in_progress"
  | "inspection"
  | "complete"
  | "paid";

export const JOB_STAGES: JobStage[] = [
  "lead",
  "audit_scheduled",
  "audit_complete",
  "work_in_progress",
  "inspection",
  "complete",
  "paid",
];

/** Map old/legacy stage values to current stage names (for reading from Firestore) */
const STAGE_ALIASES: Record<string, JobStage> = {
  audit: "audit_complete",
  in_progress: "work_in_progress",
  completed: "complete",
  // identity mappings for current values
  lead: "lead",
  audit_scheduled: "audit_scheduled",
  audit_complete: "audit_complete",
  work_in_progress: "work_in_progress",
  inspection: "inspection",
  complete: "complete",
  paid: "paid",
};

export function normalizeStage(
  raw: string | undefined | null,
  opts?: { hasAuditDate?: boolean; hasEnergyData?: boolean }
): JobStage {
  const { hasAuditDate, hasEnergyData } = opts || {};
  if (!raw || raw === "audit") {
    // Has energy data = audit is complete (modeling done)
    if (hasEnergyData) return "audit_complete";
    // Has audit date but no energy = scheduled
    if (hasAuditDate) return "audit_scheduled";
    // Neither = lead
    return "lead";
  }
  const mapped = STAGE_ALIASES[raw];
  if (!mapped) return "lead";
  return mapped;
}

export const STAGE_CONFIG: Record<
  JobStage,
  { label: string; color: string; bgClass: string; textClass: string; borderClass: string }
> = {
  lead: { label: "Lead", color: "#6b7280", bgClass: "bg-gray-100", textClass: "text-gray-800", borderClass: "border-gray-300" },
  audit_scheduled: { label: "Audit Scheduled", color: "#3b82f6", bgClass: "bg-blue-100", textClass: "text-blue-800", borderClass: "border-blue-300" },
  audit_complete: { label: "Audit Complete", color: "#8b5cf6", bgClass: "bg-violet-100", textClass: "text-violet-800", borderClass: "border-violet-300" },
  work_in_progress: { label: "In Progress", color: "#f59e0b", bgClass: "bg-yellow-100", textClass: "text-yellow-800", borderClass: "border-yellow-300" },
  inspection: { label: "Inspection", color: "#a855f7", bgClass: "bg-purple-100", textClass: "text-purple-800", borderClass: "border-purple-300" },
  complete: { label: "Complete", color: "#22c55e", bgClass: "bg-green-100", textClass: "text-green-800", borderClass: "border-green-300" },
  paid: { label: "Paid", color: "#10b981", bgClass: "bg-emerald-100", textClass: "text-emerald-800", borderClass: "border-emerald-300" },
};

export type IncomeTier = "below_80_ami" | "80_150_ami" | "above_150_ami";

export const INCOME_TIER_LABELS: Record<IncomeTier, string> = {
  below_80_ami: "Below 80% AMI",
  "80_150_ami": "80-150% AMI",
  above_150_ami: "Above 150% AMI",
};

export interface Address {
  raw: string;
  normalized: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  lat?: number;
  lng?: number;
}

export interface Homeowner {
  name: string;
  email?: string;
  phone?: string;
}

export interface EnergyProfile {
  annualEnergyCost: number;
  mbtu: number;
  co2: number;
  hesScore: number | null;
}

export interface Measure {
  name: string;
  category: "hvac" | "attic" | "walls" | "windows" | "air_sealing" | "other";
  cost: number;
  savings: number;
}

export interface RebateInfo {
  eligible: boolean;
  incomeTier: string | null;
  amounts: Record<string, number>;
  submissionStatus: "not_submitted" | "pending" | "approved" | "denied";
}

export interface StageHistoryEntry {
  stage: JobStage;
  timestamp: Date;
  user?: string;
}

export interface CrewMember {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface JobNote {
  id: string;
  text: string;
  authorId: string;
  authorName: string;
  createdAt: Date;
  type: "note" | "stage_change" | "system";
}

export interface Job {
  id: string;
  snuggproId: string;
  companycamProjectId: string | null;
  address: Address;
  homeowner: Homeowner;
  stage: JobStage;
  crew: string[];
  crewLeadId?: string;
  incomeTier?: IncomeTier;
  rebateEstimate?: number;
  auditDate?: string | null;
  inspectionDate?: string | null;
  energyBaseline: EnergyProfile | null;
  energyImproved: EnergyProfile | null;
  savingsPercent: number | null;
  measures: Measure[];
  hvac: Record<string, unknown>;
  attic: Record<string, unknown>;
  walls: Record<string, unknown>;
  windows: Record<string, unknown>;
  rebates: RebateInfo | null;
  photoCount: number;
  stageHistory: StageHistoryEntry[];
  lastSyncedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Photo {
  id: string;
  companycamPhotoId: string;
  url: string;
  thumbnailUrl: string;
  takenAt: Date;
  lat: number | null;
  lng: number | null;
  tags: string[];
}

export interface SyncState {
  provider: "snuggpro" | "companycam";
  lastSyncAt: Date | null;
  status: "idle" | "syncing" | "error";
  lastError: string | null;
  itemsSynced: number;
}

export interface Company {
  id: string;
  name: string;
  snuggproApiKey: string | null;
  snuggproBaseUrl: string;
  companycamToken: string | null;
  syncInterval: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  companyId: string;
  role: "admin" | "member";
  createdAt: Date;
}

export interface DashboardStats {
  totalJobs: number;
  photosSynced: number;
  auditsCompleted: number;
  rebatesPending: number;
  jobsByStage: Record<JobStage, number>;
  rebateValueByStage: Record<JobStage, number>;
  completedThisMonth: number;
  completedLastMonth: number;
  avgDaysPerStage: Record<string, number>;
  recentActivity: ActivityEntry[];
  syncStatus: { snuggpro: SyncState; companycam: SyncState };
}

export interface ActivityEntry {
  id: string;
  type: "job_created" | "stage_changed" | "photos_synced" | "sync_completed" | "note_added";
  message: string;
  jobId?: string;
  jobAddress?: string;
  authorId?: string;
  authorName?: string;
  timestamp: Date;
}
