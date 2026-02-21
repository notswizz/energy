"use client";

import { useState, useCallback } from "react";
import type {
  ExtractedData,
  ExtractedHvacSystem,
  ExtractedDhwSystem,
  ExtractedAtticSection,
  ExtractedWallSection,
  ExtractedWindowConfig,
  ExtractedDoor,
  ExtractedHealthSafety,
  FieldConfidence,
  ExtractionStatus,
} from "@/src/types";

interface Props {
  jobId: string;
  extractedData: ExtractedData | null;
  extractionStatus: ExtractionStatus | null;
  hasSnuggpro: boolean;
  snuggproId?: string;
}

// ---- Field definitions for each section ----

interface FieldDef {
  key: string;
  label: string;
  type: "number" | "text" | "boolean" | "select";
  options?: string[];
  suffix?: string;
}

const BUILDING_FIELDS: FieldDef[] = [
  { key: "yearBuilt", label: "Year Built", type: "number" },
  { key: "conditionedArea", label: "Conditioned Area", type: "number", suffix: "sqft" },
  { key: "avgWallHeight", label: "Avg Wall Height", type: "number", suffix: "ft" },
  { key: "floorsAboveGrade", label: "Floors Above Grade", type: "number" },
  { key: "numOccupants", label: "Full-time Occupants", type: "number" },
  { key: "numBedrooms", label: "Bedrooms", type: "number" },
  { key: "typeOfHome", label: "Type of Home", type: "text" },
  { key: "frontOrientation", label: "Front Door Direction", type: "select", options: ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] },
];

const FOUNDATION_FIELDS: FieldDef[] = [
  { key: "foundationBasementPct", label: "Basement %", type: "number", suffix: "%" },
  { key: "foundationCrawlPct", label: "Crawlspace %", type: "number", suffix: "%" },
  { key: "foundationSlabPct", label: "Slab %", type: "number", suffix: "%" },
  { key: "foundationAboveGradeHeight", label: "Above Grade Height", type: "number", suffix: "ft" },
  { key: "basementWallInsulation", label: "Basement Wall Insulation", type: "text" },
  { key: "basementHeating", label: "Basement Heating", type: "boolean" },
  { key: "basementCooling", label: "Basement Cooling", type: "boolean" },
];

const THERMOSTAT_FIELDS: FieldDef[] = [
  { key: "heatingSetpointHigh", label: "Heating Setpoint (High)", type: "number", suffix: "°F" },
  { key: "heatingSetpointLow", label: "Heating Setpoint (Low)", type: "number", suffix: "°F" },
  { key: "coolingSetpointLow", label: "Cooling Setpoint (Low)", type: "number", suffix: "°F" },
  { key: "coolingSetpointHigh", label: "Cooling Setpoint (High)", type: "number", suffix: "°F" },
  { key: "thermostatManufacturer", label: "Manufacturer", type: "text" },
];

const APPLIANCE_FIELDS: FieldDef[] = [
  { key: "rangeFuelType", label: "Range Fuel", type: "select", options: ["Natural Gas", "Electricity", "Propane"] },
  { key: "rangeManufacturer", label: "Range Manufacturer", type: "text" },
  { key: "ovenFuelType", label: "Oven Fuel", type: "select", options: ["Natural Gas", "Electricity", "Propane"] },
  { key: "dryerFuelType", label: "Dryer Fuel", type: "select", options: ["Natural Gas", "Electricity", "Propane"] },
  { key: "dryerManufacturer", label: "Dryer Manufacturer", type: "text" },
  { key: "washerType", label: "Washer Type", type: "text" },
  { key: "washerEnergyStar", label: "Washer Energy Star", type: "boolean" },
  { key: "dishwasherInstalled", label: "Dishwasher Installed", type: "boolean" },
  { key: "dishwasherEnergyStar", label: "Dishwasher Energy Star", type: "boolean" },
  { key: "refrigeratorAge", label: "Refrigerator Age", type: "number", suffix: "yrs" },
  { key: "refrigeratorSizeCf", label: "Refrigerator Size", type: "number", suffix: "cf" },
  { key: "refrigeratorEnergyStar", label: "Refrigerator Energy Star", type: "boolean" },
];

const AIR_LEAKAGE_FIELDS: FieldDef[] = [
  { key: "blowerDoorTestPerformed", label: "Blower Door Test Performed", type: "boolean" },
  { key: "blowerDoorCfm50", label: "Blower Door Reading", type: "number", suffix: "CFM50" },
];

