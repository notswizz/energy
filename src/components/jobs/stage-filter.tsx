"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { JOB_STAGES, STAGE_CONFIG } from "@/src/types";

export function StageFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeStage = searchParams.get("stage") || "all";

  const setStage = (stage: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (stage === "all") {
      params.delete("stage");
    } else {
      params.set("stage", stage);
    }
    router.push(`/jobs?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => setStage("all")}
        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
          activeStage === "all"
            ? "bg-gray-900 text-white"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        }`}
      >
        All
      </button>
      {JOB_STAGES.map((stage) => (
        <button
          key={stage}
          onClick={() => setStage(stage)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            activeStage === stage
              ? "bg-gray-900 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {STAGE_CONFIG[stage].label}
        </button>
      ))}
    </div>
  );
}
