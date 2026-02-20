import { NextResponse } from "next/server";
import { getAdminAuth } from "@/src/lib/firebase/admin";
import { createSessionCookie, SESSION_COOKIE_NAME } from "@/src/lib/auth/session";
import { getUserRef, getCompanyRef, dateToTimestamp } from "@/src/lib/firestore/helpers";

export async function POST(request: Request) {
  try {
    const { idToken } = await request.json();
    if (!idToken) {
      return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
    }

    // Verify the ID token first
    const decoded = await getAdminAuth().verifyIdToken(idToken);

    // Create session cookie
    const sessionCookie = await createSessionCookie(idToken);

    // Create or update user document
    const userRef = getUserRef(decoded.uid);
    const userDoc = await userRef.get();

    let companyId: string;

    if (!userDoc.exists) {
      // First-time user: create a company and user doc
      const companyRef = getCompanyRef(decoded.uid); // use uid as initial company ID
      companyId = companyRef.id;

      await companyRef.set({
        name: decoded.name || "My Company",
        snuggproPublicKey: null,
        snuggproPrivateKey: null,
        snuggproBaseUrl: "https://api.snuggpro.com",
        companycamToken: null,
        syncInterval: 60,
        createdAt: dateToTimestamp(new Date()),
        updatedAt: dateToTimestamp(new Date()),
      });

      await userRef.set({
        email: decoded.email || "",
        displayName: decoded.name || "",
        photoURL: decoded.picture || null,
        companyId,
        role: "admin",
        createdAt: dateToTimestamp(new Date()),
      });
    } else {
      companyId = userDoc.data()!.companyId;
      // Update last login info
      await userRef.update({
        displayName: decoded.name || userDoc.data()!.displayName,
        photoURL: decoded.picture || userDoc.data()!.photoURL,
      });
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 5 * 24 * 60 * 60, // 5 days in seconds
    });

    return response;
  } catch (error) {
    console.error("Session creation error:", error);
    return NextResponse.json({ error: "Failed to create session" }, { status: 401 });
  }
}
