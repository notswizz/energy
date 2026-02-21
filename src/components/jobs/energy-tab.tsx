"use client";

import { useState } from "react";
import type { EnergyProfile, Measure } from "@/src/types";

function num(v: unknown): number {
  return Number(v) || 0;
}

interface EnergyTabProps {
  baseline: EnergyProfile | null;
  improved: EnergyProfile | null;
  savingsPercent: number | null;
  measures: Measure[];
  hvac: Record<string, unknown>;
  attic: Record<string, unknown>;
  walls: Record<string, unknown>;
  windows: Record<string, unknown>;
  checklistData?: Record<string, unknown> | null;
  dhw?: Record<string, unknown>;
  healthSafety?: Record<string, unknown> | null;
}

export function EnergyTab({
  baseline,
  improved,
  savingsPercent,
  measures,
  hvac,
  attic,
  walls,
  windows,
  checklistData,
  dhw,
  healthSafety,
}: EnergyTabProps) {
  const hasMeasures = measures.length > 0;
  const sections = [
    { title: "HVAC Systems", data: hvac.systems as unknown[] | undefined },
    { title: "Water Heaters", data: (dhw as Record<string, unknown>)?.systems as unknown[] | undefined },
    { title: "Attic Insulation", data: attic.sections as unknown[] | undefined },
    { title: "Walls", data: walls.sections as unknown[] | undefined },
    { title: "Windows", data: windows.items as unknown[] | undefined },
  ].filter((s) => s.data && s.data.length > 0);

  const hasChecklistData = checklistData && Object.keys(checklistData).length > 0;
  const hasHealthData = healthSafety && Object.keys(healthSafety).length > 0;
  const hasAnyData = baseline || improved || hasMeasures || sections.length > 0 || hasChecklistData || hasHealthData;

  if (!hasAnyData) {
    return (
      <p className="text-sm text-gray-500 py-8 text-center">
        No energy data available. Upload a checklist PDF or sync with SnuggPro to import data.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {/* Energy comparison cards */}
      <div className="grid grid-cols-3 gap-3">
        {baseline && (
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Baseline</p>
            <p className="text-xl font-bold text-gray-900 mt-1">
              ${num(baseline.annualEnergyCost).toLocaleString()}
              <span className="text-xs font-normal text-gray-400">/yr</span>
            </p>
            <div className="mt-2 space-y-0.5 text-xs text-gray-500">
              {baseline.mbtu > 0 && <p>{num(baseline.mbtu).toFixed(1)} MMBtu</p>}
              {baseline.co2 > 0 && <p>{num(baseline.co2).toLocaleString()} lbs CO2</p>}
              {baseline.hesScore != null && (
                <p>HES: <span className="font-semibold text-gray-900">{baseline.hesScore}</span></p>
              )}
            </div>
          </div>
        )}
        {improved && (
          <div className="rounded-lg border border-green-200 bg-green-50/50 p-4">
            <p className="text-[11px] font-medium text-green-600 uppercase tracking-wider">Improved</p>
            <p className="text-xl font-bold text-green-700 mt-1">
              ${num(improved.annualEnergyCost).toLocaleString()}
              <span className="text-xs font-normal text-green-500">/yr</span>
            </p>
            <div className="mt-2 space-y-0.5 text-xs text-green-600">
              {improved.mbtu > 0 && <p>{num(improved.mbtu).toFixed(1)} MMBtu</p>}
              {improved.co2 > 0 && <p>{num(improved.co2).toLocaleString()} lbs CO2</p>}
              {improved.hesScore != null && (
                <p>HES: <span className="font-semibold text-green-800">{improved.hesScore}</span></p>
              )}
            </div>
          </div>
        )}
        {(savingsPercent != null || (baseline && improved)) && (
          <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4">
            <p className="text-[11px] font-medium text-blue-600 uppercase tracking-wider">Savings</p>
            <p className="text-xl font-bold text-blue-700 mt-1">
              {savingsPercent != null ? `${savingsPercent}%` : "—"}
            </p>
            {baseline && improved && (
              <div className="mt-2 space-y-0.5 text-xs text-blue-600">
                {num(baseline.annualEnergyCost) - num(improved.annualEnergyCost) > 0 && (
                  <p>${(num(baseline.annualEnergyCost) - num(improved.annualEnergyCost)).toLocaleString()}/yr</p>
                )}
                {num(baseline.co2) - num(improved.co2) > 0 && (
                  <p>{(num(baseline.co2) - num(improved.co2)).toLocaleString()} lbs CO2</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recommended measures */}
      {hasMeasures && (
        <div className="rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider">Recommended Measures</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-[11px] uppercase tracking-wider text-gray-400">
                <th className="text-left py-2 px-4 font-medium">Measure</th>
                <th className="text-left py-2 px-4 font-medium">Category</th>
                <th className="text-right py-2 px-4 font-medium">Cost</th>
                <th className="text-right py-2 px-4 font-medium">Savings</th>
              </tr>
            </thead>
            <tbody>
              {measures.map((m, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2 px-4 text-gray-900">{m.name}</td>
                  <td className="py-2 px-4">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">
                      {m.category.replace("_", " ")}
                    </span>
                  </td>
                  <td className="py-2 px-4 text-right text-gray-900">
                    {m.cost > 0 ? `$${m.cost.toLocaleString()}` : "—"}
                  </td>
                  <td className="py-2 px-4 text-right text-green-600 font-medium">
                    {m.savings > 0 ? `$${m.savings.toLocaleString()}` : "—"}
                  </td>
                </tr>
              ))}
              {measures.some((m) => m.cost > 0 || m.savings > 0) && (
                <tr className="bg-gray-50 font-medium">
                  <td className="py-2 px-4 text-gray-900" colSpan={2}>Total</td>
                  <td className="py-2 px-4 text-right text-gray-900">
                    ${measures.reduce((s, m) => s + (m.cost || 0), 0).toLocaleString()}
                  </td>
                  <td className="py-2 px-4 text-right text-green-600">
                    ${measures.reduce((s, m) => s + (m.savings || 0), 0).toLocaleString()}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Checklist basedata */}
      {hasChecklistData && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider px-1">Building Info (from Checklist)</h3>
          <div className="rounded-lg border border-gray-200 p-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2">
              {Object.entries(checklistData!)
                .filter(([, value]) => value !== null && value !== undefined && value !== "" && value !== 0)
                .map(([key, value]) => (
                  <div key={key} className="flex justify-between py-0.5 text-xs">
                    <span className="text-gray-400 capitalize">{key.replace(/([A-Z])/g, " $1").replace(/_/g, " ").trim()}</span>
                    <span className="text-gray-900 font-medium ml-2 text-right">
                      {typeof value === "boolean" ? (value ? "Yes" : "No") : typeof value === "number" ? value.toLocaleString() : String(value)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Building element sections — collapsible */}
      {sections.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider px-1">Building Elements</h3>
          {sections.map((section) => (
            <CollapsibleSection key={section.title} title={section.title} data={section.data!} />
          ))}
        </div>
      )}

      {/* Health & Safety */}
      {hasHealthData && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider px-1">Health & Safety</h3>
          <div className="rounded-lg border border-gray-200 p-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2">
              {Object.entries(healthSafety!)
                .filter(([, value]) => value !== null && value !== undefined && value !== "")
                .map(([key, value]) => (
                  <div key={key} className="flex justify-between py-0.5 text-xs">
                    <span className="text-gray-400 capitalize">{key.replace(/([A-Z])/g, " $1").replace(/_/g, " ").trim()}</span>
                    <span className="text-gray-900 font-medium ml-2 text-right">
                      {typeof value === "boolean" ? (value ? "Yes" : "No") : typeof value === "number" ? value.toLocaleString() : String(value)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CollapsibleSection({ title, data }: { title: string; data: unknown[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <span className="text-sm font-medium text-gray-900">{title}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{data.length}</span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      {open && (
        <div className="divide-y divide-gray-100">
          {data.map((item, i) => (
            <div key={i} className="px-4 py-3">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1">
                {Object.entries(item as Record<string, unknown>)
                  .filter(([key, value]) =>
                    !key.startsWith("_") &&
                    key !== "id" &&
                    value !== null &&
                    value !== undefined &&
                    value !== "" &&
                    value !== 0 &&
                    value !== "0" &&
                    value !== false
                  )
                  .map(([key, value]) => (
                    <div key={key} className="flex justify-between py-0.5 text-xs">
                      <span className="text-gray-400 capitalize">{key.replace(/([A-Z])/g, " $1").replace(/_/g, " ").trim()}</span>
                      <span className="text-gray-900 font-medium ml-2 text-right">
                        {typeof value === "number" ? value.toLocaleString() : String(value)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
