import { getCurrentUser } from "@/src/lib/auth/session";
import { getCrewRef } from "@/src/lib/firestore/helpers";
import { CrewPageClient } from "@/src/components/crew/crew-page-client";

export default async function CrewPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const snapshot = await getCrewRef(user.companyId).orderBy("name").get();
  const crew = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name || "",
      email: data.email || null,
      phone: data.phone || null,
      role: data.role || "",
    };
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Crew</h1>
      <CrewPageClient initialCrew={crew} />
    </div>
  );
}
