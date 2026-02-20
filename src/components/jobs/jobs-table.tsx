"use client";

import { useState } from "react";
import Link from "next/link";
import { StageBadge } from "@/src/components/ui/stage-badge";
import type { JobStage } from "@/src/types";

interface TableJob {
  id: string;
  address: string;
  homeowner: string;
  stage: JobStage;
  crewLeadName: string | null;
  rebateEstimate: number | null;
  updatedAt: string;
  stageHistory: Array<{ stage: string; timestamp: string }>;
}

type SortKey = "address" | "homeowner" | "stage" | "crewLeadName" | "rebateEstimate" | "updatedAt";

function daysInStage(job: TableJob): number {
  if (!job.stageHistory || job.stageHistory.length === 0) return 0;
  const lastEntry = job.stageHistory[job.stageHistory.length - 1];
  if (!lastEntry?.timestamp) return 0;
  return Math.floor((Date.now() - new Date(lastEntry.timestamp).getTime()) / (1000 * 60 * 60 * 24));
}

interface Props {
  jobs: TableJob[];
  search: string;
  crewLeadFilter: string;
}

export function JobsTable({ jobs, search, crewLeadFilter }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("updatedAt");
  const [sortAsc, setSortAsc] = useState(false);

  const filtered = jobs.filter((job) => {
    if (search) {
      const lower = search.toLowerCase();
      if (!job.address.toLowerCase().includes(lower) && !job.homeowner.toLowerCase().includes(lower)) {
        return false;
      }
    }
    if (crewLeadFilter && job.crewLeadName !== crewLeadFilter) {
      return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "address": cmp = a.address.localeCompare(b.address); break;
      case "homeowner": cmp = a.homeowner.localeCompare(b.homeowner); break;
      case "stage": cmp = a.stage.localeCompare(b.stage); break;
      case "crewLeadName": cmp = (a.crewLeadName || "").localeCompare(b.crewLeadName || ""); break;
      case "rebateEstimate": cmp = (a.rebateEstimate || 0) - (b.rebateEstimate || 0); break;
      case "updatedAt": cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(); break;
    }
    return sortAsc ? cmp : -cmp;
  });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const SortHeader = ({ label, col }: { label: string; col: SortKey }) => (
    <th
      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
      onClick={() => toggleSort(col)}
    >
      {label} {sortKey === col ? (sortAsc ? "↑" : "↓") : ""}
    </th>
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <SortHeader label="Address" col="address" />
            <SortHeader label="Homeowner" col="homeowner" />
            <SortHeader label="Stage" col="stage" />
            <SortHeader label="Crew Lead" col="crewLeadName" />
            <SortHeader label="Rebate Est." col="rebateEstimate" />
            <SortHeader label="Updated" col="updatedAt" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {sorted.map((job) => (
            <tr key={job.id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <Link href={`/jobs/${job.id}`} className="text-sm font-medium text-gray-900 hover:text-blue-600">
                  {job.address}
                </Link>
              </td>
              <td className="px-4 py-3 text-sm text-gray-500">{job.homeowner}</td>
              <td className="px-4 py-3"><StageBadge stage={job.stage} /></td>
              <td className="px-4 py-3 text-sm text-gray-500">{job.crewLeadName || "—"}</td>
              <td className="px-4 py-3 text-sm text-gray-500">
                {job.rebateEstimate ? `$${job.rebateEstimate.toLocaleString()}` : "—"}
              </td>
              <td className="px-4 py-3 text-sm text-gray-400">
                {new Date(job.updatedAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                No jobs found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
