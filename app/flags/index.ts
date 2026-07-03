/**
 * v1 has exactly one flag: which backend the app talks to. Real auth/live
 * mode ships in a later packet — this just keeps the seam explicit instead
 * of hardcoding "mock" everywhere.
 */
export type ApiMode = "mock" | "live";

export function getApiMode(): ApiMode {
  const fromEnv = import.meta.env.VITE_API_MODE;
  return fromEnv === "live" ? "live" : "mock";
}

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "https://api.kyndro.app/v1";
