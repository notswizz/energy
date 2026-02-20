import { cookies } from "next/headers";
import { getAdminAuth } from "@/src/lib/firebase/admin";
import { getUserRef } from "@/src/lib/firestore/helpers";
import type { AppUser } from "@/src/types";

const SESSION_COOKIE_NAME = "__session";
const SESSION_EXPIRY_MS = 5 * 24 * 60 * 60 * 1000; // 5 days

export async function createSessionCookie(idToken: string): Promise<string> {
  return getAdminAuth().createSessionCookie(idToken, {
    expiresIn: SESSION_EXPIRY_MS,
  });
}

export async function verifySessionCookie(
  sessionCookie: string
): Promise<{ uid: string; email: string } | null> {
  try {
    const decoded = await getAdminAuth().verifySessionCookie(sessionCookie, true);
    return { uid: decoded.uid, email: decoded.email || "" };
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<AppUser | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionCookie) return null;

  const verified = await verifySessionCookie(sessionCookie);
  if (!verified) return null;

  const userDoc = await getUserRef(verified.uid).get();
  if (!userDoc.exists) return null;

  const data = userDoc.data()!;
  return {
    uid: verified.uid,
    email: data.email,
    displayName: data.displayName,
    photoURL: data.photoURL || null,
    companyId: data.companyId,
    role: data.role,
    createdAt: data.createdAt?.toDate?.() || new Date(),
  };
}

export { SESSION_COOKIE_NAME };