const PANEL_FIELDS: FieldDef[] = [
  { key: "panelMaxAmps", label: "Max Amperage", type: "number", suffix: "A" },
  { key: "panelOpenSpots", label: "Open Breaker Spots", type: "number" },
];

const LIGHTING_FIELDS: FieldDef[] = [
  { key: "pctCflsOrLeds", label: "% CFLs/LEDs", type: "select", options: ["0-25%", "26-50%", "51-75%", "76-100%"] },
  { key: "totalLightBulbs", label: "Total Light Bulbs", type: "number" },
];

const MISC_FIELDS: FieldDef[] = [
  { key: "hasPv", label: "Solar PV", type: "boolean" },
  { key: "hasPool", label: "Swimming Pool", type: "boolean" },
  { key: "hasHotTub", label: "Hot Tub", type: "boolean" },
  { key: "hasEv", label: "Electric Vehicle", type: "boolean" },
];

const HVAC_FIELDS: FieldDef[] = [
  { key: "manufacturer", label: "Manufacturer", type: "text" },
  { key: "modelNumber", label: "Model Number", type: "text" },
  { key: "systemType", label: "System Type", type: "text" },
  { key: "fuelType", label: "Fuel Type", type: "select", options: ["Natural Gas", "Electricity", "Propane", "Fuel Oil"] },
  { key: "seer", label: "SEER", type: "number" },
  { key: "hspf", label: "HSPF", type: "number" },
  { key: "afue", label: "AFUE", type: "number", suffix: "%" },
  { key: "btuInput", label: "BTU Input", type: "number" },
  { key: "tonnage", label: "Tonnage", type: "number", suffix: "ton" },
  { key: "yearManufactured", label: "Year Manufactured", type: "number" },
];

const DHW_FIELDS: FieldDef[] = [
  { key: "type", label: "Type", type: "select", options: ["Tank", "Tankless", "Heat Pump"] },
  { key: "fuelType", label: "Fuel Type", type: "select", options: ["Natural Gas", "Electricity", "Propane"] },
  { key: "manufacturer", label: "Manufacturer", type: "text" },
  { key: "modelNumber", label: "Model Number", type: "text" },
  { key: "capacityGallons", label: "Tank Size", type: "number", suffix: "gal" },
  { key: "energyFactor", label: "Energy Factor", type: "number" },
  { key: "uef", label: "UEF", type: "number" },
  { key: "ageRange", label: "Age Range", type: "select", options: ["0-5", "6-10", "11-15", "16+"] },
  { key: "location", label: "Location", type: "select", options: ["Indoors", "Garage", "Outdoors", "Basement", "Closet"] },
  { key: "tankWrap", label: "Tank Wrap", type: "boolean" },
  { key: "pipeWrap", label: "Pipe Wrap", type: "boolean" },
];

const HEALTH_FIELDS: FieldDef[] = [
  { key: "ambientCo", label: "Ambient CO", type: "number", suffix: "ppm" },
  { key: "naturalConditionSpillage", label: "Natural Condition Spillage", type: "text" },
  { key: "worstCaseDepressurization", label: "Worst Case Depressurization", type: "text" },
  { key: "worstCaseSpillage", label: "Worst Case Spillage", type: "text" },
  { key: "undilutedFlueCo", label: "Undiluted Flue CO", type: "number", suffix: "ppm" },
  { key: "draftPressure", label: "Draft Pressure", type: "number", suffix: "Pa" },
  { key: "gasLeak", label: "Gas Leak", type: "text" },
  { key: "venting", label: "Venting", type: "text" },
  { key: "moldMoisture", label: "Mold/Moisture", type: "text" },
  { key: "radon", label: "Radon", type: "text" },
  { key: "asbestos", label: "Asbestos", type: "text" },
  { key: "lead", label: "Lead", type: "text" },
  { key: "roofCondition", label: "Roof Condition", type: "text" },
  { key: "drainageCondition", label: "Drainage Condition", type: "text" },
];

// ---- Confidence badge ----

const CONFIDENCE_STYLES: Record<FieldConfidence, { dot: string; label: string }> = {
  high: { dot: "bg-green-400", label: "High" },
  medium: { dot: "bg-yellow-400", label: "Medium" },
  low: { dot: "bg-red-400", label: "Low" },
  missing: { dot: "bg-gray-300", label: "Missing" },
};

