import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  type User,
} from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { getFirebaseAuth, getDb } from "@/config/firebaseInit";
import type { AppUser } from "@/types";
import { ROLE } from "@/constants/roles";

interface AuthContextValue {
  firebaseUser: User | null;
  appUser: AppUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (!user) {
        setAppUser(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!firebaseUser) return;
    const db = getDb();
    const ref = doc(db, "users", firebaseUser.uid);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          // Debug: nếu thiếu field quan trọng, log ra console
          if (!data.role || !data.branch) {
            console.warn(
              "[AuthProvider] User doc thiếu field quan trọng:",
              { uid: firebaseUser.uid, email: firebaseUser.email, data },
            );
          }
          setAppUser({ uid: firebaseUser.uid, ...(data as Omit<AppUser, "uid">) });
        } else {
          console.warn(
            "[AuthProvider] User đã đăng nhập nhưng KHÔNG có doc users/{uid}:",
            { uid: firebaseUser.uid, email: firebaseUser.email },
          );
          setAppUser(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error("[AuthProvider] Lỗi khi đọc users/{uid}:", err.code, err.message);
        setAppUser(null);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [firebaseUser]);

  const value = useMemo<AuthContextValue>(
    () => ({
      firebaseUser,
      appUser,
      loading,
      signIn: async (email, password) => {
        const auth = getFirebaseAuth();
        await signInWithEmailAndPassword(auth, email, password);
      },
      signOut: async () => {
        const auth = getFirebaseAuth();
        await fbSignOut(auth);
      },
    }),
    [firebaseUser, appUser, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function isAdmin(role?: string | null): boolean {
  return role === ROLE.ADMIN;
}

export function isBranchManager(role?: string | null): boolean {
  return role === ROLE.OPERATION_MANAGER;
}