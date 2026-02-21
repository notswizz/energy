"use client";

import { useState, useRef } from "react";
import { DateModal } from "./date-modal";
import { JOB_STAGES, STAGE_CONFIG, INCOME_TIER_LABELS, type JobStage, type IncomeTier, type RebateTrackerEntry, type JobCosting } from "@/src/types";

interface CrmData {
  homeowner: { name: string; email?: string; phone?: string };
  stage: JobStage;
  incomeTier: IncomeTier | null;
  crewLeadId: string | null;
  rebateEstimate: number | null;
  auditDate: string | null;
  inspectionDate: string | null;
  rebateTracker: RebateTrackerEntry[];
  costing: JobCosting | null;
}

interface Props {
  jobId: string;
  initial: CrmData;
  crewLeads: Array<{ id: string; name: string }>;
}

const REBATE_STATUS_LABELS: Record<RebateTrackerEntry["status"], string> = {
  not_applied: "Not Applied",
  applied: "Applied",
  approved: "Approved",
  denied: "Denied",
  paid: "Paid",
};

const REBATE_STATUS_COLORS: Record<RebateTrackerEntry["status"], { bg: string; text: string; dot: string; border: string }> = {
  not_applied: { bg: "bg-gray-50", text: "text-gray-600", dot: "bg-gray-400", border: "border-gray-200" },
  applied: { bg: "bg-blue-50/60", text: "text-blue-700", dot: "bg-blue-500", border: "border-blue-200" },
  approved: { bg: "bg-emerald-50/60", text: "text-emerald-700", dot: "bg-emerald-500", border: "border-emerald-200" },
  denied: { bg: "bg-red-50/60", text: "text-red-700", dot: "bg-red-500", border: "border-red-200" },
  paid: { bg: "bg-emerald-50/80", text: "text-emerald-800", dot: "bg-emerald-600", border: "border-emerald-300" },
};

const EMPTY_REBATE: RebateTrackerEntry = {
  program: "", amountApplied: 0, amountApproved: null, amountPaid: null,
  status: "applied", appliedDate: null, approvedDate: null, paidDate: null,
};

const EMPTY_COSTING: JobCosting = { labor: 0, materials: 0, equipment: 0, other: 0 };

// ─── Shared input styles ────────────────────────────────────────────────────
const INPUT = "w-full px-2.5 py-1.5 text-sm bg-transparent border-0 border-b border-transparent hover:border-gray-300 focus:border-gray-900 focus:ring-0 focus:outline-none transition-colors";
const SELECT = "w-full px-2.5 py-1.5 text-sm bg-transparent border-0 border-b border-transparent hover:border-gray-300 focus:border-gray-900 focus:ring-0 focus:outline-none transition-colors appearance-none cursor-pointer";
const LABEL = "block text-[10px] font-medium uppercase tracking-wider text-gray-400 mb-0.5";

// ─── Rebate sub-components ──────────────────────────────────────────────────

