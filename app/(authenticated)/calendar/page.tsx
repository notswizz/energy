import { getCurrentUser } from "@/src/lib/auth/session";
import { getJobsRef } from "@/src/lib/firestore/helpers";
import { CalendarClient } from "@/src/components/calendar/calendar-client";

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: "audit" | "inspection";
  jobId: string;
}

export default async function CalendarPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const jobsSnapshot = await getJobsRef(user.companyId).get();

  const events: CalendarEvent[] = [];

  for (const doc of jobsSnapshot.docs) {
    const data = doc.data();
    const address = data.address?.raw || "Unknown";

    if (data.auditDate) {
      events.push({
        id: `${doc.id}-audit`,
        title: `Audit: ${address}`,
        date: data.auditDate,
        type: "audit",
        jobId: doc.id,
      });
    }

    if (data.inspectionDate) {
      events.push({
        id: `${doc.id}-inspection`,
        title: `Inspection: ${address}`,
        date: data.inspectionDate,
        type: "inspection",
        jobId: doc.id,
      });
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
      <CalendarClient events={events} />
    </div>
  );
}
