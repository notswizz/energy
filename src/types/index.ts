export type JobStage =
  | "lead"
  | "audit_scheduled"
  | "audit_complete"
  | "work_in_progress"
  | "inspection"
  | "complete";

export const JOB_STAGES: JobStage[] = [
  "lead",
  "audit_scheduled",
  "audit_complete",
  "work_in_progress",
  "inspection",
  "complete",
];

/** Map old/legacy stage values to current stage names (for reading from Firestore) */
const STAGE_ALIASES: Record<string, JobStage> = {
  audit: "audit_complete",
  in_progress: "work_in_progress",
  completed: "complete",
  paid: "complete",
  // identity mappings for current values
  lead: "lead",
  audit_scheduled: "audit_scheduled",
  audit_complete: "audit_complete",
  work_in_progress: "work_in_progress",
  inspection: "inspection",
  complete: "complete",
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

export interface RebateTrackerEntry {
  program: string;
  amountApplied: number;
  amountApproved: number | null;
  amountPaid: number | null;
  status: "not_applied" | "applied" | "approved" | "denied" | "paid";
  appliedDate: string | null;
  approvedDate: string | null;
  paidDate: string | null;
}

export interface JobCosting {
  labor: number;
  materials: number;
  equipment: number;
  other: number;
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
  rebateTracker: RebateTrackerEntry[];
  costing: JobCosting | null;
  photoCount: number;
  stageHistory: StageHistoryEntry[];
  lastSyncedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;

  // Extraction pipeline
  extractedData?: ExtractedData | null;
  extractionStatus?: ExtractionStatus;
  checklistPdfUrl?: string | null;
  inspectionPdfUrl?: string | null;
  snuggproMapped?: Record<string, unknown> | null;
  checklistData?: Record<string, unknown> | null;
  healthSafety?: Record<string, unknown> | null;
  dhw?: Record<string, unknown> | null;
}

export type PhotoClassification =
  | "blower_door_setup"
  | "blower_door_result"
  | "manometer_reading"
  | "hvac_unit_outdoor"
  | "hvac_unit_indoor"
  | "hvac_nameplate"
  | "ductwork"
  | "water_heater"
  | "water_heater_nameplate"
  | "thermostat"
  | "electrical_panel"
  | "attic_insulation"
  | "wall_insulation"
  | "crawlspace"
  | "basement"
  | "window"
  | "door"
  | "siding_exterior"
  | "roof"
  | "kitchen_appliance"
  | "laundry_appliance"
  | "lighting"
  | "solar_panel"
  | "combustion_safety"
  | "other";

export type PhotoProcessingStatus = "pending" | "classified" | "extracted" | "error";

export interface AiSummary {
  blowerDoor: { pressure_pa?: number; cfm50?: number } | null;
  hvac: Array<{ manufacturer?: string; model?: string; seer?: number; btu?: number; fuel_type?: string }>;
  waterHeater: { manufacturer?: string; model?: string; capacity?: number; fuel_type?: string } | null;
  insulation: { type?: string; avg_depth_inches?: number; condition?: string } | null;
  electrical: { max_amperage?: number; open_slots?: number } | null;
  thermostat: { heating_setpoint?: number; cooling_setpoint?: number } | null;
  windows: { pane_type?: string; frame_material?: string; count?: number } | null;
  doors: Array<{ material?: string; has_storm?: boolean }>;
  walls: { siding_types?: string[]; insulation_status?: string } | null;
  appliances: Array<{ type?: string; manufacturer?: string; model?: string; fuel_type?: string }>;
  lighting: { incandescent?: number; cfl?: number; led?: number } | null;
  lastProcessedAt: string;
}

// ---- Extraction Pipeline Types ----

export type FieldConfidence = "high" | "medium" | "low" | "missing";
export type FieldSource = "text_parse" | "ai_vision" | "manual_edit";
export type ExtractionStatus = "uploaded" | "extracted" | "reviewed" | "submitted" | "error";

export interface ExtractedHvacSystem {
  manufacturer?: string;
  modelNumber?: string;
  systemType?: string;
  fuelType?: string;
  seer?: number;
  hspf?: number;
  afue?: number;
  btuInput?: number;
  tonnage?: number;
  yearManufactured?: number;
  ductLeakageCfm25?: number;
  ductInsulationRValue?: number;
  ductSealed?: boolean;
}

export interface ExtractedDhwSystem {
  type?: string;
  fuelType?: string;
  manufacturer?: string;
  modelNumber?: string;
  capacityGallons?: number;
  energyFactor?: number;
  uef?: number;
  ageRange?: string;
  location?: string;
  temperatureSetting?: string;
  tankWrap?: boolean;
  pipeWrap?: boolean;
  yearManufactured?: number;
}

export interface ExtractedAtticSection {
  insulationType?: string;
  depthInches?: number;
  depthRange?: string;
  condition?: string;
  coveragePct?: number;
}

export interface ExtractedWallSection {
  insulated?: string;
  insulationType?: string;
  siding?: string;
  construction?: string;
  condition?: string;
}

export interface ExtractedWindowConfig {
  paneType?: string;
  frameMaterial?: string;
  stormWindow?: boolean;
  lowE?: boolean;
}

export interface ExtractedDoor {
  material?: string;
  hasStormDoor?: boolean;
}

export interface ExtractedHealthSafety {
  ambientCo?: number;
  naturalConditionSpillage?: string;
  worstCaseDepressurization?: string;
  worstCaseSpillage?: string;
  undilutedFlueCo?: number;
  draftPressure?: number;
  gasLeak?: string;
  venting?: string;
  moldMoisture?: string;
  radon?: string;
  asbestos?: string;
  lead?: string;
  electrical?: string;
  roofCondition?: string;
  drainageCondition?: string;
}

export interface ExtractedData {
  // Building
  yearBuilt?: number;
  conditionedArea?: number;
  avgWallHeight?: number;
  floorsAboveGrade?: number;
  numOccupants?: number;
  numBedrooms?: number;
  typeOfHome?: string;
  frontOrientation?: string;

  // Foundation
  foundationBasementPct?: number;
  foundationCrawlPct?: number;
  foundationSlabPct?: number;
  foundationAboveGradeHeight?: number;
  basementWallInsulation?: string;
  basementHeating?: boolean;
  basementCooling?: boolean;

  // Thermostat
  heatingSetpointHigh?: number;
  heatingSetpointLow?: number;
  coolingSetpointLow?: number;
  coolingSetpointHigh?: number;
  thermostatManufacturer?: string;

  // Appliances
  rangeFuelType?: string;
  rangeManufacturer?: string;
  ovenFuelType?: string;
  dryerFuelType?: string;
  dryerManufacturer?: string;
  washerType?: string;
  washerEnergyStar?: boolean;
  washerManufacturer?: string;
  dishwasherInstalled?: boolean;
  dishwasherEnergyStar?: boolean;
  refrigeratorAge?: number;
  refrigeratorSizeCf?: number;
  refrigeratorEnergyStar?: boolean;

  // Lighting
  pctCflsOrLeds?: string;
  totalLightBulbs?: number;

  // Air Leakage
  blowerDoorTestPerformed?: boolean;
  blowerDoorCfm50?: number;

  // Electrical Panel
  panelMaxAmps?: number;
  panelOpenSpots?: number;

  // Misc
  hasPv?: boolean;
  hasPool?: boolean;
  hasHotTub?: boolean;
  hasEv?: boolean;

  // Concerns
  concernsSummary?: string;
  concernsDetail?: string;

  // Sub-systems (arrays)
  hvacSystems: ExtractedHvacSystem[];
  dhwSystems: ExtractedDhwSystem[];
  atticSections: ExtractedAtticSection[];
  wallSections: ExtractedWallSection[];
  windowConfigs: ExtractedWindowConfig[];
  doors: ExtractedDoor[];
  healthSafety: ExtractedHealthSafety;

  // Confidence & source tracking
  fieldConfidence: Record<string, FieldConfidence>;
  fieldSource: Record<string, FieldSource>;
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
  classification?: PhotoClassification;
  processingStatus?: PhotoProcessingStatus;
  extractedData?: Record<string, unknown>;
  processedAt?: Date;
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
