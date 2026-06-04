/**
 * Ensures API base URL always ends with /api (Railway root URLs often omit it).
 */
export function normalizeApiBaseUrl(raw) {
  const fallback = "http://localhost:4000/api";
  const trimmed = (raw || fallback).trim().replace(/\/$/, "");
  if (!trimmed) return fallback;
  if (trimmed.endsWith("/api")) return trimmed;
  return `${trimmed}/api`;
}
