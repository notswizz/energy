import { NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/auth/session";
import { getCompanyRef, dateToTimestamp } from "@/src/lib/firestore/helpers";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyDoc = await getCompanyRef(user.companyId).get();
  if (!companyDoc.exists) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const data = companyDoc.data()!;
  return NextResponse.json({
    name: data.name || "",
    snuggproApiKey: data.snuggproApiKey ? "••••••••" : null,
    snuggproBaseUrl: data.snuggproBaseUrl || "https://api.snuggpro.com",
    companycamToken: data.companycamToken ? "••••••••" : null,
    syncInterval: data.syncInterval || 60,
    hasSnuggpro: !!data.snuggproPublicKey && !!data.snuggproPrivateKey,
    hasCompanycam: !!data.companycamToken,
  });
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (user.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = await request.json();
  const updates: Record<string, unknown> = {
    updatedAt: dateToTimestamp(new Date()),
  };

  if (body.name !== undefined) updates.name = body.name;
  if (body.syncInterval !== undefined) updates.syncInterval = Math.max(5, body.syncInterval);

  await getCompanyRef(user.companyId).update(updates);

  return NextResponse.json({ success: true });
}
