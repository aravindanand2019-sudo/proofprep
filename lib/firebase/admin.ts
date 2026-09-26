// Firebase Admin SDK for API routes, server components and scripts. Never import
// from client components. Uses relative/package imports only, so scripts/seed.ts
// can load it with plain Node.
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";
import { z } from "zod";

const ADMIN_APP_NAME = "proofprep-admin";

const AdminEnvSchema = z.object({
  FIREBASE_ADMIN_PROJECT_ID: z.string().min(1),
  FIREBASE_ADMIN_CLIENT_EMAIL: z.string().min(1),
  FIREBASE_ADMIN_PRIVATE_KEY: z.string().min(1),
  // An empty value in .env.local counts as unset.
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z
    .string()
    .transform((value) => value || undefined)
    .optional(),
});

function readAdminEnv(): z.infer<typeof AdminEnvSchema> {
  const result = AdminEnvSchema.safeParse(process.env);
  if (!result.success) {
    const missing = result.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Firebase Admin env missing or empty: ${missing}. See .env.example.`);
  }
  return result.data;
}

function createAdminApp(): App {
  const env = readAdminEnv();
  const app = initializeApp(
    {
      credential: cert({
        projectId: env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: env.FIREBASE_ADMIN_CLIENT_EMAIL,
        // Env files and Vercel store the key with literal "\n" sequences.
        privateKey: env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, "\n"),
      }),
      storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    },
    ADMIN_APP_NAME,
  );
  // Optional fields are omitted rather than written as undefined.
  getFirestore(app).settings({ ignoreUndefinedProperties: true });
  return app;
}

export function getAdminApp(): App {
  const existing = getApps().find((app) => app.name === ADMIN_APP_NAME);
  return existing ?? createAdminApp();
}

export function getAdminDb(): Firestore {
  return getFirestore(getAdminApp());
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}

export function getAdminStorage(): Storage {
  return getStorage(getAdminApp());
}
