"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

const INPUT =
  "w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:border-gray-900 focus:ring-0 focus:outline-none transition-colors placeholder:text-gray-300";
const LABEL = "block text-[10px] font-medium uppercase tracking-wider text-gray-400 mb-1";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS",
  "KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY",
  "NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CreateJobModal({ open, onClose }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    street: "",
    city: "",
    state: "",
    zip: "",
  });

  useEffect(() => {
    if (open) {
      setTimeout(() => firstInputRef.current?.focus(), 100);
    }
  }, [open]);

  if (!open) return null;

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const canSubmit = form.firstName && form.lastName && form.street && form.city && form.state && form.zip;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || saving) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create job");
      }

      const { id } = await res.json();
      onClose();
      router.push(`/jobs/${id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <form
        onSubmit={handleSubmit}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">New Job</h2>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">Creates a job in your dashboard and on SnuggPro.</p>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Homeowner */}
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-3">Homeowner</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>First Name *</label>
                <input
                  ref={firstInputRef}
                  className={INPUT}
                  value={form.firstName}
                  onChange={set("firstName")}
                  placeholder="John"
                />
              </div>
              <div>
                <label className={LABEL}>Last Name *</label>
                <input className={INPUT} value={form.lastName} onChange={set("lastName")} placeholder="Doe" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className={LABEL}>Email</label>
                <input
                  className={INPUT}
                  type="email"
                  value={form.email}
                  onChange={set("email")}
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <label className={LABEL}>Phone</label>
                <input
                  className={INPUT}
                  type="tel"
                  value={form.phone}
                  onChange={set("phone")}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-3">Property Address</p>
            <div>
              <label className={LABEL}>Street *</label>
              <input className={INPUT} value={form.street} onChange={set("street")} placeholder="123 Main St" />
            </div>
            <div className="grid grid-cols-6 gap-3 mt-3">
              <div className="col-span-3">
                <label className={LABEL}>City *</label>
                <input className={INPUT} value={form.city} onChange={set("city")} placeholder="Atlanta" />
              </div>
              <div className="col-span-1">
                <label className={LABEL}>State *</label>
                <select
                  className={INPUT}
                  value={form.state}
                  onChange={set("state")}
                >
                  <option value="">—</option>
                  {US_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className={LABEL}>Zip *</label>
                <input
                  className={INPUT}
                  value={form.zip}
                  onChange={set("zip")}
                  placeholder="30301"
                  maxLength={10}
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="px-3 py-2 text-sm text-red-700 bg-red-50 rounded-lg border border-red-100">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit || saving}
            className="px-5 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Creating…
              </span>
            ) : (
              "Create Job"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
