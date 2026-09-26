"use client";

// AuthProvider + useAuth(): Firebase Google Sign-In on the client. The server trusts only
// the httpOnly session cookie that signIn() obtains, so pages should read user data
// through server components or API routes, not from this hook.
import { onAuthStateChanged, type User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { signInWithGoogle, signOut as endSession } from "@/lib/auth/client";
import { getClientAuth } from "@/lib/firebase/client";

type AuthValue = {
  user: User | null;
  loading: boolean;
  /** Google popup → session cookie → navigates to /onboarding or /home. */
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      return onAuthStateChanged(getClientAuth(), (u) => {
        setUser(u);
        setLoading(false);
      });
    } catch {
      // Firebase client config missing: behave as signed out.
      const id = window.setTimeout(() => setLoading(false), 0);
      return () => window.clearTimeout(id);
    }
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      loading,
      signIn: async () => {
        const next = await signInWithGoogle();
        router.replace(next);
        router.refresh();
      },
      signOut: async () => {
        await endSession();
        router.replace("/");
        router.refresh();
      },
    }),
    [loading, router, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth() must be used inside <AuthProvider>.");
  return value;
}
