export function StatCard({
  title,
  value,
  subtitle,
  accent,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  accent?: "green" | "red" | "default";
}) {
  const valueColor =
    accent === "green"
      ? "text-emerald-600"
      : accent === "red"
      ? "text-red-600"
      : "text-gray-900";

  return (
    <div className="relative overflow-hidden bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{title}</p>
      <p className={`mt-1.5 text-2xl font-bold tabular-nums ${valueColor}`}>{value}</p>
      {subtitle && <p className="mt-1 text-[11px] text-gray-400">{subtitle}</p>}
    </div>
  );
}
