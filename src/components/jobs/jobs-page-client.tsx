"use client";

import { useState, useCallback } from "react";
import { KanbanBoard } from "./kanban-board";
import { JobsTable } from "./jobs-table";
import { JobsFilterBar } from "./jobs-filter-bar";
import { CreateJobModal } from "./create-job-modal";
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
  totalCount: number;
}

export function JobsPageClient({ jobs, crewLeads, defaultView = "kanban", totalCount }: Props) {
  const [view, setView] = useState<"kanban" | "table">(defaultView);
  const [search, setSearch] = useState("");
  const [crewLeadFilter, setCrewLeadFilter] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  const onSearchChange = useCallback((s: string) => setSearch(s), []);
  const onCrewLeadFilterChange = useCallback((c: string) => setCrewLeadFilter(c), []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pipeline</h1>
          <p className="text-sm text-gray-400 mt-0.5">{totalCount} jobs</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Job
        </button>
      </div>

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

      <CreateJobModal open={showCreateModal} onClose={() => setShowCreateModal(false)} />
    </div>
  );
}
