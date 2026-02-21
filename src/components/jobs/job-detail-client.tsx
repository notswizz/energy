"use client";

import { DetailTabs } from "./detail-tabs";
import { PhotosTab } from "./photos-tab";
import { EnergyTab } from "./energy-tab";
import { RebatesTab } from "./rebates-tab";
import { TimelineTab } from "./timeline-tab";
import { NotesTab } from "./notes-tab";
import { AiTab } from "./ai-tab";
import { ReviewTab } from "./review-tab";
import type { AiSummary, EnergyProfile, Measure, RebateInfo, ExtractedData, ExtractionStatus } from "@/src/types";

interface NoteData {
  id: string;
  text: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  type: "note" | "stage_change" | "system";
}

interface Props {
  jobId: string;
  photos: Array<{
    id: string;
    url: string;
    thumbnailUrl: string;
    takenAt: string;
    lat: number | null;
    lng: number | null;
    tags: string[];
  }>;
  baseline: EnergyProfile | null;
  improved: EnergyProfile | null;
  savingsPercent: number | null;
  measures: Measure[];
  hvac: Record<string, unknown>;
  attic: Record<string, unknown>;
  walls: Record<string, unknown>;
  windows: Record<string, unknown>;
  checklistData?: Record<string, unknown> | null;
  dhw?: Record<string, unknown>;
  healthSafety?: Record<string, unknown> | null;
  rebates: RebateInfo | null;
  stageHistory: Array<{ stage: string; timestamp: string; user?: string }>;
  notes: NoteData[];
  currentUserName: string;
  aiSummary?: AiSummary | null;
  hasSnuggpro?: boolean;
  snuggproId?: string;
  extractedData?: ExtractedData | null;
  extractionStatus?: ExtractionStatus | null;
}

export function JobDetailClient({
  jobId,
  photos,
  baseline,
  improved,
  savingsPercent,
  measures,
  hvac,
  attic,
  walls,
  windows,
  checklistData,
  dhw,
  healthSafety,
  rebates,
  stageHistory,
  notes,
  currentUserName,
  aiSummary,
  hasSnuggpro,
  snuggproId,
  extractedData,
  extractionStatus,
}: Props) {
  const reviewBadge = extractionStatus === "extracted"
    ? { text: "Review", color: "bg-amber-100 text-amber-700" }
    : extractionStatus === "reviewed"
    ? { text: "Ready", color: "bg-green-100 text-green-700" }
    : extractionStatus === "submitted"
    ? { text: "Pushed", color: "bg-emerald-100 text-emerald-700" }
    : null;

  return (
    <DetailTabs
      tabs={[
        {
          id: "photos",
          label: `Photos (${photos.length})`,
          content: <PhotosTab photos={photos} />,
        },
        {
          id: "review",
          label: "Review",
          badge: reviewBadge ? (
            <span className={`ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full font-medium ${reviewBadge.color}`}>
              {reviewBadge.text}
            </span>
          ) : undefined,
          content: (
            <ReviewTab
              jobId={jobId}
              extractedData={extractedData || null}
              extractionStatus={extractionStatus || null}
              hasSnuggpro={hasSnuggpro || false}
              snuggproId={snuggproId}
            />
          ),
        },
        {
          id: "energy",
          label: "Energy",
          content: (
            <EnergyTab
              baseline={baseline}
              improved={improved}
              savingsPercent={savingsPercent}
              measures={measures}
              hvac={hvac}
              attic={attic}
              walls={walls}
              windows={windows}
              checklistData={checklistData}
              dhw={dhw}
              healthSafety={healthSafety}
            />
          ),
        },
        {
          id: "rebates",
          label: "Rebates",
          content: <RebatesTab rebates={rebates} />,
        },
        {
          id: "timeline",
          label: "Timeline",
          content: <TimelineTab history={stageHistory} />,
        },
        {
          id: "ai",
          label: "AI Analysis",
          content: (
            <AiTab
              jobId={jobId}
              photos={photos.map((p) => ({ id: p.id, url: p.url, thumbnailUrl: p.thumbnailUrl }))}
              initialSummary={aiSummary || null}
              hasSnuggpro={hasSnuggpro || false}
            />
          ),
        },
        {
          id: "notes",
          label: `Notes (${notes.length})`,
          content: (
            <NotesTab
              jobId={jobId}
              initialNotes={notes}
              currentUserName={currentUserName}
            />
          ),
        },
      ]}
    />
  );
}
