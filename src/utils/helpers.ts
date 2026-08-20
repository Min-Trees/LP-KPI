import type { ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]): string {
  return inputs
    .flat()
    .filter((x) => typeof x === "string" && x.length > 0)
    .join(" ");
}

export function formatDate(iso?: string | null): string {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleDateString("vi-VN");
  } catch {
    return iso;
  }
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString("vi-VN");
  } catch {
    return iso;
  }
}

export function generateId(prefix = "id"): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}