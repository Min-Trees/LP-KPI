import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  deleteDoc,
  where,
  orderBy,
  limit,
  type QueryConstraint,
} from "firebase/firestore";
import { getDb } from "@/config/firebaseInit";

export async function getDocument<T>(path: string, id: string): Promise<T | null> {
  const snap = await getDoc(doc(getDb(), path, id));
  return snap.exists() ? (snap.data() as T) : null;
}

export async function listCollection<T>(
  path: string,
  constraints: QueryConstraint[] = [],
): Promise<T[]> {
  const q = query(collection(getDb(), path), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as T) }));
}

export async function setDocument<T extends object>(
  path: string,
  id: string,
  data: T,
): Promise<void> {
  await setDoc(doc(getDb(), path, id), stripUndefined(data) as Record<string, unknown>);
}

export async function updateDocument<T extends object>(
  path: string,
  id: string,
  data: Partial<T>,
): Promise<void> {
  await updateDoc(doc(getDb(), path, id), stripUndefined(data) as Record<string, unknown>);
}

export async function deleteDocument(path: string, id: string): Promise<void> {
  await deleteDoc(doc(getDb(), path, id));
}

/**
 * Recursively strip `undefined` values from an object so it can be safely written
 * to Firestore (which rejects `undefined`). Empty objects inside arrays/objects are kept.
 */
export function stripUndefined<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) {
    return value.map((v) => stripUndefined(v)) as unknown as T;
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === undefined) continue;
      out[k] = stripUndefined(v);
    }
    return out as unknown as T;
  }
  return value;
}

export { where, orderBy, limit };