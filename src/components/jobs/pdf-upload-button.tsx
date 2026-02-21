"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PdfUploadModal } from "./pdf-upload-modal";

interface Props {
  jobId: string;
  hasChecklist?: boolean;
  extractionStatus?: string | null;
}

export function PdfUploadButton({ jobId, hasChecklist, extractionStatus }: Props) {
  const [open, setOpen] = useState(false);
  const [pdfType, setPdfType] = useState<"checklist" | "inspection">("checklist");
  const router = useRouter();

  const handleOpen = (type: "checklist" | "inspection") => {
    setPdfType(type);
    setOpen(true);
  };

  return (
    <>
      <div className="flex gap-1.5">
        <button
          onClick={() => handleOpen(hasChecklist ? "inspection" : "checklist")}
          className="px-3 py-1.5 text-sm bg-blue-50 hover:bg-blue-100 rounded-md text-blue-700 transition-colors font-medium"
        >
          {hasChecklist ? "Upload Inspection PDF" : "Upload PDF"}
        </button>
        {hasChecklist && (
          <button
            onClick={() => handleOpen("checklist")}
            className="px-2 py-1.5 text-sm bg-gray-50 hover:bg-gray-100 rounded-md text-gray-600 transition-colors"
            title="Re-upload checklist PDF"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        )}
        {extractionStatus && (
          <span className={`self-center text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
            extractionStatus === "submitted" ? "bg-emerald-100 text-emerald-700"
            : extractionStatus === "reviewed" ? "bg-green-100 text-green-700"
            : extractionStatus === "extracted" ? "bg-amber-100 text-amber-700"
            : extractionStatus === "error" ? "bg-red-100 text-red-700"
            : "bg-blue-100 text-blue-700"
          }`}>
            {extractionStatus === "submitted" ? "Pushed"
            : extractionStatus === "reviewed" ? "Reviewed"
            : extractionStatus === "extracted" ? "Ready"
            : extractionStatus === "error" ? "Error"
            : "Uploaded"}
          </span>
        )}
      </div>

      {open && (
        <PdfUploadModal
          jobId={jobId}
          pdfType={pdfType}
          onClose={() => setOpen(false)}
          onSaved={() => {
            router.refresh();
          }}
        />
      )}
    </>
  );
}
