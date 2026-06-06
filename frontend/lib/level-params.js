/** Defaults when user arrives from landing hero tabs (?level=prep|sec). */

export const LEVEL_DEFAULTS = {
  prep: { school_level: "preparatory", grade: "prep_first" },
  sec: { school_level: "secondary", grade: "sec_third" }
};

export function parseLevelParam(level) {
  const key = String(level || "").toLowerCase();
  if (key === "prep") return LEVEL_DEFAULTS.prep;
  if (key === "sec") return LEVEL_DEFAULTS.sec;
  return LEVEL_DEFAULTS.sec;
}

export function registerHrefForLevel(level) {
  const key = String(level || "").toLowerCase();
  if (key === "prep" || key === "sec") return `/auth/register?level=${key}`;
  return "/auth/register";
}