const SOURCE_LABELS: Record<string, string> = {
  text_parse: "PDF",
  ai_vision: "AI",
  manual_edit: "Manual",
};

function ConfidenceDot({ confidence }: { confidence: FieldConfidence }) {
  const style = CONFIDENCE_STYLES[confidence];
  return (
    <span className="relative group">
      <span className={`inline-block w-2 h-2 rounded-full ${style.dot}`} />
      <span className="absolute -top-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-gray-900 text-white text-[9px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        {style.label}
      </span>
    </span>
  );
}

// ---- Status banner ----

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string; icon: string }> = {
  uploaded: { bg: "bg-blue-50 border-blue-200", text: "text-blue-800", label: "PDF Uploaded — processing needed", icon: "M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" },
  extracted: { bg: "bg-amber-50 border-amber-200", text: "text-amber-800", label: "Data Extracted — ready for review", icon: "M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" },
  reviewed: { bg: "bg-green-50 border-green-200", text: "text-green-800", label: "Reviewed — ready to push to SnuggPro", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
  submitted: { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-800", label: "Pushed to SnuggPro", icon: "M5 13l4 4L19 7" },
  error: { bg: "bg-red-50 border-red-200", text: "text-red-800", label: "Push Error — check and retry", icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" },
};

// ---- Main component ----

export function ReviewTab({ jobId, extractedData, extractionStatus, hasSnuggpro, snuggproId }: Props) {
  const [data, setData] = useState<ExtractedData | null>(extractedData);
  const [saving, setSaving] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [pushResult, setPushResult] = useState<{ pushed: string[]; errors: string[] } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["building", "hvac", "dhw", "health"]));

  const toggleSection = useCallback((name: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  // Update a scalar field
  const updateField = useCallback((key: string, value: unknown) => {
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [key]: value,
        fieldConfidence: { ...prev.fieldConfidence, [key]: "high" as FieldConfidence },
        fieldSource: { ...prev.fieldSource, [key]: "manual_edit" },
      };
    });
    setDirty(true);
  }, []);

  // Update an array item field
  const updateArrayField = useCallback((
    arrayKey: keyof ExtractedData,
    index: number,
    fieldKey: string,
    value: unknown
  ) => {
    setData((prev) => {
      if (!prev) return prev;
      const arr = [...(prev[arrayKey] as unknown[] || [])];
      arr[index] = { ...(arr[index] as Record<string, unknown>), [fieldKey]: value };
      return {
        ...prev,
        [arrayKey]: arr,
        fieldConfidence: { ...prev.fieldConfidence, [`${String(arrayKey)}[${index}].${fieldKey}`]: "high" as FieldConfidence },
        fieldSource: { ...prev.fieldSource, [`${String(arrayKey)}[${index}].${fieldKey}`]: "manual_edit" },
      };
    });
    setDirty(true);
  }, []);

  // Update health safety field
  const updateHealthField = useCallback((fieldKey: string, value: unknown) => {
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        healthSafety: { ...prev.healthSafety, [fieldKey]: value },
        fieldConfidence: { ...prev.fieldConfidence, [`healthSafety.${fieldKey}`]: "high" as FieldConfidence },
        fieldSource: { ...prev.fieldSource, [`healthSafety.${fieldKey}`]: "manual_edit" },
      };
    });
    setDirty(true);
  }, []);

  // Add array item
  const addArrayItem = useCallback((arrayKey: keyof ExtractedData) => {
    setData((prev) => {
      if (!prev) return prev;
      const arr = [...(prev[arrayKey] as unknown[] || [])];
      arr.push({});
      return { ...prev, [arrayKey]: arr };
    });
    setDirty(true);
  }, []);

  // Remove array item
  const removeArrayItem = useCallback((arrayKey: keyof ExtractedData, index: number) => {
    setData((prev) => {
      if (!prev) return prev;
      const arr = [...(prev[arrayKey] as unknown[] || [])];
      arr.splice(index, 1);
      return { ...prev, [arrayKey]: arr };
    });
    setDirty(true);
  }, []);

  // Save changes
  const saveChanges = useCallback(async () => {
    if (!data) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/extracted-data`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extractedData: data }),
      });
      if (res.ok) {
        setDirty(false);
      }
    } catch {
      // Error handled silently
    } finally {
      setSaving(false);
    }
  }, [data, jobId]);

  // Push to SnuggPro
  const pushToSnuggPro = useCallback(async () => {
    setPushing(true);
    setPushResult(null);
    try {
      // Save first if dirty
      if (dirty && data) {
        await fetch(`/api/jobs/${jobId}/extracted-data`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ extractedData: data }),
        });
        setDirty(false);
      }

      const res = await fetch(`/api/jobs/${jobId}/push-to-snuggpro`, { method: "POST" });
      const result = await res.json();
      setPushResult(result);
    } catch (err) {
      setPushResult({ pushed: [], errors: [err instanceof Error ? err.message : "Push failed"] });
    } finally {
      setPushing(false);
    }
  }, [jobId, dirty, data]);

  if (!data) {
    return (
      <div className="p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-gray-900">No extracted data yet</h3>
        <p className="text-xs text-gray-500 mt-1">Upload a CompanyCam checklist PDF to extract data for review.</p>
      </div>
    );
  }

  const status = STATUS_CONFIG[extractionStatus || "extracted"];

  // Count filled vs total fields
  const allFieldKeys = [
    ...BUILDING_FIELDS, ...FOUNDATION_FIELDS, ...THERMOSTAT_FIELDS,
    ...APPLIANCE_FIELDS, ...AIR_LEAKAGE_FIELDS, ...PANEL_FIELDS,
    ...LIGHTING_FIELDS, ...MISC_FIELDS,
  ].map((f) => f.key);

  const filledCount = allFieldKeys.filter((k) => {
    const val = (data as unknown as Record<string, unknown>)[k];
    return val !== undefined && val !== null && val !== "";
  }).length;

  const confidenceCounts = {
    high: Object.values(data.fieldConfidence).filter((v) => v === "high").length,
    medium: Object.values(data.fieldConfidence).filter((v) => v === "medium").length,
    low: Object.values(data.fieldConfidence).filter((v) => v === "low").length,
  };

  return (
    <div className="space-y-4">
      {/* Status banner */}
      {status && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${status.bg}`}>
          <svg className={`w-5 h-5 ${status.text} flex-shrink-0`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={status.icon} />
          </svg>
          <span className={`text-sm font-medium ${status.text}`}>{status.label}</span>
        </div>
      )}

      {/* Summary bar */}
      <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
        <div className="flex items-center gap-4 text-xs">
          <span className="font-medium text-gray-700">{filledCount}/{allFieldKeys.length} fields filled</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400" /> {confidenceCounts.high} high</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400" /> {confidenceCounts.medium} medium</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" /> {confidenceCounts.low} low</span>
        </div>
        <div className="flex items-center gap-2">
          {dirty && (
            <button
              onClick={saveChanges}
              disabled={saving}
              className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          )}
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-2">
        <SectionCard title="Building" icon="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          expanded={expandedSections.has("building")} onToggle={() => toggleSection("building")}
          fieldCount={countFilled(data, BUILDING_FIELDS)} totalFields={BUILDING_FIELDS.length}>
          <FieldGrid fields={BUILDING_FIELDS} data={data} onChange={updateField} />
        </SectionCard>

        <SectionCard title="Foundation" icon="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5"
          expanded={expandedSections.has("foundation")} onToggle={() => toggleSection("foundation")}
          fieldCount={countFilled(data, FOUNDATION_FIELDS)} totalFields={FOUNDATION_FIELDS.length}>
          <FieldGrid fields={FOUNDATION_FIELDS} data={data} onChange={updateField} />
        </SectionCard>

        <SectionCard title="Thermostat" icon="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707"
          expanded={expandedSections.has("thermostat")} onToggle={() => toggleSection("thermostat")}
          fieldCount={countFilled(data, THERMOSTAT_FIELDS)} totalFields={THERMOSTAT_FIELDS.length}>
          <FieldGrid fields={THERMOSTAT_FIELDS} data={data} onChange={updateField} />
        </SectionCard>

        <SectionCard title="Appliances" icon="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
          expanded={expandedSections.has("appliances")} onToggle={() => toggleSection("appliances")}
          fieldCount={countFilled(data, APPLIANCE_FIELDS)} totalFields={APPLIANCE_FIELDS.length}>
          <FieldGrid fields={APPLIANCE_FIELDS} data={data} onChange={updateField} />
        </SectionCard>

        {/* HVAC Systems (array) */}
        <SectionCard title={`HVAC Systems (${data.hvacSystems?.length || 0})`}
          icon="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          expanded={expandedSections.has("hvac")} onToggle={() => toggleSection("hvac")}
          fieldCount={data.hvacSystems?.length || 0} totalFields={0} isArray
          onAdd={() => addArrayItem("hvacSystems")}>
          {(data.hvacSystems || []).map((sys, i) => (
            <ArrayItemCard key={i} index={i} label={`HVAC System ${i + 1}`}
              subtitle={sys.manufacturer || sys.systemType || "Unknown"}
              onRemove={() => removeArrayItem("hvacSystems", i)}>
              <FieldGrid fields={HVAC_FIELDS}
                data={{ ...sys, fieldConfidence: data.fieldConfidence, fieldSource: data.fieldSource } as unknown as ExtractedData}
                onChange={(key, val) => updateArrayField("hvacSystems", i, key, val)}
                prefix={`hvacSystems[${i}]`} />
            </ArrayItemCard>
          ))}
        </SectionCard>

        {/* DHW Systems (array) */}
        <SectionCard title={`Water Heater (${data.dhwSystems?.length || 0})`}
          icon="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"
          expanded={expandedSections.has("dhw")} onToggle={() => toggleSection("dhw")}
          fieldCount={data.dhwSystems?.length || 0} totalFields={0} isArray
          onAdd={() => addArrayItem("dhwSystems")}>
          {(data.dhwSystems || []).map((sys, i) => (
            <ArrayItemCard key={i} index={i} label={`Water Heater ${i + 1}`}
              subtitle={sys.manufacturer || sys.type || "Unknown"}
              onRemove={() => removeArrayItem("dhwSystems", i)}>
              <FieldGrid fields={DHW_FIELDS}
                data={{ ...sys, fieldConfidence: data.fieldConfidence, fieldSource: data.fieldSource } as unknown as ExtractedData}
                onChange={(key, val) => updateArrayField("dhwSystems", i, key, val)}
                prefix={`dhwSystems[${i}]`} />
            </ArrayItemCard>
          ))}
        </SectionCard>

        {/* Attic, Walls, Windows, Doors */}
        <SectionCard title={`Attic (${data.atticSections?.length || 0})`}
          icon="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3"
          expanded={expandedSections.has("attic")} onToggle={() => toggleSection("attic")}
          fieldCount={data.atticSections?.length || 0} totalFields={0} isArray
          onAdd={() => addArrayItem("atticSections")}>
          {(data.atticSections || []).map((sec, i) => (
            <ArrayItemCard key={i} index={i} label={`Attic Section ${i + 1}`}
              subtitle={sec.insulationType || ""}
              onRemove={() => removeArrayItem("atticSections", i)}>
              <div className="grid grid-cols-2 gap-2">
                <ReviewInput label="Insulation Type" value={sec.insulationType} onChange={(v) => updateArrayField("atticSections", i, "insulationType", v)} />
                <ReviewInput label="Depth" value={sec.depthInches} type="number" suffix="in" onChange={(v) => updateArrayField("atticSections", i, "depthInches", v ? Number(v) : undefined)} />
                <ReviewInput label="Depth Range" value={sec.depthRange} onChange={(v) => updateArrayField("atticSections", i, "depthRange", v)} />
                <ReviewInput label="Condition" value={sec.condition} onChange={(v) => updateArrayField("atticSections", i, "condition", v)} />
                <ReviewInput label="Coverage %" value={sec.coveragePct} type="number" suffix="%" onChange={(v) => updateArrayField("atticSections", i, "coveragePct", v ? Number(v) : undefined)} />
              </div>
            </ArrayItemCard>
          ))}
        </SectionCard>

        <SectionCard title={`Walls (${data.wallSections?.length || 0})`}
          icon="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5z"
          expanded={expandedSections.has("walls")} onToggle={() => toggleSection("walls")}
          fieldCount={data.wallSections?.length || 0} totalFields={0} isArray
          onAdd={() => addArrayItem("wallSections")}>
          {(data.wallSections || []).map((sec, i) => (
            <ArrayItemCard key={i} index={i} label={`Wall Section ${i + 1}`}
              subtitle={sec.siding || ""}
              onRemove={() => removeArrayItem("wallSections", i)}>
              <div className="grid grid-cols-2 gap-2">
                <ReviewInput label="Insulated" value={sec.insulated} onChange={(v) => updateArrayField("wallSections", i, "insulated", v)} />
                <ReviewInput label="Insulation Type" value={sec.insulationType} onChange={(v) => updateArrayField("wallSections", i, "insulationType", v)} />
                <ReviewInput label="Siding" value={sec.siding} onChange={(v) => updateArrayField("wallSections", i, "siding", v)} />
                <ReviewInput label="Construction" value={sec.construction} onChange={(v) => updateArrayField("wallSections", i, "construction", v)} />
              </div>
            </ArrayItemCard>
          ))}
        </SectionCard>

        <SectionCard title={`Windows (${data.windowConfigs?.length || 0})`}
          icon="M4 6h16M4 10h16M4 14h16M4 18h16"
          expanded={expandedSections.has("windows")} onToggle={() => toggleSection("windows")}
          fieldCount={data.windowConfigs?.length || 0} totalFields={0} isArray
          onAdd={() => addArrayItem("windowConfigs")}>
          {(data.windowConfigs || []).map((cfg, i) => (
            <ArrayItemCard key={i} index={i} label={`Window Config ${i + 1}`}
              subtitle={cfg.paneType || ""}
              onRemove={() => removeArrayItem("windowConfigs", i)}>
              <div className="grid grid-cols-2 gap-2">
                <ReviewInput label="Pane Type" value={cfg.paneType} onChange={(v) => updateArrayField("windowConfigs", i, "paneType", v)} />
                <ReviewInput label="Frame Material" value={cfg.frameMaterial} onChange={(v) => updateArrayField("windowConfigs", i, "frameMaterial", v)} />
                <ReviewBool label="Storm Window" value={cfg.stormWindow} onChange={(v) => updateArrayField("windowConfigs", i, "stormWindow", v)} />
                <ReviewBool label="Low-E" value={cfg.lowE} onChange={(v) => updateArrayField("windowConfigs", i, "lowE", v)} />
              </div>
            </ArrayItemCard>
          ))}
        </SectionCard>

        <SectionCard title={`Doors (${data.doors?.length || 0})`}
          icon="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4"
          expanded={expandedSections.has("doors")} onToggle={() => toggleSection("doors")}
          fieldCount={data.doors?.length || 0} totalFields={0} isArray
          onAdd={() => addArrayItem("doors")}>
          {(data.doors || []).map((door, i) => (
            <ArrayItemCard key={i} index={i} label={`Door ${i + 1}`}
              subtitle={door.material || ""}
              onRemove={() => removeArrayItem("doors", i)}>
              <div className="grid grid-cols-2 gap-2">
                <ReviewInput label="Material" value={door.material} onChange={(v) => updateArrayField("doors", i, "material", v)} />
                <ReviewBool label="Storm Door" value={door.hasStormDoor} onChange={(v) => updateArrayField("doors", i, "hasStormDoor", v)} />
              </div>
            </ArrayItemCard>
          ))}
        </SectionCard>

        <SectionCard title="Air Leakage" icon="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          expanded={expandedSections.has("air")} onToggle={() => toggleSection("air")}
          fieldCount={countFilled(data, AIR_LEAKAGE_FIELDS)} totalFields={AIR_LEAKAGE_FIELDS.length}>
          <FieldGrid fields={AIR_LEAKAGE_FIELDS} data={data} onChange={updateField} />
        </SectionCard>

        <SectionCard title="Electrical Panel" icon="M13 10V3L4 14h7v7l9-11h-7z"
          expanded={expandedSections.has("panel")} onToggle={() => toggleSection("panel")}
          fieldCount={countFilled(data, PANEL_FIELDS)} totalFields={PANEL_FIELDS.length}>
          <FieldGrid fields={PANEL_FIELDS} data={data} onChange={updateField} />
        </SectionCard>

        <SectionCard title="Lighting" icon="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          expanded={expandedSections.has("lighting")} onToggle={() => toggleSection("lighting")}
          fieldCount={countFilled(data, LIGHTING_FIELDS)} totalFields={LIGHTING_FIELDS.length}>
          <FieldGrid fields={LIGHTING_FIELDS} data={data} onChange={updateField} />
        </SectionCard>

        <SectionCard title="Misc" icon="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
          expanded={expandedSections.has("misc")} onToggle={() => toggleSection("misc")}
          fieldCount={countFilled(data, MISC_FIELDS)} totalFields={MISC_FIELDS.length}>
          <FieldGrid fields={MISC_FIELDS} data={data} onChange={updateField} />
        </SectionCard>

        <SectionCard title="Health & Safety" icon="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          expanded={expandedSections.has("health")} onToggle={() => toggleSection("health")}
          fieldCount={countHealthFilled(data.healthSafety)} totalFields={HEALTH_FIELDS.length}>
          <div className="grid grid-cols-2 gap-2">
            {HEALTH_FIELDS.map((field) => (
              <ReviewInput
                key={field.key}
                label={field.label}
                value={(data.healthSafety as Record<string, unknown>)?.[field.key] as string | number | undefined}
                type={field.type === "number" ? "number" : "text"}
                suffix={field.suffix}
                confidence={data.fieldConfidence[`healthSafety.${field.key}`]}
                source={data.fieldSource[`healthSafety.${field.key}`]}
                onChange={(v) => updateHealthField(field.key, field.type === "number" ? (v ? Number(v) : undefined) : v)}
              />
            ))}
          </div>
        </SectionCard>

        {/* Concerns */}
        {(data.concernsSummary || data.concernsDetail) && (
          <SectionCard title="Notes & Concerns" icon="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            expanded={expandedSections.has("concerns")} onToggle={() => toggleSection("concerns")}
            fieldCount={1} totalFields={1}>
            <div className="space-y-2">
              <ReviewInput label="Summary" value={data.concernsSummary} onChange={(v) => updateField("concernsSummary", v)} />
              <ReviewInput label="Details" value={data.concernsDetail} onChange={(v) => updateField("concernsDetail", v)} />
            </div>
          </SectionCard>
        )}
      </div>

      {/* Push to SnuggPro */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 -mx-4 px-4 py-4 mt-4 space-y-3">
        {pushResult && (
          <div className={`rounded-lg p-3 text-xs ${pushResult.errors.length > 0 ? "bg-amber-50 border border-amber-200" : "bg-green-50 border border-green-200"}`}>
            {pushResult.pushed.length > 0 && (
              <div className="mb-1">
                <span className="font-medium text-green-800">Pushed:</span>{" "}
                <span className="text-green-700">{pushResult.pushed.join(", ")}</span>
              </div>
            )}
            {pushResult.errors.length > 0 && (
              <div>
                <span className="font-medium text-red-800">Errors:</span>{" "}
                <span className="text-red-700">{pushResult.errors.join("; ")}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-3">
          {dirty && (
            <button
              onClick={saveChanges}
              disabled={saving}
              className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 disabled:bg-gray-100 transition-colors"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          )}
          <button
            onClick={pushToSnuggPro}
            disabled={pushing}
            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
          >
            {pushing ? "Pushing..." : hasSnuggpro ? "Push to SnuggPro" : "Create & Push to SnuggPro"}
          </button>
        </div>
        {!hasSnuggpro && (
          <p className="text-[10px] text-gray-500 text-center">A new SnuggPro job will be created automatically</p>
        )}
      </div>
    </div>
  );
}

// ---- Sub-components ----

function SectionCard({ title, icon, expanded, onToggle, fieldCount, totalFields, isArray, onAdd, children }: {
  title: string;
  icon: string;
  expanded: boolean;
  onToggle: () => void;
  fieldCount: number;
  totalFields: number;
  isArray?: boolean;
  onAdd?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between transition-colors text-left"
      >
        <div className="flex items-center gap-2.5">
          <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
          </svg>
          <span className="text-sm font-semibold text-gray-900">{title}</span>
          {!isArray && (
            <span className="text-[10px] text-gray-400 font-medium">{fieldCount}/{totalFields}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isArray && onAdd && (
            <span
              onClick={(e) => { e.stopPropagation(); onAdd(); }}
              className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 cursor-pointer font-medium"
            >
              + Add
            </span>
          )}
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      {expanded && <div className="px-4 py-3 bg-white">{children}</div>}
    </div>
  );
}

function ArrayItemCard({ index, label, subtitle, onRemove, children }: {
  index: number;
  label: string;
  subtitle?: string;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className={`${index > 0 ? "mt-3 pt-3 border-t border-gray-100" : ""}`}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="text-xs font-semibold text-gray-800">{label}</span>
          {subtitle && <span className="text-[10px] text-gray-500 ml-2">{subtitle}</span>}
        </div>
        <button onClick={onRemove} className="text-[10px] text-red-500 hover:text-red-700 font-medium">Remove</button>
      </div>
      {children}
    </div>
  );
}

function FieldGrid({ fields, data, onChange, prefix }: {
  fields: FieldDef[];
  data: ExtractedData;
  onChange: (key: string, value: unknown) => void;
  prefix?: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {fields.map((field) => {
        const val = (data as unknown as Record<string, unknown>)[field.key];
        const confKey = prefix ? `${prefix}.${field.key}` : field.key;
        const confidence = data.fieldConfidence?.[confKey];
        const source = data.fieldSource?.[confKey];

        if (field.type === "boolean") {
          return (
            <ReviewBool
              key={field.key}
              label={field.label}
              value={val as boolean | undefined}
              confidence={confidence}
              source={source}
              onChange={(v) => onChange(field.key, v)}
            />
          );
        }

        if (field.type === "select") {
          return (
            <ReviewSelect
              key={field.key}
              label={field.label}
              value={val as string | undefined}
              options={field.options || []}
              confidence={confidence}
              source={source}
              onChange={(v) => onChange(field.key, v)}
            />
          );
        }

        return (
          <ReviewInput
            key={field.key}
            label={field.label}
            value={val as string | number | undefined}
            type={field.type === "number" ? "number" : "text"}
            suffix={field.suffix}
            confidence={confidence}
            source={source}
            onChange={(v) => onChange(field.key, field.type === "number" ? (v ? Number(v) : undefined) : v)}
          />
        );
      })}
    </div>
  );
}

function ReviewInput({ label, value, type = "text", suffix, confidence, source, onChange }: {
  label: string;
  value: string | number | undefined;
  type?: "text" | "number";
  suffix?: string;
  confidence?: FieldConfidence;
  source?: string;
  onChange: (value: string | undefined) => void;
}) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1.5">
        {confidence && <ConfidenceDot confidence={confidence} />}
        <label className="text-[10px] font-medium text-gray-500">{label}</label>
        {source && <span className="text-[9px] text-gray-400">{SOURCE_LABELS[source] || source}</span>}
      </div>
      <div className="flex items-center">
        <input
          type={type}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || undefined)}
          className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-400 focus:border-blue-400 outline-none bg-white"
          placeholder="—"
        />
        {suffix && <span className="text-[10px] text-gray-400 ml-1 flex-shrink-0">{suffix}</span>}
      </div>
    </div>
  );
}

function ReviewBool({ label, value, confidence, source, onChange }: {
  label: string;
  value: boolean | undefined;
  confidence?: FieldConfidence;
  source?: string;
  onChange: (value: boolean | undefined) => void;
}) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1.5">
        {confidence && <ConfidenceDot confidence={confidence} />}
        <label className="text-[10px] font-medium text-gray-500">{label}</label>
        {source && <span className="text-[9px] text-gray-400">{SOURCE_LABELS[source] || source}</span>}
      </div>
      <div className="flex gap-1">
        {[true, false, undefined].map((opt) => (
          <button
            key={String(opt)}
            onClick={() => onChange(opt)}
            className={`px-2.5 py-1 text-[10px] rounded-md border transition-colors ${
              value === opt
                ? opt === true ? "bg-green-100 border-green-300 text-green-800 font-medium"
                  : opt === false ? "bg-red-100 border-red-300 text-red-800 font-medium"
                  : "bg-gray-200 border-gray-300 text-gray-700 font-medium"
                : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
            }`}
          >
            {opt === true ? "Yes" : opt === false ? "No" : "N/A"}
          </button>
        ))}
      </div>
    </div>
  );
}

function ReviewSelect({ label, value, options, confidence, source, onChange }: {
  label: string;
  value: string | undefined;
  options: string[];
  confidence?: FieldConfidence;
  source?: string;
  onChange: (value: string | undefined) => void;
}) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1.5">
        {confidence && <ConfidenceDot confidence={confidence} />}
        <label className="text-[10px] font-medium text-gray-500">{label}</label>
        {source && <span className="text-[9px] text-gray-400">{SOURCE_LABELS[source] || source}</span>}
      </div>
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value || undefined)}
        className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-400 focus:border-blue-400 outline-none bg-white"
      >
        <option value="">—</option>
        {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  );
}

// ---- Helpers ----

function countFilled(data: ExtractedData, fields: FieldDef[]): number {
  return fields.filter((f) => {
    const val = (data as unknown as Record<string, unknown>)[f.key];
    return val !== undefined && val !== null && val !== "";
  }).length;
}

function countHealthFilled(hs: ExtractedHealthSafety | undefined): number {
  if (!hs) return 0;
  return Object.values(hs).filter((v) => v !== undefined && v !== null && v !== "").length;
}
