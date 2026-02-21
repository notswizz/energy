"use client";

import { useState, useCallback } from "react";
import type { AiSummary } from "@/src/types";

interface PhotoData {
  id: string;
  url: string;
  thumbnailUrl: string;
}

interface Props {
  jobId: string;
  photos: PhotoData[];
  initialSummary: AiSummary | null;
  hasSnuggpro: boolean;
}

interface ClassifiedPhoto {
  photoId: string;
  classification: string;
}

interface ExtractedPhoto {
  photoId: string;
  data: Record<string, unknown>;
}

type ProcessingStage = "idle" | "classifying" | "extracting" | "done" | "error";

const CATEGORY_LABELS: Record<string, string> = {
  blower_door_setup: "Blower Door Setup",
  blower_door_result: "Blower Door Result",
  manometer_reading: "Manometer Reading",
  hvac_unit_outdoor: "HVAC (Outdoor)",
  hvac_unit_indoor: "HVAC (Indoor)",
  hvac_nameplate: "HVAC Nameplate",
  ductwork: "Ductwork",
  water_heater: "Water Heater",
  water_heater_nameplate: "Water Heater Nameplate",
  thermostat: "Thermostat",
  electrical_panel: "Electrical Panel",
  attic_insulation: "Attic Insulation",
  wall_insulation: "Wall Insulation",
  crawlspace: "Crawlspace",
  basement: "Basement",
  window: "Window",
  door: "Door",
  siding_exterior: "Siding/Exterior",
  roof: "Roof",
  kitchen_appliance: "Kitchen Appliance",
  laundry_appliance: "Laundry Appliance",
  lighting: "Lighting",
  solar_panel: "Solar Panel",
  combustion_safety: "Combustion Safety",
  other: "Other",
};

