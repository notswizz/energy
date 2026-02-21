"use client";

import { useRouter } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg } from "@fullcalendar/core";
import type { EventDropArg } from "@fullcalendar/core";

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: "audit" | "inspection";
  jobId: string;
}

interface Props {
  events: CalendarEvent[];
}

export function CalendarClient({ events }: Props) {
  const router = useRouter();

  const fcEvents = events.map((e) => ({
    id: e.id,
    title: e.title,
    date: e.date,
    backgroundColor: e.type === "audit" ? "#3b82f6" : "#a855f7",
    borderColor: e.type === "audit" ? "#2563eb" : "#9333ea",
    extendedProps: { jobId: e.jobId, type: e.type },
  }));

  const handleEventClick = (info: EventClickArg) => {
    const jobId = info.event.extendedProps.jobId;
    if (jobId) router.push(`/jobs/${jobId}`);
  };

  const handleEventDrop = async (info: EventDropArg) => {
    const jobId = info.event.extendedProps.jobId as string;
    const type = info.event.extendedProps.type as "audit" | "inspection";
    const newDate = info.event.startStr;

    const field = type === "audit" ? "auditDate" : "inspectionDate";
    const res = await fetch(`/api/jobs/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: newDate }),
    });

    if (!res.ok) {
      info.revert();
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-blue-500"></span>
          <span className="text-xs text-gray-600">Audit</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-purple-500"></span>
          <span className="text-xs text-gray-600">Inspection</span>
        </div>
      </div>
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek",
        }}
        events={fcEvents}
        editable={true}
        eventClick={handleEventClick}
        eventDrop={handleEventDrop}
        height="auto"
      />
    </div>
  );
}
