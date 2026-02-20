import { NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/auth/session";
import { getCompanyRef, dateToTimestamp } from "@/src/lib/firestore/helpers";
import { SnuggProClient } from "@/src/lib/api-clients/snuggpro";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { publicKey, privateKey, baseUrl } = await request.json();
  if (!publicKey || !privateKey) {
    return NextResponse.json({ error: "Both public key and private key are required" }, { status: 400 });
  }

  const client = new SnuggProClient({
    publicKey,
    privateKey,
    baseUrl: baseUrl || "https://api.snuggpro.com",
  });

  const connected = await client.testConnection();
  if (!connected) {
    return NextResponse.json({ error: "Failed to connect to SnuggPro. Check your API keys." }, { status: 400 });
  }

  await getCompanyRef(user.companyId).update({
    snuggproPublicKey: publicKey,
    snuggproPrivateKey: privateKey,
    snuggproBaseUrl: baseUrl || "https://api.snuggpro.com",
    updatedAt: dateToTimestamp(new Date()),
  });

  return NextResponse.json({ success: true });
}
