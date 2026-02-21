/**
 * Fuzzy address matching — finds jobs in Firestore by address from a parsed checklist PDF.
 */

import { getJobsRef, getJobRef } from "@/src/lib/firestore/helpers";

interface MatchedJob {
  jobId: string;
  address: string;
  homeowner: string;
  score: number;
  snuggproId?: string;
}

/**
 * Normalize an address string for comparison:
 * - lowercase
 * - strip unit/apt/suite suffixes
 * - normalize abbreviations (st→street, ave→avenue, etc.)
 * - strip punctuation
 */
function normalizeAddress(raw: string): string {
  let addr = raw.toLowerCase().trim();

  // Remove unit/apt/suite
  addr = addr.replace(/\b(apt|unit|suite|ste|#)\s*\S+/gi, "");

  // Normalize common abbreviations
  const abbrevs: Record<string, string> = {
    st: "street",
    ave: "avenue",
    blvd: "boulevard",
    dr: "drive",
    ln: "lane",
    rd: "road",
    ct: "court",
    pl: "place",
    cir: "circle",
    trl: "trail",
    pkwy: "parkway",
    hwy: "highway",
    n: "north",
    s: "south",
    e: "east",
    w: "west",
    ne: "northeast",
    nw: "northwest",
    se: "southeast",
    sw: "southwest",
  };

  // Only replace at word boundaries
  for (const [abbr, full] of Object.entries(abbrevs)) {
    addr = addr.replace(new RegExp(`\\b${abbr}\\b\\.?`, "g"), full);
  }

  // Strip punctuation and extra whitespace
  addr = addr.replace(/[.,#]/g, "").replace(/\s+/g, " ").trim();

  return addr;
}

/**
 * Extract the street number and street name for quick matching.
 */
function extractStreetParts(normalized: string): { number: string; streetName: string } {
  const match = normalized.match(/^(\d+)\s+(.+?)(?:\s+(?:north|south|east|west|northeast|northwest|southeast|southwest))?\s*$/);
  if (match) {
    return { number: match[1], streetName: match[2] };
  }
  // Try just the first two words
  const parts = normalized.split(" ");
  return { number: parts[0] || "", streetName: parts.slice(1, 3).join(" ") };
}

/**
 * Score how well two addresses match (0-100).
 */
function scoreMatch(pdfAddress: string, jobAddress: string): number {
  const normPdf = normalizeAddress(pdfAddress);
  const normJob = normalizeAddress(jobAddress);

  // Exact match
  if (normPdf === normJob) return 100;

  // Extract parts
  const pdfParts = extractStreetParts(normPdf);
  const jobParts = extractStreetParts(normJob);

  let score = 0;

  // Street number match (most important)
  if (pdfParts.number === jobParts.number && pdfParts.number.length > 0) {
    score += 40;
  }

  // Street name contains
  if (pdfParts.streetName && jobParts.streetName) {
    if (pdfParts.streetName === jobParts.streetName) {
      score += 40;
    } else if (
      normPdf.includes(jobParts.streetName) ||
      normJob.includes(pdfParts.streetName)
    ) {
      score += 30;
    }
  }

  // City/state/zip match
  const pdfZip = pdfAddress.match(/\d{5}/)?.[0];
  const jobZip = jobAddress.match(/\d{5}/)?.[0];
  if (pdfZip && jobZip && pdfZip === jobZip) {
    score += 15;
  }

  // State match
  const pdfState = pdfAddress.match(/\b([A-Z]{2})\b/)?.[1];
  const jobState = jobAddress.match(/\b([A-Z]{2})\b/)?.[1];
  if (pdfState && jobState && pdfState === jobState) {
    score += 5;
  }

  return Math.min(score, 100);
}

/**
 * Search Firestore jobs for an address match.
 * Returns matches sorted by score (best first).
 */
export async function findJobByAddress(
  companyId: string,
  pdfAddress: string,
  threshold = 60
): Promise<MatchedJob[]> {
  const jobsRef = getJobsRef(companyId);
  const snapshot = await jobsRef.get();

  const matches: MatchedJob[] = [];

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const jobAddress =
      data.address?.raw ||
      data.address?.normalized ||
      data.address?.street ||
      "";

    if (!jobAddress) continue;

    const score = scoreMatch(pdfAddress, jobAddress);

    if (score >= threshold) {
      matches.push({
        jobId: doc.id,
        address: jobAddress,
        homeowner: data.homeowner?.name || "",
        score,
        snuggproId: data.snuggproId || undefined,
      });
    }
  }

  // Sort best match first
  matches.sort((a, b) => b.score - a.score);

  return matches;
}

/**
 * Pin AI-extracted data onto a job document in Firestore.
 */
export async function pinDataToJob(
  companyId: string,
  jobId: string,
  data: {
    aiSummary?: Record<string, unknown>;
    snuggproMapped?: Record<string, unknown>;
    extractedData?: Record<string, unknown>;
    checklistParsed?: Record<string, unknown>;
  }
): Promise<void> {
  const jobRef = getJobRef(companyId, jobId);

  const update: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (data.aiSummary) update.aiSummary = data.aiSummary;
  if (data.snuggproMapped) {
    update.snuggproMapped = data.snuggproMapped;

    // Also write into the structured fields the energy tab reads
    const mapped = data.snuggproMapped as {
      basedata?: Record<string, unknown>;
      hvacs?: Record<string, unknown>[];
      dhws?: Record<string, unknown>[];
      attics?: Record<string, unknown>[];
      walls?: Record<string, unknown>[];
      windows?: Record<string, unknown>[];
      doors?: Record<string, unknown>[];
      health?: Record<string, unknown>;
    };

    if (mapped.basedata) update.checklistData = mapped.basedata;
    if (mapped.hvacs?.length) update.hvac = { systems: mapped.hvacs };
    if (mapped.attics?.length) update.attic = { sections: mapped.attics };
    if (mapped.walls?.length) update.walls = { sections: mapped.walls };
    if (mapped.windows?.length) update.windows = { items: mapped.windows };
    if (mapped.doors?.length) update.doors = { items: mapped.doors };
    if (mapped.dhws?.length) update.dhw = { systems: mapped.dhws };
    if (mapped.health && Object.keys(mapped.health).length > 0) update.healthSafety = mapped.health;
  }
  if (data.extractedData) {
    update.extractedData = data.extractedData;
  }
  if (data.checklistParsed) {
    update.checklistProcessedAt = new Date().toISOString();
  }

  await jobRef.update(update);
}

/**
 * Parse a raw address string into structured parts.
 */
function parseAddressParts(raw: string): {
  street: string;
  city: string;
  state: string;
  zip: string;
} {
  // Try "123 Main St, City, ST 12345" pattern
  const match = raw.match(/^(.+?),\s*(.+?),?\s*([A-Z]{2})\s*(\d{5})/);
  if (match) {
    return { street: match[1].trim(), city: match[2].trim(), state: match[3], zip: match[4] };
  }
  // Fallback
  const zip = raw.match(/\d{5}/)?.[0] || "";
  const state = raw.match(/\b([A-Z]{2})\b/)?.[1] || "";
  return { street: raw, city: "", state, zip };
}

/**
 * Create a new job in Firestore from checklist data + AI analysis.
 */
export async function createJobFromChecklist(
  companyId: string,
  checklistData: {
    address: string;
    projectName: string;
    snuggproMapped?: Record<string, unknown>;
    aiSummary?: Record<string, unknown>;
  }
): Promise<string> {
  const jobsRef = getJobsRef(companyId);
  const parts = parseAddressParts(checklistData.address);

  const now = new Date();
  const jobDoc: Record<string, unknown> = {
    address: {
      raw: checklistData.address,
      normalized: normalizeAddress(checklistData.address),
      street: parts.street,
      city: parts.city,
      state: parts.state,
      zip: parts.zip,
    },
    homeowner: {
      name: checklistData.projectName || "",
    },
    stage: "audit_complete",
    crew: [],
    measures: [],
    photoCount: 0,
    stageHistory: [{ stage: "audit_complete", timestamp: now }],
    energyBaseline: null,
    energyImproved: null,
    savingsPercent: null,
    rebates: null,
    hvac: {},
    attic: {},
    walls: {},
    windows: {},
    snuggproId: "",
    companycamProjectId: null,
    lastSyncedAt: null,
    createdAt: now,
    updatedAt: now,
    checklistProcessedAt: now.toISOString(),
  };

  if (checklistData.snuggproMapped) jobDoc.snuggproMapped = checklistData.snuggproMapped;
  if (checklistData.aiSummary) jobDoc.aiSummary = checklistData.aiSummary;

  const docRef = await jobsRef.add(jobDoc);
  return docRef.id;
}
