"use client";

import { DetailTabs } from "./detail-tabs";
import { PhotosTab } from "./photos-tab";
import { EnergyTab } from "./energy-tab";
import { RebatesTab } from "./rebates-tab";
import { TimelineTab } from "./timeline-tab";
import { NotesTab } from "./notes-tab";
import type { EnergyProfile, Measure, RebateInfo } from "@/src/types";

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
  rebates: RebateInfo | null;
  stageHistory: Array<{ stage: string; timestamp: string; user?: string }>;
  notes: NoteData[];
  currentUserName: string;
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
  rebates,
  stageHistory,
  notes,
  currentUserName,
}: Props) {
  return (
    <DetailTabs
      tabs={[
        {
          id: "photos",
          label: `Photos (${photos.length})`,
          content: <PhotosTab photos={photos} />,
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
