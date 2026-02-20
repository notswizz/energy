import Link from "next/link";
import { StageBadge } from "./stage-badge";
import type { JobStage } from "@/src/types";

interface JobCardProps {
  id: string;
  address: string;
  homeowner: string;
  stage: JobStage;
  photoCount: number;
  hesScore: number | null;
  rebateStatus: string | null;
}

export function JobCard({
  id,
  address,
  homeowner,
  stage,
  photoCount,
  hesScore,
  rebateStatus,
}: JobCardProps) {
  return (
    <Link href={`/jobs/${id}`} className="block">
      <div className="bg-white rounded-lg border border-gray-200 p-4 hover:border-gray-300 hover:shadow-sm transition-all">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-gray-900 truncate">{address}</h3>
            <p className="text-sm text-gray-500 mt-0.5">{homeowner}</p>
          </div>
          <StageBadge stage={stage} />
        </div>

        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
          <span>{photoCount} photos</span>
          {hesScore !== null && <span>HES: {hesScore}</span>}
          {rebateStatus && (
            <span className={rebateStatus === "approved" ? "text-green-600" : ""}>
              Rebate: {rebateStatus}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
