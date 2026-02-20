import { NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/auth/session";
import { syncCompanyCam } from "@/src/lib/sync";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await syncCompanyCam(user.companyId);
  return NextResponse.json(result);
}
