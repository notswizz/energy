import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { getCurrentUser } from "@/src/lib/auth/session";
import { getCrewRef } from "@/src/lib/firestore/helpers";
import { serializeCrewMember } from "@/src/lib/firestore/serialize";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const snapshot = await getCrewRef(user.companyId).orderBy("name").get();
  const crew = snapshot.docs.map(serializeCrewMember);

  return NextResponse.json({ crew });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  if (!body.name || typeof body.name !== "string" || body.name.trim().length === 0) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const now = Timestamp.now();
  const crewRef = getCrewRef(user.companyId).doc();

  const data = {
    name: body.name.trim(),
    email: body.email?.trim() || null,
    phone: body.phone?.trim() || null,
    role: body.role?.trim() || "",
    createdAt: now,
    updatedAt: now,
  };

  await crewRef.set(data);

  return NextResponse.json({
    id: crewRef.id,
    ...data,
    createdAt: now.toDate().toISOString(),
    updatedAt: now.toDate().toISOString(),
  });
}