export function AiTab({ jobId, photos, initialSummary, hasSnuggpro }: Props) {
  const [stage, setStage] = useState<ProcessingStage>(initialSummary ? "done" : "idle");
  const [summary, setSummary] = useState<AiSummary | null>(initialSummary);
  const [classifiedPhotos, setClassifiedPhotos] = useState<ClassifiedPhoto[]>([]);
  const [extractedPhotos, setExtractedPhotos] = useState<ExtractedPhoto[]>([]);
  const [classifyProgress, setClassifyProgress] = useState({ current: 0, total: 0 });
  const [extractProgress, setExtractProgress] = useState({ current: 0, total: 0 });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pushResult, setPushResult] = useState<{ pushed: string[]; errors: string[] } | null>(null);
  const [pushing, setPushing] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const processPhotos = useCallback(() => {
    setStage("classifying");
    setClassifiedPhotos([]);
    setExtractedPhotos([]);
    setClassifyProgress({ current: 0, total: 0 });
    setExtractProgress({ current: 0, total: 0 });
    setErrorMessage(null);
    setPushResult(null);

    // Use fetch with POST for SSE streaming
    fetch(`/api/jobs/${jobId}/process-photos`, { method: "POST" })
      .then(async (response) => {
        const reader = response.body?.getReader();
        if (!reader) return;

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(line.slice(6));
              handleEvent(data);
            } catch {
              // Skip malformed events
            }
          }
        }

        // Process remaining buffer
        if (buffer.startsWith("data: ")) {
          try {
            const data = JSON.parse(buffer.slice(6));
            handleEvent(data);
          } catch {
            // Skip
          }
        }
      })
      .catch((err) => {
        setStage("error");
        setErrorMessage(err.message);
      });

    function handleEvent(data: Record<string, unknown>) {
      switch (data.type) {
        case "start":
          setClassifyProgress({ current: 0, total: data.total as number });
          break;
        case "classified":
          setClassifiedPhotos((prev) => [
            ...prev,
            { photoId: data.photoId as string, classification: data.classification as string },
          ]);
          setClassifyProgress({ current: data.progress as number, total: data.total as number });
          break;
        case "extraction_start":
          setStage("extracting");
          setExtractProgress({ current: 0, total: data.total as number });
          break;
        case "extracted":
          setExtractedPhotos((prev) => [
            ...prev,
            { photoId: data.photoId as string, data: data.data as Record<string, unknown> },
          ]);
          setExtractProgress({ current: data.progress as number, total: data.total as number });
          break;
        case "done":
          setStage("done");
          setSummary(data.summary as AiSummary);
          break;
        case "error":
          if (data.stage) {
            // Non-fatal per-photo error
            setErrorMessage(`Error on photo ${data.photoId}: ${data.message}`);
          } else {
            setStage("error");
            setErrorMessage(data.message as string);
          }
          break;
        case "info":
          // Already processed
          break;
      }
    }
  }, [jobId]);

  const pushToSnuggpro = useCallback(async () => {
    setPushing(true);
    setPushResult(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}/push-to-snuggpro`, { method: "POST" });
      const result = await res.json();
      setPushResult(result);
    } catch (err) {
      setPushResult({ pushed: [], errors: [err instanceof Error ? err.message : "Push failed"] });
    }
    setPushing(false);
  }, [jobId]);

  const handleEdit = useCallback(async (path: string, value: string) => {
    try {
      // Update the local summary optimistically
      setSummary((prev) => {
        if (!prev) return prev;
        const updated = { ...prev };
        const parts = path.split(".");
        let obj: Record<string, unknown> = updated as unknown as Record<string, unknown>;
        for (let i = 0; i < parts.length - 1; i++) {
          if (obj[parts[i]] === null || obj[parts[i]] === undefined) {
            obj[parts[i]] = {};
          }
          obj = obj[parts[i]] as Record<string, unknown>;
        }
        const lastKey = parts[parts.length - 1];
        // Try to parse as number
        const numVal = Number(value);
        obj[lastKey] = isNaN(numVal) ? value : numVal;
        return updated;
      });

      // Persist to Firestore via a PATCH to ai-summary would be ideal,
      // but for now we just update locally
      setEditingField(null);
    } catch {
      // Revert would go here
    }
  }, []);

  const photoById = (id: string) => photos.find((p) => p.id === id);

  // Group classified photos by category
  const photosByCategory = classifiedPhotos.reduce<Record<string, ClassifiedPhoto[]>>(
    (acc, cp) => {
      const cat = cp.classification;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(cp);
      return acc;
    },
    {}
  );

  const isProcessing = stage === "classifying" || stage === "extracting";

  return (
    <div className="space-y-6">
      {/* Action buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={processPhotos}
          disabled={isProcessing || photos.length === 0}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
        >
          {isProcessing ? "Processing..." : stage === "done" ? "Reprocess Photos" : "Process Photos"}
        </button>

        {hasSnuggpro && summary && (
          <button
            onClick={pushToSnuggpro}
            disabled={pushing}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            {pushing ? "Pushing..." : "Push to SnuggPro"}
          </button>
        )}

        {photos.length === 0 && (
          <span className="text-sm text-gray-500">No photos to process</span>
        )}
      </div>

      {/* Progress bars */}
      {isProcessing && (
        <div className="space-y-3">
          {/* Classification progress */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-700 font-medium">
                {stage === "classifying" ? "Classifying photos..." : "Classification complete"}
              </span>
              <span className="text-gray-500">
                {classifyProgress.current}/{classifyProgress.total}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width: classifyProgress.total > 0
                    ? `${(classifyProgress.current / classifyProgress.total) * 100}%`
                    : "0%",
                }}
              />
            </div>
          </div>

          {/* Extraction progress */}
          {stage === "extracting" && (
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700 font-medium">Extracting data...</span>
                <span className="text-gray-500">
                  {extractProgress.current}/{extractProgress.total}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: extractProgress.total > 0
                      ? `${(extractProgress.current / extractProgress.total) * 100}%`
                      : "0%",
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error message */}
      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {/* Push results */}
      {pushResult && (
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-md text-sm space-y-2">
          {pushResult.pushed.length > 0 && (
            <div className="text-green-700">
              <span className="font-medium">Pushed:</span> {pushResult.pushed.join(", ")}
            </div>
          )}
          {pushResult.errors.length > 0 && (
            <div className="text-red-700">
              <span className="font-medium">Errors:</span>
              <ul className="list-disc list-inside mt-1">
                {pushResult.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Results by category (during processing) */}
      {classifiedPhotos.length > 0 && !summary && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-900">Classified Photos</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(photosByCategory).map(([category, cPhotos]) => (
              <div key={category} className="border border-gray-200 rounded-lg p-3">
                <h4 className="text-sm font-medium text-gray-800 mb-2">
                  {CATEGORY_LABELS[category] || category}
                  <span className="ml-1 text-gray-400">({cPhotos.length})</span>
                </h4>
                <div className="flex gap-2 flex-wrap">
                  {cPhotos.map((cp) => {
                    const photo = photoById(cp.photoId);
                    const extracted = extractedPhotos.find((e) => e.photoId === cp.photoId);
                    return (
                      <div key={cp.photoId} className="relative">
                        <img
                          src={photo?.thumbnailUrl || photo?.url || ""}
                          alt=""
                          className="w-16 h-16 rounded object-cover"
                        />
                        {/* Status icon */}
                        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[10px]">
                          {extracted ? (
                            <span className="bg-green-500 text-white w-4 h-4 rounded-full flex items-center justify-center">✓</span>
                          ) : (
                            <span className="bg-yellow-500 text-white w-4 h-4 rounded-full flex items-center justify-center">…</span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Summary */}
      {summary && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900">AI Summary</h3>
            <span className="text-xs text-gray-400">
              Last processed: {new Date(summary.lastProcessedAt).toLocaleString()}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Blower Door */}
            {summary.blowerDoor && (
              <SummaryCard title="Blower Door">
                <SummaryField
                  label="Pressure (Pa)"
                  value={summary.blowerDoor.pressure_pa}
                  path="blowerDoor.pressure_pa"
                  editingField={editingField}
                  editValue={editValue}
                  setEditingField={setEditingField}
                  setEditValue={setEditValue}
                  onSave={handleEdit}
                />
                <SummaryField
                  label="CFM50"
                  value={summary.blowerDoor.cfm50}
                  path="blowerDoor.cfm50"
                  editingField={editingField}
                  editValue={editValue}
                  setEditingField={setEditingField}
                  setEditValue={setEditValue}
                  onSave={handleEdit}
                />
              </SummaryCard>
            )}

            {/* HVAC */}
            {summary.hvac.length > 0 && (
              <SummaryCard title="HVAC Systems">
                {summary.hvac.map((unit, i) => (
                  <div key={i} className="border-b border-gray-100 pb-2 mb-2 last:border-0 last:pb-0 last:mb-0">
                    <SummaryField label="Manufacturer" value={unit.manufacturer} path={`hvac.${i}.manufacturer`} editingField={editingField} editValue={editValue} setEditingField={setEditingField} setEditValue={setEditValue} onSave={handleEdit} />
                    <SummaryField label="Model" value={unit.model} path={`hvac.${i}.model`} editingField={editingField} editValue={editValue} setEditingField={setEditingField} setEditValue={setEditValue} onSave={handleEdit} />
                    <SummaryField label="SEER" value={unit.seer} path={`hvac.${i}.seer`} editingField={editingField} editValue={editValue} setEditingField={setEditingField} setEditValue={setEditValue} onSave={handleEdit} />
                    <SummaryField label="BTU" value={unit.btu} path={`hvac.${i}.btu`} editingField={editingField} editValue={editValue} setEditingField={setEditingField} setEditValue={setEditValue} onSave={handleEdit} />
                    <SummaryField label="Fuel" value={unit.fuel_type} path={`hvac.${i}.fuel_type`} editingField={editingField} editValue={editValue} setEditingField={setEditingField} setEditValue={setEditValue} onSave={handleEdit} />
                  </div>
                ))}
              </SummaryCard>
            )}

            {/* Water Heater */}
            {summary.waterHeater && (
              <SummaryCard title="Water Heater">
                <SummaryField label="Manufacturer" value={summary.waterHeater.manufacturer} path="waterHeater.manufacturer" editingField={editingField} editValue={editValue} setEditingField={setEditingField} setEditValue={setEditValue} onSave={handleEdit} />
                <SummaryField label="Model" value={summary.waterHeater.model} path="waterHeater.model" editingField={editingField} editValue={editValue} setEditingField={setEditingField} setEditValue={setEditValue} onSave={handleEdit} />
                <SummaryField label="Capacity (gal)" value={summary.waterHeater.capacity} path="waterHeater.capacity" editingField={editingField} editValue={editValue} setEditingField={setEditingField} setEditValue={setEditValue} onSave={handleEdit} />
                <SummaryField label="Fuel" value={summary.waterHeater.fuel_type} path="waterHeater.fuel_type" editingField={editingField} editValue={editValue} setEditingField={setEditingField} setEditValue={setEditValue} onSave={handleEdit} />
              </SummaryCard>
            )}

            {/* Insulation */}
            {summary.insulation && (
              <SummaryCard title="Insulation">
                <SummaryField label="Type" value={summary.insulation.type} path="insulation.type" editingField={editingField} editValue={editValue} setEditingField={setEditingField} setEditValue={setEditValue} onSave={handleEdit} />
                <SummaryField label="Avg Depth (in)" value={summary.insulation.avg_depth_inches} path="insulation.avg_depth_inches" editingField={editingField} editValue={editValue} setEditingField={setEditingField} setEditValue={setEditValue} onSave={handleEdit} />
                <SummaryField label="Condition" value={summary.insulation.condition} path="insulation.condition" editingField={editingField} editValue={editValue} setEditingField={setEditingField} setEditValue={setEditValue} onSave={handleEdit} />
              </SummaryCard>
            )}

            {/* Electrical */}
            {summary.electrical && (
              <SummaryCard title="Electrical Panel">
                <SummaryField label="Max Amperage" value={summary.electrical.max_amperage} path="electrical.max_amperage" editingField={editingField} editValue={editValue} setEditingField={setEditingField} setEditValue={setEditValue} onSave={handleEdit} />
                <SummaryField label="Open Slots" value={summary.electrical.open_slots} path="electrical.open_slots" editingField={editingField} editValue={editValue} setEditingField={setEditingField} setEditValue={setEditValue} onSave={handleEdit} />
              </SummaryCard>
            )}

            {/* Thermostat */}
            {summary.thermostat && (
              <SummaryCard title="Thermostat">
                <SummaryField label="Heating Setpoint" value={summary.thermostat.heating_setpoint} path="thermostat.heating_setpoint" editingField={editingField} editValue={editValue} setEditingField={setEditingField} setEditValue={setEditValue} onSave={handleEdit} />
                <SummaryField label="Cooling Setpoint" value={summary.thermostat.cooling_setpoint} path="thermostat.cooling_setpoint" editingField={editingField} editValue={editValue} setEditingField={setEditingField} setEditValue={setEditValue} onSave={handleEdit} />
              </SummaryCard>
            )}

            {/* Windows */}
            {summary.windows && (
              <SummaryCard title="Windows">
                <SummaryField label="Pane Type" value={summary.windows.pane_type} path="windows.pane_type" editingField={editingField} editValue={editValue} setEditingField={setEditingField} setEditValue={setEditValue} onSave={handleEdit} />
                <SummaryField label="Frame Material" value={summary.windows.frame_material} path="windows.frame_material" editingField={editingField} editValue={editValue} setEditingField={setEditingField} setEditValue={setEditValue} onSave={handleEdit} />
                <SummaryField label="Count" value={summary.windows.count} path="windows.count" editingField={editingField} editValue={editValue} setEditingField={setEditingField} setEditValue={setEditValue} onSave={handleEdit} />
              </SummaryCard>
            )}

            {/* Doors */}
            {summary.doors.length > 0 && (
              <SummaryCard title="Doors">
                {summary.doors.map((door, i) => (
                  <div key={i} className="border-b border-gray-100 pb-2 mb-2 last:border-0 last:pb-0 last:mb-0">
                    <SummaryField label="Material" value={door.material} path={`doors.${i}.material`} editingField={editingField} editValue={editValue} setEditingField={setEditingField} setEditValue={setEditValue} onSave={handleEdit} />
                    <SummaryField label="Storm Door" value={door.has_storm != null ? (door.has_storm ? "Yes" : "No") : undefined} path={`doors.${i}.has_storm`} editingField={editingField} editValue={editValue} setEditingField={setEditingField} setEditValue={setEditValue} onSave={handleEdit} />
                  </div>
                ))}
              </SummaryCard>
            )}

            {/* Walls */}
            {summary.walls && (
              <SummaryCard title="Walls">
                {summary.walls.siding_types && summary.walls.siding_types.length > 0 && (
                  <div className="flex justify-between text-sm py-1">
                    <span className="text-gray-500">Siding Types</span>
                    <span className="text-gray-900">{summary.walls.siding_types.join(", ")}</span>
                  </div>
                )}
                <SummaryField label="Insulation Status" value={summary.walls.insulation_status} path="walls.insulation_status" editingField={editingField} editValue={editValue} setEditingField={setEditingField} setEditValue={setEditValue} onSave={handleEdit} />
              </SummaryCard>
            )}

            {/* Appliances */}
            {summary.appliances.length > 0 && (
              <SummaryCard title="Appliances">
                {summary.appliances.map((app, i) => (
                  <div key={i} className="border-b border-gray-100 pb-2 mb-2 last:border-0 last:pb-0 last:mb-0">
                    <SummaryField label="Type" value={app.type} path={`appliances.${i}.type`} editingField={editingField} editValue={editValue} setEditingField={setEditingField} setEditValue={setEditValue} onSave={handleEdit} />
                    <SummaryField label="Manufacturer" value={app.manufacturer} path={`appliances.${i}.manufacturer`} editingField={editingField} editValue={editValue} setEditingField={setEditingField} setEditValue={setEditValue} onSave={handleEdit} />
                    <SummaryField label="Model" value={app.model} path={`appliances.${i}.model`} editingField={editingField} editValue={editValue} setEditingField={setEditingField} setEditValue={setEditValue} onSave={handleEdit} />
                  </div>
                ))}
              </SummaryCard>
            )}

            {/* Lighting */}
            {summary.lighting && (
              <SummaryCard title="Lighting">
                <SummaryField label="Incandescent" value={summary.lighting.incandescent} path="lighting.incandescent" editingField={editingField} editValue={editValue} setEditingField={setEditingField} setEditValue={setEditValue} onSave={handleEdit} />
                <SummaryField label="CFL" value={summary.lighting.cfl} path="lighting.cfl" editingField={editingField} editValue={editValue} setEditingField={setEditingField} setEditValue={setEditValue} onSave={handleEdit} />
                <SummaryField label="LED" value={summary.lighting.led} path="lighting.led" editingField={editingField} editValue={editValue} setEditingField={setEditingField} setEditValue={setEditValue} onSave={handleEdit} />
              </SummaryCard>
            )}
          </div>

          {/* Show "no data" if summary is empty */}
          {!summary.blowerDoor && summary.hvac.length === 0 && !summary.waterHeater && !summary.insulation && !summary.electrical && !summary.thermostat && !summary.windows && summary.doors.length === 0 && !summary.walls && summary.appliances.length === 0 && !summary.lighting && (
            <p className="text-sm text-gray-500 text-center py-4">
              No structured data was extracted from the photos. The photos may not contain readable equipment data.
            </p>
          )}
        </div>
      )}

      {/* Idle state */}
      {stage === "idle" && !summary && (
        <div className="text-center py-8">
          <p className="text-sm text-gray-500">
            Click &quot;Process Photos&quot; to analyze {photos.length} photos with AI vision models.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Photos will be classified and equipment data extracted automatically.
          </p>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <h4 className="text-sm font-medium text-gray-900 mb-3">{title}</h4>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function SummaryField({
  label,
  value,
  path,
  editingField,
  editValue,
  setEditingField,
  setEditValue,
  onSave,
}: {
  label: string;
  value: string | number | undefined;
  path: string;
  editingField: string | null;
  editValue: string;
  setEditingField: (f: string | null) => void;
  setEditValue: (v: string) => void;
  onSave: (path: string, value: string) => void;
}) {
  if (value === undefined || value === null) return null;

  const isEditing = editingField === path;

  return (
    <div className="flex justify-between items-center text-sm py-1 group">
      <span className="text-gray-500">{label}</span>
      {isEditing ? (
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSave(path, editValue);
              if (e.key === "Escape") setEditingField(null);
            }}
            className="w-32 px-1.5 py-0.5 text-sm border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            autoFocus
          />
          <button
            onClick={() => onSave(path, editValue)}
            className="text-blue-600 hover:text-blue-800 text-xs"
          >
            Save
          </button>
          <button
            onClick={() => setEditingField(null)}
            className="text-gray-400 hover:text-gray-600 text-xs"
          >
            Cancel
          </button>
        </div>
      ) : (
        <span
          className="text-gray-900 cursor-pointer hover:text-blue-600 transition-colors"
          onClick={() => {
            setEditingField(path);
            setEditValue(String(value));
          }}
          title="Click to edit"
        >
          {String(value)}
        </span>
      )}
    </div>
  );
}
