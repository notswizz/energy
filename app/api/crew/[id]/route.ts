import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { getCurrentUser } from "@/src/lib/auth/session";
import { getCrewMemberRef } from "@/src/lib/firestore/helpers";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const crewRef = getCrewMemberRef(user.companyId, id);
  const doc = await crewRef.get();
  if (!doc.exists) {
    return NextResponse.json({ error: "Crew member not found" }, { status: 404 });
  }

  const updates: Record<string, unknown> = { updatedAt: Timestamp.now() };
  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.email !== undefined) updates.email = body.email?.trim() || null;
  if (body.phone !== undefined) updates.phone = body.phone?.trim() || null;
  if (body.role !== undefined) updates.role = body.role?.trim() || "";

  await crewRef.update(updates);

  const updated = await crewRef.get();
  const data = updated.data()!;
  return NextResponse.json({
    id: updated.id,
    name: data.name,
    email: data.email || null,
    phone: data.phone || null,
    role: data.role || "",
    createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const crewRef = getCrewMemberRef(user.companyId, id);
  const doc = await crewRef.get();
  if (!doc.exists) {
    return NextResponse.json({ error: "Crew member not found" }, { status: 404 });
  }

  await crewRef.delete();
  return NextResponse.json({ success: true });
}
