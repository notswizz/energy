import type { Job, Photo, Measure, StageHistoryEntry, JobStage, EnergyProfile, RebateInfo, Address } from "@/src/types";
import type { SnuggProJob, SnuggProMetrics, SnuggProRecommendation, SnuggProHvac, SnuggProAttic, SnuggProWall, SnuggProWindow, SnuggProHesScore, SnuggProRebate, SnuggProStageHistory } from "@/src/types/snuggpro";
import type { CompanyCamPhoto } from "@/src/types/companycam";
import { normalizeAddress } from "@/src/lib/utils/address";

// SnuggPro stageId is a numeric string — map to new stage names
const SNUGGPRO_STAGE_MAP: Record<string, JobStage> = {
  "1": "audit_scheduled",
  "2": "audit_complete",
  "3": "work_in_progress",
  "4": "inspection",
  "5": "complete",
  "6": "paid",
  // Also support text values
  audit: "audit_complete",
  "audit_scheduled": "audit_scheduled",
  "audit_complete": "audit_complete",
  "in progress": "work_in_progress",
  "in-progress": "work_in_progress",
  inspection: "inspection",
  completed: "complete",
  complete: "complete",
  paid: "paid",
  lead: "lead",
};

function mapStage(snuggproStage: string | undefined | null): JobStage {
  if (!snuggproStage) return "audit_scheduled";
  return SNUGGPRO_STAGE_MAP[snuggproStage.toLowerCase()] || SNUGGPRO_STAGE_MAP[snuggproStage] || "audit_scheduled";
}

function mapMeasureCategory(category: string | undefined | null): Measure["category"] {
  if (!category) return "other";
  const lower = category.toLowerCase();
  if (lower.includes("hvac") || lower.includes("heating") || lower.includes("cooling")) return "hvac";
  if (lower.includes("attic") || lower.includes("ceiling") || lower.includes("vault")) return "attic";
  if (lower.includes("wall")) return "walls";
  if (lower.includes("window")) return "windows";
  if (lower.includes("air") || lower.includes("seal") || lower.includes("leak")) return "air_sealing";
  return "other";
}

export function mapSnuggProAddress(job: SnuggProJob): Address {
  const raw = [job.address1, job.city, job.state, job.zip].filter(Boolean).join(", ");
  return {
    raw,
    normalized: normalizeAddress(raw),
    street: job.address1 || "",
    city: job.city || "",
    state: job.state || "",
    zip: job.zip || "",
  };
}

export function mapSnuggProJob(
  raw: SnuggProJob,
  details: {
    metrics?: SnuggProMetrics | null;
    recommendations?: SnuggProRecommendation[];
    hvacs?: SnuggProHvac[];
    attics?: SnuggProAttic[];
    walls?: SnuggProWall[];
    windows?: SnuggProWindow[];
    hesScore?: SnuggProHesScore | null;
    rebates?: SnuggProRebate[];
    stageHistory?: SnuggProStageHistory[];
  }
): Omit<Job, "id" | "companycamProjectId" | "photoCount" | "createdAt" | "updatedAt"> {
  const address = mapSnuggProAddress(raw);

  let energyBaseline: EnergyProfile | null = null;
  let energyImproved: EnergyProfile | null = null;
  let savingsPercent: number | null = null;

  const m = details.metrics;
  // Only populate energy if the job has been modeled (at least one metric is non-null)
  if (m && (m.yearlyEnergyCost != null || m.mbtuBase != null || m.annualElectricKWhUsed != null)) {
    energyBaseline = {
      annualEnergyCost: m.yearlyEnergyCost ?? 0,
      mbtu: m.mbtuBase ?? 0,
      co2: m.totalCo2TonsBase ?? 0,
      hesScore: (details.hesScore as Record<string, unknown>)?.baseScore as number ?? null,
    };
    energyImproved = {
      annualEnergyCost: m.yearlyEnergyCostImproved ?? 0,
      mbtu: m.mbtuImproved ?? 0,
      co2: m.totalCo2Tons ?? 0,
      hesScore: (details.hesScore as Record<string, unknown>)?.improvedScore as number ?? null,
    };
    if (m.savedMbtuPercent != null) {
      savingsPercent = Math.round(m.savedMbtuPercent);
    } else if (m.yearlyEnergyCost && m.yearlyEnergyCost > 0 && m.totalSavings != null) {
      savingsPercent = Math.round((m.totalSavings / m.yearlyEnergyCost) * 100);
    }
  }

  // Map recommendations — filter out ones with no useful data
  const measures: Measure[] = (details.recommendations || [])
    .filter((rec) => rec.cost != null || rec.savings != null || rec.savedMbtu != null)
    .map((rec) => ({
      name: rec.title,
      category: mapMeasureCategory(rec.category),
      cost: rec.cost ?? 0,
      savings: rec.savings ?? 0,
    }));

  const rebates: RebateInfo | null = null;
  // Rebates structure TBD based on actual API data

  // Stage history — uses stageId and startAt
  const stageHistory: StageHistoryEntry[] = (details.stageHistory || [])
    .filter((h) => h.startAt)
    .map((h) => ({
      stage: mapStage(h.stageId),
      timestamp: new Date(h.startAt),
      user: h.changedBy != null ? String(h.changedBy) : undefined,
    }));

  // Store raw building component data as-is (camelCase from API)
  const hvac: Record<string, unknown> = { systems: details.hvacs || [] };
  const attic: Record<string, unknown> = { sections: details.attics || [] };
  const walls: Record<string, unknown> = { sections: details.walls || [] };
  const windows: Record<string, unknown> = { items: details.windows || [] };

  return {
    snuggproId: String(raw.id),
    address,
    homeowner: {
      name: [raw.firstName, raw.lastName].filter(Boolean).join(" "),
      email: raw.email || undefined,
      phone: raw.homePhone || undefined,
    },
    stage: mapStage(raw.stageId),
    crew: [],
    energyBaseline,
    energyImproved,
    savingsPercent,
    measures,
    hvac,
    attic,
    walls,
    windows,
    rebates,
    stageHistory,
    lastSyncedAt: new Date(),
  };
}

export function mapCompanyCamPhoto(raw: CompanyCamPhoto): Omit<Photo, "id"> {
  const originalUri = raw.uris.find((u) => u.type === "original");
  const thumbUri = raw.uris.find((u) => u.type === "thumbnail") || raw.uris.find((u) => u.type === "small");

  return {
    companycamPhotoId: raw.id,
    url: originalUri?.uri || raw.uris[0]?.uri || "",
    thumbnailUrl: thumbUri?.uri || originalUri?.uri || raw.uris[0]?.uri || "",
    takenAt: new Date(raw.captured_at * 1000),
    lat: raw.lat,
    lng: raw.lng,
    tags: raw.tags.map((t) => t.display_value),
  };
}
