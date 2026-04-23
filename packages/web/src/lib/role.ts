/**
 * Role + shared state helpers.
 *
 * Inferentia's hackathon demo is designed as TWO simultaneous browser
 * windows (per Part 6 of the design notes): one for the clinician, one
 * for the patient. They share session state through `localStorage` so a
 * clinician signing the program in window A updates what the patient
 * sees in window B.
 *
 * In fase 2 this becomes a real backend (audit log, auth, per-session
 * tokens). For the hackathon: same device, same origin, two tabs.
 */

export type Role = "clinico" | "paciente";

/** Keys used across windows. All client-side, intentionally. */
export const STORAGE_KEYS = {
  session: "inferentia:last_session",
  program: "inferentia:last_program",
  panel: "inferentia:last_agency",
} as const;

/**
 * Subscribe to cross-tab storage updates for any of the Inferentia keys.
 * Returns the unsubscribe function.
 */
export function subscribeSharedState(
  onChange: (key: string) => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (e: StorageEvent) => {
    if (!e.key) return;
    const known = Object.values(STORAGE_KEYS) as string[];
    if (known.includes(e.key)) onChange(e.key);
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

/** Safe JSON read from localStorage. */
export function readStored<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Safe JSON write to localStorage. */
export function writeStored(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // quota / disabled storage — best effort only
  }
}

export function clearStored(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // noop
  }
}
