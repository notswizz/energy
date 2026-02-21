"use client";

import { useState, useCallback, useRef } from "react";

type Phase = "idle" | "processing" | "done" | "error";

interface ProcessResult {
  checklist: {
    projectName: string;
    address: string;
    sectionsFound: string[];
    photoCount: number;
  };
  stats: {
    filledFields: number;
    hvacSystems: number;
    dhwSystems: number;
    atticSections: number;
    wallSections: number;
    windowConfigs: number;
    doors: number;
    healthFields: number;
  };
}

interface Props {
  jobId: string;
  onClose: () => void;
  onSaved?: () => void;
  pdfType?: "checklist" | "inspection";
}

export function PdfUploadModal({ jobId, onClose, onSaved, pdfType = "checklist" }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(async (file: File) => {
    setPhase("processing");
    setFileName(file.name);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("pdf", file);
    formData.append("pdfType", pdfType);

    try {
      const res = await fetch(`/api/jobs/${jobId}/process-checklist`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setPhase("error");
        setError(data.error || "Processing failed");
        return;
      }

      setResult(data);
      setPhase("done");
      onSaved?.();
    } catch (err) {
      setPhase("error");
      setError(err instanceof Error ? err.message : "Processing failed");
    }
  }, [jobId, pdfType, onSaved]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = Array.from(e.dataTransfer.files).find(
      (f) => f.type === "application/pdf" || f.name.endsWith(".pdf")
    );
    if (file) handleUpload(file);
  }, [handleUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  }, [handleUpload]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 pb-8">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" onClick={phase !== "processing" ? onClose : undefined} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {pdfType === "inspection" ? "Upload Inspection PDF" : "Upload Checklist PDF"}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Text data will be extracted and saved automatically
            </p>
          </div>
          {phase !== "processing" && (
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="p-6 space-y-4">
          {/* Upload area */}
          {phase === "idle" && (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed rounded-xl p-8 text-center border-gray-300 hover:border-blue-400 hover:bg-blue-50/50 cursor-pointer transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
              <svg className="mx-auto h-10 w-10 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm font-medium text-gray-600">Drop a CompanyCam checklist PDF or click to browse</p>
              <p className="text-xs text-gray-400 mt-1">Text fields will be extracted automatically</p>
            </div>
          )}

          {/* Processing */}
          {phase === "processing" && (
            <div className="bg-gray-50 rounded-xl p-8 text-center">
              <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto" />
              <p className="text-sm text-gray-700 mt-3 font-medium">Processing {fileName}</p>
              <p className="text-xs text-gray-400 mt-1">Parsing text and mapping to SnuggPro fields...</p>
            </div>
          )}

          {/* Error */}
          {phase === "error" && error && (
            <div className="space-y-3">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
              <button
                onClick={() => { setPhase("idle"); setError(null); }}
                className="w-full px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Done */}
          {phase === "done" && result && (
            <div className="space-y-4">
              {/* Checklist info */}
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm font-medium text-gray-900">{result.checklist.projectName || fileName}</p>
                {result.checklist.address && (
                  <p className="text-xs text-gray-500 mt-0.5">{result.checklist.address}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  {result.checklist.sectionsFound.length} sections found
                </p>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-4 gap-2">
                <StatBox label="Base Fields" value={result.stats.filledFields} />
                <StatBox label="HVAC" value={result.stats.hvacSystems} />
                <StatBox label="DHW" value={result.stats.dhwSystems} />
                <StatBox label="Attic" value={result.stats.atticSections} />
                <StatBox label="Walls" value={result.stats.wallSections} />
                <StatBox label="Windows" value={result.stats.windowConfigs} />
                <StatBox label="Doors" value={result.stats.doors} />
                <StatBox label="Health" value={result.stats.healthFields} />
              </div>

              {/* Success banner */}
              <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm font-medium text-green-800">
                    Saved — edit details in the Review tab
                  </span>
                </div>
                <button
                  onClick={onClose}
                  className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-2 text-center">
      <div className="text-lg font-bold text-gray-900">{value}</div>
      <div className="text-[10px] text-gray-500">{label}</div>
    </div>
  );
}
