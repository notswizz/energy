"use client";

import { useState } from "react";
import { StageBadge } from "@/src/components/ui/stage-badge";
import { DateModal } from "./date-modal";
import { JOB_STAGES, STAGE_CONFIG, INCOME_TIER_LABELS, type JobStage, type IncomeTier } from "@/src/types";

interface CrmData {
  homeowner: { name: string; email?: string; phone?: string };
  stage: JobStage;
  incomeTier: IncomeTier | null;
  crewLeadId: string | null;
  rebateEstimate: number | null;
  auditDate: string | null;
  inspectionDate: string | null;
}

interface Props {
  jobId: string;
  initial: CrmData;
  crewLeads: Array<{ id: string; name: string }>;
}

export function CrmPanel({ jobId, initial, crewLeads }: Props) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [dateModal, setDateModal] = useState<{ type: "audit" | "inspection"; stage: JobStage } | null>(null);

  const patchJob = async (fields: Record<string, unknown>) => {
    const res = await fetch(`/api/jobs/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    return res.ok;
  };

  const handleStageChange = (newStage: JobStage) => {
    if (newStage === "audit_scheduled" && !data.auditDate) {
      setDateModal({ type: "audit", stage: newStage });
    } else if (newStage === "inspection" && !data.inspectionDate) {
      setDateModal({ type: "inspection", stage: newStage });
    } else {
      applyStageChange(newStage);
    }
  };

  const applyStageChange = async (newStage: JobStage, extraFields?: Record<string, unknown>) => {
    const prev = data.stage;
    setData((d) => ({ ...d, stage: newStage, ...extraFields }));
    setDraft((d) => ({ ...d, stage: newStage, ...extraFields }));

    const ok = await patchJob({ stage: newStage, ...extraFields });
    if (!ok) {
      setData((d) => ({ ...d, stage: prev }));
      setDraft((d) => ({ ...d, stage: prev }));
    }
  };

  const handleDateConfirm = (date: string) => {
    if (!dateModal) return;
    const extra = dateModal.type === "audit"
      ? { auditDate: date }
      : { inspectionDate: date };
    applyStageChange(dateModal.stage, extra);
    setDateModal(null);
  };

  const handleDateCancel = () => {
    setDateModal(null);
  };

  const save = async () => {
    setSaving(true);
    try {
      const ok = await patchJob({
        homeowner: draft.homeowner,
        incomeTier: draft.incomeTier,
        crewLeadId: draft.crewLeadId,
        rebateEstimate: draft.rebateEstimate,
        auditDate: draft.auditDate || null,
        inspectionDate: draft.inspectionDate || null,
      });
      if (ok) {
        setData(draft);
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    setDraft(data);
    setEditing(false);
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso + "T00:00:00").toLocaleDateString();
  };

  return (
    <>
      <DateModal
        open={dateModal?.type === "audit"}
        title="Schedule Audit"
        label="Audit Date"
        onConfirm={handleDateConfirm}
        onCancel={handleDateCancel}
      />
      <DateModal
        open={dateModal?.type === "inspection"}
        title="Schedule Inspection"
        label="Inspection Date"
        onConfirm={handleDateConfirm}
        onCancel={handleDateCancel}
      />

      {!editing ? (
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">CRM Details</h2>
            <button
              onClick={() => setEditing(true)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Edit
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <div>
              <p className="text-xs text-gray-500">Contact</p>
              <p className="text-sm font-medium text-gray-900">{data.homeowner.name}</p>
              {data.homeowner.phone && <p className="text-xs text-gray-500">{data.homeowner.phone}</p>}
              {data.homeowner.email && <p className="text-xs text-gray-500">{data.homeowner.email}</p>}
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Stage</p>
              <select
                value={data.stage}
                onChange={(e) => handleStageChange(e.target.value as JobStage)}
                className="w-full px-2 py-1 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
              >
                {JOB_STAGES.map((s) => (
                  <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>
                ))}
              </select>
            </div>
            <div>
              <p className="text-xs text-gray-500">Audit Date</p>
              <p className="text-sm text-gray-900">{formatDate(data.auditDate)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Inspection Date</p>
              <p className="text-sm text-gray-900">{formatDate(data.inspectionDate)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Crew Lead</p>
              <p className="text-sm text-gray-900">
                {data.crewLeadId
                  ? crewLeads.find((c) => c.id === data.crewLeadId)?.name || "—"
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Income Tier</p>
              <p className="text-sm text-gray-900">
                {data.incomeTier ? INCOME_TIER_LABELS[data.incomeTier] : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Rebate Estimate</p>
              <p className="text-sm text-gray-900">
                {data.rebateEstimate != null ? `$${data.rebateEstimate.toLocaleString()}` : "—"}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-blue-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">CRM Details</h2>
            <div className="flex gap-2">
              <button onClick={cancel} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
              <button
                onClick={save}
                disabled={saving}
                className="text-sm px-3 py-1 bg-gray-900 text-white rounded-md hover:bg-gray-800 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Contact Name</label>
              <input
                type="text"
                value={draft.homeowner.name}
                onChange={(e) => setDraft({ ...draft, homeowner: { ...draft.homeowner, name: e.target.value } })}
                className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Phone</label>
              <input
                type="tel"
                value={draft.homeowner.phone || ""}
                onChange={(e) => setDraft({ ...draft, homeowner: { ...draft.homeowner, phone: e.target.value || undefined } })}
                className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Email</label>
              <input
                type="email"
                value={draft.homeowner.email || ""}
                onChange={(e) => setDraft({ ...draft, homeowner: { ...draft.homeowner, email: e.target.value || undefined } })}
                className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Audit Date</label>
              <input
                type="date"
                value={draft.auditDate || ""}
                onChange={(e) => setDraft({ ...draft, auditDate: e.target.value || null })}
                className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Inspection Date</label>
              <input
                type="date"
                value={draft.inspectionDate || ""}
                onChange={(e) => setDraft({ ...draft, inspectionDate: e.target.value || null })}
                className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Income Tier</label>
              <select
                value={draft.incomeTier || ""}
                onChange={(e) => setDraft({ ...draft, incomeTier: (e.target.value || null) as IncomeTier | null })}
                className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
              >
                <option value="">Not set</option>
                {(Object.entries(INCOME_TIER_LABELS) as [IncomeTier, string][]).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Crew Lead</label>
              <select
                value={draft.crewLeadId || ""}
                onChange={(e) => setDraft({ ...draft, crewLeadId: e.target.value || null })}
                className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
              >
                <option value="">Not assigned</option>
                {crewLeads.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Rebate Estimate ($)</label>
              <input
                type="number"
                value={draft.rebateEstimate ?? ""}
                onChange={(e) => setDraft({ ...draft, rebateEstimate: e.target.value ? Number(e.target.value) : null })}
                className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
