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
}: EnergyTabProps) {
  if (!baseline && !improved) {
    return (
      <p className="text-sm text-gray-500 py-8 text-center">
        No energy data available. Sync with SnuggPro to import energy model results.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {/* Energy comparison */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Baseline</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">
            ${num(baseline?.annualEnergyCost).toLocaleString()}
            <span className="text-sm font-normal text-gray-500">/yr</span>
          </p>
          <div className="mt-2 space-y-1 text-sm text-gray-500">
            <p>{num(baseline?.mbtu).toFixed(1)} MMBtu</p>
            <p>{num(baseline?.co2).toLocaleString()} lbs CO2</p>
            {baseline?.hesScore != null && <p>HES Score: <span className="font-medium text-gray-900">{baseline.hesScore}</span></p>}
          </div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Improved</p>
          <p className="text-2xl font-semibold text-green-700 mt-1">
            ${num(improved?.annualEnergyCost).toLocaleString()}
            <span className="text-sm font-normal text-green-600">/yr</span>
          </p>
          <div className="mt-2 space-y-1 text-sm text-green-600">
            <p>{num(improved?.mbtu).toFixed(1)} MMBtu</p>
            <p>{num(improved?.co2).toLocaleString()} lbs CO2</p>
            {improved?.hesScore != null && <p>HES Score: <span className="font-medium text-green-800">{improved.hesScore}</span></p>}
          </div>
        </div>
        <div className="bg-blue-50 rounded-lg p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Savings</p>
          <p className="text-2xl font-semibold text-blue-700 mt-1">
            {savingsPercent != null ? `${savingsPercent}%` : "—"}
          </p>
          {baseline && improved && (
            <div className="mt-2 space-y-1 text-sm text-blue-600">
              <p>${(num(baseline.annualEnergyCost) - num(improved.annualEnergyCost)).toLocaleString()}/yr saved</p>
              <p>{(num(baseline.co2) - num(improved.co2)).toLocaleString()} lbs CO2 reduced</p>
            </div>
          )}
        </div>
      </div>

      {/* Recommended measures */}
      {measures.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Recommended Measures</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 pr-4 font-medium text-gray-500">Measure</th>
                  <th className="text-left py-2 pr-4 font-medium text-gray-500">Category</th>
                  <th className="text-right py-2 pr-4 font-medium text-gray-500">Cost</th>
                  <th className="text-right py-2 font-medium text-gray-500">Savings</th>
                </tr>
              </thead>
              <tbody>
                {measures.map((m, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-2 pr-4 text-gray-900">{m.name}</td>
                    <td className="py-2 pr-4 text-gray-500 capitalize">{m.category.replace("_", " ")}</td>
                    <td className="py-2 pr-4 text-right text-gray-900">${(m.cost ?? 0).toLocaleString()}</td>
                    <td className="py-2 text-right text-green-600">${(m.savings ?? 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Building details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DetailSection title="HVAC Systems" data={hvac.systems as unknown[]} />
        <DetailSection title="Attic Insulation" data={attic.sections as unknown[]} />
        <DetailSection title="Walls" data={walls.sections as unknown[]} />
        <DetailSection title="Windows" data={windows.items as unknown[]} />
      </div>
    </div>
  );
}

function DetailSection({ title, data }: { title: string; data: unknown[] | undefined }) {
  if (!data || data.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 mb-2">{title}</h3>
      <div className="space-y-2">
        {data.map((item, i) => (
          <div key={i} className="bg-gray-50 rounded p-3 text-xs text-gray-600">
            {Object.entries(item as Record<string, unknown>)
              .filter(([key]) => !key.startsWith("_") && key !== "id")
              .map(([key, value]) => (
                <div key={key} className="flex justify-between py-0.5">
                  <span className="text-gray-500">{key.replace(/_/g, " ")}</span>
                  <span className="text-gray-900 font-medium">{String(value)}</span>
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}
