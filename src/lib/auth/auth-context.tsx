"use client";

import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { ensureUserProfile } from "@/lib/auth/user-profile";
import { auth, googleProvider } from "@/lib/firebase/client";
import {
  clearContactsAccess,
  setContactsOwner,
} from "@/services/google/contacts/access";

import {
  clearGooglePhotosAccess,
  setGooglePhotosAccount,
} from "@/services/google/photos";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (currentUser) => {
      setGooglePhotosAccount(currentUser?.uid ?? null);
      setContactsOwner(currentUser?.uid ?? null);
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        await ensureUserProfile(currentUser);
      }
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      signInWithGoogle: async () => {
        const result = await signInWithPopup(auth, googleProvider);
        await ensureUserProfile(result.user);
      },
      signOutUser: async () => {
        clearGooglePhotosAccess();
        clearContactsAccess();
        await signOut(auth);
      },
    }),
    [loading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
