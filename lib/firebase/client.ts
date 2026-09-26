// Firebase client SDK (browser). Initialised lazily so importing this module
// never throws during build or server render when env vars are missing.
import {
  getApp,
  getApps,
  initializeApp,
  type FirebaseApp,
  type FirebaseOptions,
} from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { z } from "zod";

const ClientConfigSchema = z.object({
  apiKey: z.string().min(1),
  authDomain: z.string().min(1),
  projectId: z.string().min(1),
  storageBucket: z.string().min(1),
  messagingSenderId: z.string().min(1),
  appId: z.string().min(1),
});

// NEXT_PUBLIC_* vars are inlined at build time only when referenced literally.
function readClientConfig(): FirebaseOptions {
  const result = ClientConfigSchema.safeParse({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  });
  if (!result.success) {
    const missing = result.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Firebase client config missing or empty: ${missing}. See .env.example.`);
  }
  return result.data;
}

export function getClientApp(): FirebaseApp {
  return getApps().length > 0 ? getApp() : initializeApp(readClientConfig());
}

export function getClientAuth(): Auth {
  return getAuth(getClientApp());
}

export function getClientDb(): Firestore {
  return getFirestore(getClientApp());
}

export function getClientStorage(): FirebaseStorage {
  return getStorage(getClientApp());
}
