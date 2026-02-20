import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAuth, type Auth } from "firebase-admin/auth";

let app: App;
let db: Firestore;
let auth: Auth;

function getAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccount) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT environment variable is not set");
  }

  const parsed = JSON.parse(serviceAccount);
  app = initializeApp({ credential: cert(parsed) });

  // Must set before any Firestore operations
  const firestore = getFirestore(app);
  firestore.settings({ ignoreUndefinedProperties: true });

  return app;
}

export function getAdminDb(): Firestore {
  if (!db) {
    getAdminApp(); // ensures settings are applied
    db = getFirestore(getApps()[0]);
  }
  return db;
}

export function getAdminAuth(): Auth {
  if (!auth) {
    auth = getAuth(getAdminApp());
  }
  return auth;
}
