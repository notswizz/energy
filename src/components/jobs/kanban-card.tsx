"use client";

import Link from "next/link";
import { Draggable } from "@hello-pangea/dnd";

interface KanbanJob {
  id: string;
  address: string;
  homeowner: string;
  crewLeadName: string | null;
  rebateEstimate: number | null;
  updatedAt: string;
  stageHistory: Array<{ stage: string; timestamp: string }>;
}

function daysInStage(job: KanbanJob): number | null {
  if (!job.stageHistory || job.stageHistory.length === 0) return null;
  const lastEntry = job.stageHistory[job.stageHistory.length - 1];
  if (!lastEntry?.timestamp) return null;
  const entered = new Date(lastEntry.timestamp);
  const now = new Date();
  return Math.floor((now.getTime() - entered.getTime()) / (1000 * 60 * 60 * 24));
}

export function KanbanCard({ job, index }: { job: KanbanJob; index: number }) {
  const days = daysInStage(job);

  return (
    <Draggable draggableId={job.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`bg-white rounded border px-2.5 py-1.5 transition-shadow ${
            snapshot.isDragging ? "shadow-lg border-blue-300" : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <Link href={`/jobs/${job.id}`} className="block">
            <p className="text-xs font-medium text-gray-900 truncate">{job.address}</p>
            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-400">
              <span className="truncate">{job.homeowner}</span>
{job.rebateEstimate != null && job.rebateEstimate > 0 && (
                <span className="text-green-600">${job.rebateEstimate.toLocaleString()}</span>
              )}
            </div>
          </Link>
        </div>
      )}
    </Draggable>
  );
}
