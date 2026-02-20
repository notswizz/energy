"use client";

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { firebaseConfig } from "./config";

let app: FirebaseApp;
let auth: Auth;

export function getClientApp(): FirebaseApp {
  if (!app && getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  }
  return app || getApps()[0];
}

export function getClientAuth(): Auth {
  if (!auth) {
    auth = getAuth(getClientApp());
  }
  return auth;
}
