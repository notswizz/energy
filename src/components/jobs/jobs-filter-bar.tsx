"use client";

import { useState, useEffect } from "react";

interface Props {
  view: "kanban" | "table";
  onViewChange: (view: "kanban" | "table") => void;
  search: string;
  onSearchChange: (search: string) => void;
  crewLeadFilter: string;
  onCrewLeadFilterChange: (crewLead: string) => void;
  crewLeads: Array<{ id: string; name: string }>;
}

export function JobsFilterBar({
  view,
  onViewChange,
  search,
  onSearchChange,
  crewLeadFilter,
  onCrewLeadFilterChange,
  crewLeads,
}: Props) {
  const [localSearch, setLocalSearch] = useState(search);

  useEffect(() => {
    const timer = setTimeout(() => onSearchChange(localSearch), 300);
    return () => clearTimeout(timer);
  }, [localSearch, onSearchChange]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="flex-1 min-w-[200px]">
        <input
          type="text"
          placeholder="Search by address or homeowner..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
        />
      </div>

      {/* Crew Lead Filter */}
      <select
        value={crewLeadFilter}
        onChange={(e) => onCrewLeadFilterChange(e.target.value)}
        className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
      >
        <option value="">All Crew Leads</option>
        {crewLeads.map((cl) => (
          <option key={cl.id} value={cl.name}>{cl.name}</option>
        ))}
      </select>

      {/* View Toggle */}
      <div className="flex rounded-lg border border-gray-200 overflow-hidden">
        <button
          onClick={() => onViewChange("kanban")}
          className={`px-3 py-2 text-sm font-medium transition-colors ${
            view === "kanban" ? "bg-gray-900 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
          }`}
        >
          Board
        </button>
        <button
          onClick={() => onViewChange("table")}
          className={`px-3 py-2 text-sm font-medium transition-colors ${
            view === "table" ? "bg-gray-900 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
          }`}
        >
          Table
        </button>
      </div>
    </div>
  );
}
