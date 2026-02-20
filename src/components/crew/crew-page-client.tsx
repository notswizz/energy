"use client";

import { useState } from "react";

interface CrewMember {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
}

interface Props {
  initialCrew: CrewMember[];
}

export function CrewPageClient({ initialCrew }: Props) {
  const [crew, setCrew] = useState(initialCrew);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);

  // Add form state
  const [addForm, setAddForm] = useState({ name: "", email: "", phone: "", role: "" });
  // Edit form state
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "", role: "" });

  const handleAdd = async () => {
    if (!addForm.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/crew", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      if (res.ok) {
        const data = await res.json();
        setCrew((prev) => [...prev, data]);
        setAddForm({ name: "", email: "", phone: "", role: "" });
        setShowAdd(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (member: CrewMember) => {
    setEditingId(member.id);
    setEditForm({
      name: member.name,
      email: member.email || "",
      phone: member.phone || "",
      role: member.role,
    });
  };

  const handleEdit = async () => {
    if (!editingId || !editForm.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/crew/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        const data = await res.json();
        setCrew((prev) => prev.map((c) => (c.id === editingId ? data : c)));
        setEditingId(null);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this crew member?")) return;
    const res = await fetch(`/api/crew/${id}`, { method: "DELETE" });
    if (res.ok) {
      setCrew((prev) => prev.filter((c) => c.id !== id));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800"
        >
          Add Crew Member
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-white rounded-lg border border-blue-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">New Crew Member</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input
              type="text"
              placeholder="Name *"
              value={addForm.name}
              onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
              className="px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
            <input
              type="tel"
              placeholder="Phone"
              value={addForm.phone}
              onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
              className="px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
            <input
              type="email"
              placeholder="Email"
              value={addForm.email}
              onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
              className="px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
            <input
              type="text"
              placeholder="Role"
              value={addForm.role}
              onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
              className="px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleAdd}
              disabled={saving || !addForm.name.trim()}
              className="px-4 py-2 text-sm bg-gray-900 text-white rounded-md hover:bg-gray-800 disabled:opacity-50"
            >
              {saving ? "Adding..." : "Add"}
            </button>
            <button
              onClick={() => { setShowAdd(false); setAddForm({ name: "", email: "", phone: "", role: "" }); }}
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Crew table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {crew.map((member) =>
              editingId === member.id ? (
                <tr key={member.id} className="bg-blue-50">
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full px-2 py-1 text-sm border border-gray-200 rounded"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="tel"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      className="w-full px-2 py-1 text-sm border border-gray-200 rounded"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="w-full px-2 py-1 text-sm border border-gray-200 rounded"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={editForm.role}
                      onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                      className="w-full px-2 py-1 text-sm border border-gray-200 rounded"
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={handleEdit} disabled={saving} className="text-sm text-blue-600 hover:text-blue-800 mr-2">
                      {saving ? "..." : "Save"}
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-sm text-gray-500 hover:text-gray-700">
                      Cancel
                    </button>
                  </td>
                </tr>
              ) : (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{member.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{member.phone || "—"}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{member.email || "—"}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{member.role || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => startEdit(member)} className="text-sm text-gray-500 hover:text-gray-700 mr-2">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(member.id)} className="text-sm text-red-500 hover:text-red-700">
                      Delete
                    </button>
                  </td>
                </tr>
              )
            )}
            {crew.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                  No crew members yet. Add your first crew member above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
