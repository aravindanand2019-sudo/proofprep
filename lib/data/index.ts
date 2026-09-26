// Typed Firestore repository (server-only, Admin SDK). Every read is validated with Zod.
// Call these from API routes and server components only; the browser never writes.
export * from "./catalog";
export * from "./users";
export * from "./learning";
export * from "./scores";
export * from "./projects";
export * from "./coding";
