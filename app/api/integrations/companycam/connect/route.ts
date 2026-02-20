import { NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/auth/session";
import { getCompanyRef, dateToTimestamp } from "@/src/lib/firestore/helpers";
import { CompanyCamClient } from "@/src/lib/api-clients/companycam";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { token } = await request.json();
  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  const client = new CompanyCamClient({ token });
  const connected = await client.testConnection();
  if (!connected) {
    return NextResponse.json({ error: "Failed to connect to CompanyCam. Check your token." }, { status: 400 });
  }

  await getCompanyRef(user.companyId).update({
    companycamToken: token,
    updatedAt: dateToTimestamp(new Date()),
  });

  return NextResponse.json({ success: true });
}
