"use client";

import { useState, useCallback } from "react";
import { DragDropContext, Droppable, type DropResult } from "@hello-pangea/dnd";
import { JOB_STAGES, STAGE_CONFIG, type JobStage } from "@/src/types";
import { KanbanCard } from "./kanban-card";
import { DateModal } from "./date-modal";

interface KanbanJob {
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
  jobs: KanbanJob[];
  search: string;
  crewLeadFilter: string;
}

interface PendingDrag {
  jobId: string;
  newStage: JobStage;
  type: "audit" | "inspection";
}

export function KanbanBoard({ jobs: initialJobs, search, crewLeadFilter }: Props) {
  const [jobs, setJobs] = useState(initialJobs);
  const [pendingDrag, setPendingDrag] = useState<PendingDrag | null>(null);

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

  const columns = JOB_STAGES.map((stage) => ({
    stage,
    config: STAGE_CONFIG[stage],
    jobs: filtered.filter((j) => j.stage === stage),
  }));

  const applyStageChange = useCallback(async (jobId: string, newStage: JobStage, extraFields?: Record<string, unknown>) => {
    setJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, stage: newStage } : j))
    );

    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: newStage, ...extraFields }),
      });
      if (!res.ok) {
        setJobs((prev) =>
          prev.map((j) => {
            if (j.id === jobId) {
              return initialJobs.find((ij) => ij.id === jobId) || j;
            }
            return j;
          })
        );
      }
    } catch {
      setJobs((prev) =>
        prev.map((j) => {
          if (j.id === jobId) {
            return initialJobs.find((ij) => ij.id === jobId) || j;
          }
          return j;
        })
      );
    }
  }, [initialJobs]);

  const onDragEnd = useCallback((result: DropResult) => {
    const { draggableId, destination } = result;
    if (!destination) return;

    const newStage = destination.droppableId as JobStage;
    const job = jobs.find((j) => j.id === draggableId);
    if (!job || job.stage === newStage) return;

    // If dragging to audit_scheduled or inspection, prompt for date
    if (newStage === "audit_scheduled") {
      setPendingDrag({ jobId: draggableId, newStage, type: "audit" });
      return;
    }
    if (newStage === "inspection") {
      setPendingDrag({ jobId: draggableId, newStage, type: "inspection" });
      return;
    }

    applyStageChange(draggableId, newStage);
  }, [jobs, applyStageChange]);

  const handleDateConfirm = (date: string) => {
    if (!pendingDrag) return;
    const extraFields = pendingDrag.type === "audit"
      ? { auditDate: date }
      : { inspectionDate: date };
    applyStageChange(pendingDrag.jobId, pendingDrag.newStage, extraFields);
    setPendingDrag(null);
  };

  const handleDateCancel = () => {
    setPendingDrag(null);
  };

  return (
    <>
      <DateModal
        open={pendingDrag?.type === "audit"}
        title="Schedule Audit"
        label="Audit Date"
        onConfirm={handleDateConfirm}
        onCancel={handleDateCancel}
      />
      <DateModal
        open={pendingDrag?.type === "inspection"}
        title="Schedule Inspection"
        label="Inspection Date"
        onConfirm={handleDateConfirm}
        onCancel={handleDateCancel}
      />

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: "calc(100vh - 240px)" }}>
          {columns.map(({ stage, config, jobs: columnJobs }) => (
            <div key={stage} className="flex-shrink-0 w-60">
              <div className="flex items-center gap-2 mb-3 px-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: config.color }} />
                <h3 className="text-sm font-semibold text-gray-900">{config.label}</h3>
                <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">
                  {columnJobs.length}
                </span>
              </div>
              <Droppable droppableId={stage}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`space-y-2 p-2 rounded-lg min-h-[120px] transition-colors ${
                      snapshot.isDraggingOver ? "bg-blue-50" : "bg-gray-50"
                    }`}
                  >
                    {columnJobs.map((job, index) => (
                      <KanbanCard key={job.id} job={job} index={index} />
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>
    </>
  );
}
