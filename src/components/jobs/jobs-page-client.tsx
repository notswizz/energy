"use client";

import { useState, useCallback } from "react";
import { KanbanBoard } from "./kanban-board";
import { JobsTable } from "./jobs-table";
import { JobsFilterBar } from "./jobs-filter-bar";
import type { JobStage } from "@/src/types";

interface JobData {
  id: string;
  address: string;
  homeowner: string;
  stage: JobStage;
  crewLeadName: string | null;
  rebateEstimate: number | null;
  updatedAt: string;
  stageHistory: Array<{ stage: string; timestamp: string }>;
}

interface Props {
  jobs: JobData[];
  crewLeads: Array<{ id: string; name: string }>;
  defaultView?: "kanban" | "table";
}

export function JobsPageClient({ jobs, crewLeads, defaultView = "kanban" }: Props) {
  const [view, setView] = useState<"kanban" | "table">(defaultView);
  const [search, setSearch] = useState("");
  const [crewLeadFilter, setCrewLeadFilter] = useState("");

  const onSearchChange = useCallback((s: string) => setSearch(s), []);
  const onCrewLeadFilterChange = useCallback((c: string) => setCrewLeadFilter(c), []);

  return (
    <div className="space-y-4">
      <JobsFilterBar
        view={view}
        onViewChange={setView}
        search={search}
        onSearchChange={onSearchChange}
        crewLeadFilter={crewLeadFilter}
        onCrewLeadFilterChange={onCrewLeadFilterChange}
        crewLeads={crewLeads}
      />

      {view === "kanban" ? (
        <KanbanBoard jobs={jobs} search={search} crewLeadFilter={crewLeadFilter} />
      ) : (
        <JobsTable jobs={jobs} search={search} crewLeadFilter={crewLeadFilter} />
      )}
    </div>
  );
}
