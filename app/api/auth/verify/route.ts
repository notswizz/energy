import { NextResponse } from "next/server";
import { verifySessionCookie } from "@/src/lib/auth/session";

export async function POST(request: Request) {
  try {
    const { sessionCookie } = await request.json();
    if (!sessionCookie) {
      return NextResponse.json({ valid: false }, { status: 400 });
    }

    const result = await verifySessionCookie(sessionCookie);
    if (result) {
      return NextResponse.json({ valid: true, uid: result.uid });
    }
    return NextResponse.json({ valid: false }, { status: 401 });
  } catch {
    return NextResponse.json({ valid: false }, { status: 401 });
  }
}
