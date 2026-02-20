"use client";

import { useState } from "react";

interface Note {
  id: string;
  text: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  type: "note" | "stage_change" | "system";
}

interface Props {
  jobId: string;
  initialNotes: Note[];
  currentUserName: string;
}

export function NotesTab({ jobId, initialNotes, currentUserName }: Props) {
  const [notes, setNotes] = useState(initialNotes);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim() }),
      });
      if (res.ok) {
        const note = await res.json();
        setNotes((prev) => [note, ...prev]);
        setText("");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Add note */}
      <div className="flex gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a note..."
          rows={2}
          className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
        <button
          onClick={submit}
          disabled={submitting || !text.trim()}
          className="self-end px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
        >
          {submitting ? "..." : "Add"}
        </button>
      </div>

      {/* Notes list */}
      {notes.length === 0 ? (
        <p className="text-sm text-gray-500 py-4 text-center">No notes yet</p>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div key={note.id} className="border-l-2 border-gray-200 pl-4 py-1">
              {note.type === "stage_change" ? (
                <p className="text-sm text-gray-500 italic">{note.text}</p>
              ) : (
                <p className="text-sm text-gray-900">{note.text}</p>
              )}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-medium text-gray-500">{note.authorName}</span>
                <span className="text-xs text-gray-400">
                  {new Date(note.createdAt).toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