function RebateCard({ entry, onAdvance, onDelete, formatDate }: {
  entry: RebateTrackerEntry;
  onAdvance: (action: "approve" | "deny" | "paid") => void;
  onDelete: () => void;
  formatDate: (iso: string | null) => string;
}) {
  const sc = REBATE_STATUS_COLORS[entry.status];

  return (
    <div className={`rounded-lg border ${sc.border} ${sc.bg} px-3.5 py-3`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-2 h-2 rounded-full shrink-0 ${sc.dot}`} />
          <span className="text-sm font-semibold text-gray-900 truncate">{entry.program}</span>
          <span className={`shrink-0 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full ${sc.text} bg-white/60`}>
            {REBATE_STATUS_LABELS[entry.status]}
          </span>
        </div>
        <button onClick={onDelete} className="shrink-0 ml-2 text-[10px] text-gray-400 hover:text-red-500 transition-colors">remove</button>
      </div>

      {/* Timeline */}
      <div className="mt-2.5 ml-1 space-y-0">
        {/* Applied */}
        <TimelineStep
          color="blue"
          label="Applied"
          amount={entry.amountApplied}
          date={entry.appliedDate}
          formatDate={formatDate}
          active
          last={entry.status === "applied" || entry.status === "denied"}
        />
        {/* Denied */}
        {entry.status === "denied" && (
          <TimelineStep color="red" label="Denied" active last />
        )}
        {/* Approved */}
        {(entry.status === "approved" || entry.status === "paid") && (
          <TimelineStep
            color="emerald"
            label="Approved"
            amount={entry.amountApproved}
            date={entry.approvedDate}
            formatDate={formatDate}
            active
            last={entry.status === "approved"}
          />
        )}
        {/* Paid */}
        {entry.status === "paid" && (
          <TimelineStep
            color="emerald"
            label="Paid"
            amount={entry.amountPaid}
            date={entry.paidDate}
            formatDate={formatDate}
            active
            last
          />
        )}
      </div>

      {/* Action buttons */}
      {entry.status === "applied" && (
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => onAdvance("approve")}
            className="px-3 py-1 text-xs font-medium bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors shadow-sm"
          >
            Approve
          </button>
          <button
            onClick={() => onAdvance("deny")}
            className="px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-100 rounded-md transition-colors"
          >
            Deny
          </button>
        </div>
      )}
      {entry.status === "approved" && (
        <div className="mt-3">
          <button
            onClick={() => onAdvance("paid")}
            className="px-3 py-1 text-xs font-medium bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors shadow-sm"
          >
            Mark Paid
          </button>
        </div>
      )}
    </div>
  );
}

function TimelineStep({ color, label, amount, date, formatDate, active, last }: {
  color: "blue" | "emerald" | "red";
  label: string;
  amount?: number | null;
  date?: string | null;
  formatDate?: (iso: string | null) => string;
  active?: boolean;
  last?: boolean;
}) {
  const dotColor = color === "blue" ? "bg-blue-500" : color === "red" ? "bg-red-500" : "bg-emerald-500";
  const lineColor = color === "blue" ? "bg-blue-200" : color === "red" ? "bg-red-200" : "bg-emerald-200";

  return (
    <div className="flex items-start gap-2.5 relative">
      <div className="flex flex-col items-center shrink-0 mt-[5px]">
        <span className={`w-1.5 h-1.5 rounded-full ${active ? dotColor : "bg-gray-300"}`} />
        {!last && <span className={`w-px h-3 ${active ? lineColor : "bg-gray-200"}`} />}
      </div>
      <div className={`flex items-baseline gap-1.5 text-xs pb-1 ${active ? "text-gray-800" : "text-gray-400"}`}>
        <span className="font-medium">{label}</span>
        {amount != null && <span className="tabular-nums">${amount.toLocaleString()}</span>}
        {date && formatDate && <span className="text-gray-400">{formatDate(date)}</span>}
      </div>
    </div>
  );
}

function RebateAddForm({ onSave, onCancel }: {
  onSave: (program: string, amount: number, appliedDate: string) => void;
  onCancel: () => void;
}) {
  const [program, setProgram] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [appliedDate, setAppliedDate] = useState(new Date().toISOString().split("T")[0]);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3.5 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-3">New Rebate</p>
      <div className="grid grid-cols-1 gap-2.5">
        <div>
          <label className={LABEL}>Program</label>
          <input
            type="text" value={program} placeholder="e.g. GA HER, IRA 25C"
            onChange={(e) => setProgram(e.target.value)}
            className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
            autoFocus
          />
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className={LABEL}>Amount ($)</label>
            <input
              type="number" value={amount || ""} placeholder="0"
              onChange={(e) => setAmount(Number(e.target.value) || 0)}
              className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
            />
          </div>
          <div>
            <label className={LABEL}>Date</label>
            <input
              type="date" value={appliedDate}
              onChange={(e) => setAppliedDate(e.target.value)}
              className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
            />
          </div>
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => { if (program) onSave(program, amount, appliedDate); }}
          disabled={!program}
          className="px-3.5 py-1.5 text-xs font-medium bg-gray-900 text-white rounded-md hover:bg-gray-800 disabled:opacity-40 transition-colors"
        >
          Add
        </button>
        <button onClick={onCancel} className="px-3.5 py-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors">Cancel</button>
      </div>
    </div>
  );
}

function RebateAdvanceForm({ action, entry, onSave, onCancel }: {
  action: "approve" | "paid";
  entry: RebateTrackerEntry;
  onSave: (updated: RebateTrackerEntry) => void;
  onCancel: () => void;
}) {
  const [amount, setAmount] = useState<number>(
    action === "approve" ? (entry.amountApplied || 0) : (entry.amountApproved || 0)
  );
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const label = action === "approve" ? "Approved" : "Paid";

  const handleSave = () => {
    if (action === "approve") {
      onSave({ ...entry, status: "approved", amountApproved: amount, approvedDate: date });
    } else {
      onSave({ ...entry, status: "paid", amountPaid: amount, paidDate: date });
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3.5 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-3">
        {entry.program} &mdash; {label}
      </p>
      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <label className={LABEL}>Amount ($)</label>
          <input
            type="number" value={amount || ""}
            onChange={(e) => setAmount(Number(e.target.value) || 0)}
            className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
            autoFocus
          />
        </div>
        <div>
          <label className={LABEL}>Date</label>
          <input
            type="date" value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
          />
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <button onClick={handleSave} className="px-3.5 py-1.5 text-xs font-medium bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors">
          Save
        </button>
        <button onClick={onCancel} className="px-3.5 py-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors">Cancel</button>
      </div>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export function CrmPanel({ jobId, initial, crewLeads }: Props) {
  const [data, setData] = useState(initial);
  const [dateModal, setDateModal] = useState<{ type: "audit" | "inspection"; stage: JobStage } | null>(null);

  // Rebate tracker
  const [rebateTracker, setRebateTracker] = useState<RebateTrackerEntry[]>(initial.rebateTracker || []);
  const [addingRebate, setAddingRebate] = useState(false);
  const [advancing, setAdvancing] = useState<{ idx: number; action: "approve" | "paid" } | null>(null);

  // Job costing — always editable
  const [costing, setCosting] = useState<JobCosting>(initial.costing || EMPTY_COSTING);

  // Debounce ref for text fields
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const patchJob = async (fields: Record<string, unknown>) => {
    const res = await fetch(`/api/jobs/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    return res.ok;
  };

  // Save a single field on blur or change (for selects/dates)
  const saveField = (fields: Record<string, unknown>) => {
    setData((d) => ({ ...d, ...fields }));
    patchJob(fields);
  };

  // Debounced save for text inputs
  const debouncedSave = (fields: Record<string, unknown>) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => patchJob(fields), 600);
  };

  const handleStageChange = (newStage: JobStage) => {
    if (newStage === "audit_scheduled" && !data.auditDate) {
      setDateModal({ type: "audit", stage: newStage });
    } else if (newStage === "inspection" && !data.inspectionDate) {
      setDateModal({ type: "inspection", stage: newStage });
    } else {
      saveField({ stage: newStage });
    }
  };

  const handleDateConfirm = (date: string) => {
    if (!dateModal) return;
    const extra = dateModal.type === "audit" ? { auditDate: date } : { inspectionDate: date };
    saveField({ stage: dateModal.stage, ...extra });
    setDateModal(null);
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return "";
    return new Date(iso + "T00:00:00").toLocaleDateString();
  };

  // ── Rebate helpers ──
  const saveRebateTracker = async (entries: RebateTrackerEntry[]) => {
    const ok = await patchJob({ rebateTracker: entries });
    if (ok) setRebateTracker(entries);
    return ok;
  };

  const handleAddRebate = async (program: string, amount: number, appliedDate: string) => {
    const entry: RebateTrackerEntry = { ...EMPTY_REBATE, program, amountApplied: amount, appliedDate, status: "applied" };
    const ok = await saveRebateTracker([...rebateTracker, entry]);
    if (ok) setAddingRebate(false);
  };

  const handleAdvance = (idx: number, action: "approve" | "deny" | "paid") => {
    if (action === "deny") {
      const updated = [...rebateTracker];
      updated[idx] = { ...updated[idx], status: "denied" };
      saveRebateTracker(updated);
    } else {
      setAdvancing({ idx, action });
    }
  };

  const handleAdvanceSave = async (updated: RebateTrackerEntry) => {
    if (!advancing) return;
    const entries = [...rebateTracker];
    entries[advancing.idx] = updated;
    const ok = await saveRebateTracker(entries);
    if (ok) setAdvancing(null);
  };

  const handleDeleteRebate = async (idx: number) => {
    await saveRebateTracker(rebateTracker.filter((_, i) => i !== idx));
  };

  // ── Costing helpers ──
  const totalCost = costing.labor + costing.materials + costing.equipment + costing.other;
  const totalApprovedRebates = rebateTracker
    .filter((r) => (r.status === "approved" || r.status === "paid") && r.amountApproved != null)
    .reduce((sum, r) => sum + (r.amountApproved || 0), 0);
  const totalPaid = rebateTracker
    .filter((r) => r.status === "paid" && r.amountPaid != null)
    .reduce((sum, r) => sum + (r.amountPaid || 0), 0);
  const profit = totalApprovedRebates - totalCost;
  const marginPct = totalApprovedRebates > 0 ? ((profit / totalApprovedRebates) * 100) : 0;

  const saveCostingField = (field: keyof JobCosting, value: number) => {
    const updated = { ...costing, [field]: value };
    setCosting(updated);
    patchJob({ costing: updated });
  };

  // ── Stage pill colors for the pipeline bar ──
  const stageIdx = JOB_STAGES.indexOf(data.stage);

  return (
    <>
      <DateModal open={dateModal?.type === "audit"} title="Schedule Audit" label="Audit Date" onConfirm={handleDateConfirm} onCancel={() => setDateModal(null)} />
      <DateModal open={dateModal?.type === "inspection"} title="Schedule Inspection" label="Inspection Date" onConfirm={handleDateConfirm} onCancel={() => setDateModal(null)} />

      {/* ── CRM Header ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Stage pipeline bar */}
        <div className="flex border-b border-gray-100">
          {JOB_STAGES.map((s, i) => {
            const cfg = STAGE_CONFIG[s];
            const isCurrent = s === data.stage;
            const isPast = i < stageIdx;
            return (
              <button
                key={s}
                onClick={() => handleStageChange(s)}
                className={`flex-1 py-2 text-[10px] font-semibold uppercase tracking-wider text-center transition-all relative ${
                  isCurrent
                    ? `${cfg.bgClass} ${cfg.textClass}`
                    : isPast
                    ? "bg-gray-50 text-gray-500"
                    : "bg-white text-gray-300 hover:text-gray-400"
                }`}
              >
                {cfg.label}
                {isCurrent && (
                  <span className={`absolute bottom-0 left-0 right-0 h-0.5`} style={{ backgroundColor: cfg.color }} />
                )}
              </button>
            );
          })}
        </div>

        {/* Inline fields */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-x divide-gray-100">
          {/* Contact */}
          <div className="p-3">
            <label className={LABEL}>Contact</label>
            <input
              type="text"
              value={data.homeowner.name}
              onChange={(e) => {
                const hw = { ...data.homeowner, name: e.target.value };
                setData((d) => ({ ...d, homeowner: hw }));
                debouncedSave({ homeowner: hw });
              }}
              className={`${INPUT} font-medium`}
              placeholder="Name"
            />
            <input
              type="tel"
              value={data.homeowner.phone || ""}
              onChange={(e) => {
                const hw = { ...data.homeowner, phone: e.target.value || undefined };
                setData((d) => ({ ...d, homeowner: hw }));
                debouncedSave({ homeowner: hw });
              }}
              className={`${INPUT} text-xs text-gray-500`}
              placeholder="Phone"
            />
            <input
              type="email"
              value={data.homeowner.email || ""}
              onChange={(e) => {
                const hw = { ...data.homeowner, email: e.target.value || undefined };
                setData((d) => ({ ...d, homeowner: hw }));
                debouncedSave({ homeowner: hw });
              }}
              className={`${INPUT} text-xs text-gray-500`}
              placeholder="Email"
            />
          </div>

          {/* Audit Date */}
          <div className="p-3">
            <label className={LABEL}>Audit Date</label>
            <input
              type="date"
              value={data.auditDate || ""}
              onChange={(e) => saveField({ auditDate: e.target.value || null })}
              className={INPUT}
            />
          </div>

          {/* Inspection Date */}
          <div className="p-3">
            <label className={LABEL}>Inspection</label>
            <input
              type="date"
              value={data.inspectionDate || ""}
              onChange={(e) => saveField({ inspectionDate: e.target.value || null })}
              className={INPUT}
            />
          </div>

          {/* Crew Lead */}
          <div className="p-3">
            <label className={LABEL}>Crew Lead</label>
            <select
              value={data.crewLeadId || ""}
              onChange={(e) => saveField({ crewLeadId: e.target.value || null })}
              className={SELECT}
            >
              <option value="">Not assigned</option>
              {crewLeads.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Income Tier */}
          <div className="p-3">
            <label className={LABEL}>Income Tier</label>
            <select
              value={data.incomeTier || ""}
              onChange={(e) => saveField({ incomeTier: e.target.value || null })}
              className={SELECT}
            >
              <option value="">Not set</option>
              {(Object.entries(INCOME_TIER_LABELS) as [IncomeTier, string][]).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>

          {/* Quick financials summary */}
          <div className="p-3">
            <label className={LABEL}>Financials</label>
            <div className="mt-1 space-y-0.5">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Rebates</span>
                <span className="text-gray-700 tabular-nums font-medium">${totalApprovedRebates.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Cost</span>
                <span className="text-gray-700 tabular-nums font-medium">${totalCost.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs pt-0.5 border-t border-gray-100">
                <span className="text-gray-400">Profit</span>
                <span className={`tabular-nums font-bold ${profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {profit >= 0 ? "+" : ""}${profit.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Rebate Tracker + Job Costing side by side ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Rebate Tracker */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Rebate Tracker</h3>
            {rebateTracker.length > 0 && (
              <div className="flex items-center gap-3 text-[10px] text-gray-400">
                {totalApprovedRebates > 0 && <span>${totalApprovedRebates.toLocaleString()} approved</span>}
                {totalPaid > 0 && <span className="text-emerald-600">${totalPaid.toLocaleString()} paid</span>}
              </div>
            )}
          </div>

          <div className="px-4 pb-4 space-y-2.5">
            {rebateTracker.map((entry, idx) => (
              advancing?.idx === idx ? (
                <RebateAdvanceForm
                  key={idx}
                  action={advancing.action}
                  entry={entry}
                  onSave={handleAdvanceSave}
                  onCancel={() => setAdvancing(null)}
                />
              ) : (
                <RebateCard
                  key={idx}
                  entry={entry}
                  onAdvance={(action) => handleAdvance(idx, action)}
                  onDelete={() => handleDeleteRebate(idx)}
                  formatDate={formatDate}
                />
              )
            ))}

            {rebateTracker.length === 0 && !addingRebate && (
              <p className="text-xs text-gray-300 text-center py-4">No rebates tracked yet</p>
            )}

            {addingRebate ? (
              <RebateAddForm onSave={handleAddRebate} onCancel={() => setAddingRebate(false)} />
            ) : (
              <button
                onClick={() => setAddingRebate(true)}
                className="w-full py-2 border border-dashed border-gray-200 rounded-lg text-xs text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors"
              >
                + Add Rebate
              </button>
            )}
          </div>
        </div>

        {/* Job Costing */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-4 pt-4 pb-2">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Job Costing</h3>
          </div>

          <div className="px-4 pb-4">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {(["labor", "materials", "equipment", "other"] as const).map((field) => (
                <div key={field}>
                  <label className={LABEL}>{field}</label>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-300">$</span>
                    <input
                      type="number"
                      value={costing[field] || ""}
                      placeholder="0"
                      onChange={(e) => setCosting({ ...costing, [field]: Number(e.target.value) || 0 })}
                      onBlur={(e) => saveCostingField(field, Number(e.target.value) || 0)}
                      className="w-full pl-5 pr-2 py-1.5 text-sm bg-transparent border-0 border-b border-transparent hover:border-gray-300 focus:border-gray-900 focus:ring-0 focus:outline-none transition-colors tabular-nums"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">Total Cost</p>
                <p className="text-xl font-bold text-gray-900 tabular-nums">${totalCost.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">Profit</p>
                <p className={`text-xl font-bold tabular-nums ${profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {profit >= 0 ? "+" : ""}${profit.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">Approved Rebates</p>
                <p className="text-xl font-bold text-gray-900 tabular-nums">${totalApprovedRebates.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">Margin</p>
                <p className={`text-xl font-bold tabular-nums ${profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {totalApprovedRebates > 0 ? `${marginPct.toFixed(1)}%` : "—"}
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
