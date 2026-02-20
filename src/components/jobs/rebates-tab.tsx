import type { RebateInfo } from "@/src/types";

export function RebatesTab({ rebates }: { rebates: RebateInfo | null }) {
  if (!rebates) {
    return (
      <p className="text-sm text-gray-500 py-8 text-center">
        No rebate data available.
      </p>
    );
  }

  const statusColors: Record<string, string> = {
    not_submitted: "bg-gray-100 text-gray-800",
    pending: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-800",
    denied: "bg-red-100 text-red-800",
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-500">Eligible</p>
          <p className="text-lg font-semibold text-gray-900">
            {rebates.eligible ? "Yes" : "No"}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-500">Income Tier</p>
          <p className="text-lg font-semibold text-gray-900">
            {rebates.incomeTier || "—"}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-500">Submission Status</p>
          <span
            className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
              statusColors[rebates.submissionStatus] || statusColors.not_submitted
            }`}
          >
            {rebates.submissionStatus.replace("_", " ")}
          </span>
        </div>
      </div>

      {Object.keys(rebates.amounts).length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Available Rebates</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 pr-4 font-medium text-gray-500">Program</th>
                <th className="text-right py-2 font-medium text-gray-500">Amount</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(rebates.amounts).map(([program, amount]) => (
                <tr key={program} className="border-b border-gray-100">
                  <td className="py-2 pr-4 text-gray-900">{program}</td>
                  <td className="py-2 text-right text-green-600 font-medium">
                    ${amount.toLocaleString()}
                  </td>
                </tr>
              ))}
              <tr className="border-t border-gray-200">
                <td className="py-2 pr-4 text-gray-900 font-semibold">Total</td>
                <td className="py-2 text-right text-green-600 font-semibold">
                  ${Object.values(rebates.amounts).reduce((a, b) => a + b, 0).toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
