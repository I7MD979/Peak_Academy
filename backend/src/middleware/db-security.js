/**
 * Database Security Layer
 * OWASP A03 (Injection) | OWASP A01 (Access Control)
 * CWE-89 (SQL Injection) | CWE-284 (Improper Access Control)
 * NIST SI-10 (Information Input Validation)
 */

const DANGEROUS_POSTGRES_PATTERNS = [
  /;\s*(DROP|TRUNCATE|ALTER|CREATE|GRANT|REVOKE|INSERT|UPDATE|DELETE)\s/i,
  /--\s/,
  /\/\*[\s\S]*?\*\//,
  /\bEXEC(UTE)?\s*\(/i,
  /\bCAST\s*\(/i,
  /\bCONVERT\s*\(/i,
  /\bDECLARE\s+@/i,
  /\bWAITFOR\s+DELAY/i,
  /\bBENCHMARK\s*\(/i,
  /\bSLEEP\s*\(/i,
  /\bLOAD_FILE\s*\(/i,
  /\bINTO\s+OUTFILE/i,
  /\bINFORMATION_SCHEMA/i,
  /\bpg_sleep\s*\(/i,
  /\bcopy\s+\w+\s+from/i
];

export function sanitizeDbInput(value) {
  if (typeof value !== "string") return value;

  for (const pattern of DANGEROUS_POSTGRES_PATTERNS) {
    if (pattern.test(value)) {
      console.warn(`[db-security] dangerous pattern detected: ${value.substring(0, 50)}`);
      throw new Error("مدخلات غير مقبولة");
    }
  }

  // eslint-disable-next-line no-control-regex
  return value.replace(/\x00/g, "");
}

export function enforceRLS(tableName, userId, role) {
  if (role === "admin") return {};

  const rlsMap = {
    users: { column: "id", value: userId },
    student_profiles: { column: "user_id", value: userId },
    teacher_profiles: { column: "user_id", value: userId },
    payments: { column: "student_id", value: userId },
    enrollments: { column: "student_id", value: userId },
    session_enrollments: { column: "student_id", value: userId },
    questions: { column: "student_id", value: userId },
    withdrawal_requests: { column: "teacher_id", value: userId },
    notifications: { column: "user_id", value: userId },
    student_subscriptions: { column: "student_id", value: userId }
  };

  return rlsMap[tableName] || {};
}

export function safePagination(page, limit, maxLimit = 50) {
  const safePage = Math.max(1, Math.min(parseInt(page, 10) || 1, 10000));
  const safeLimit = Math.max(1, Math.min(parseInt(limit, 10) || 20, maxLimit));
  const from = (safePage - 1) * safeLimit;
  const to = from + safeLimit - 1;
  return { page: safePage, limit: safeLimit, from, to };
}

export function handleDbError(error, context = "") {
  if (!error) return null;

  if (process.env.NODE_ENV === "production") {
    console.error(`[db] ${context}:`, error.message, error.code);
    return new Error("خطأ في قاعدة البيانات");
  }

  return error;
}

export function filterAllowedFields(data, allowedFields) {
  if (!data || typeof data !== "object") return {};
  return Object.fromEntries(Object.entries(data).filter(([key]) => allowedFields.includes(key)));
}

export const ALLOWED_UPDATE_FIELDS = {
  users: ["full_name", "phone", "avatar_url", "bio"],
  teacher_profiles: ["bio", "subjects", "grades", "experience_years", "education", "social_url"],
  student_profiles: ["grade", "section"],
  sessions: ["title", "description", "scheduled_at", "max_students", "price", "status"]
};

export async function withQueryTimeout(queryPromise, timeoutMs = 10000, context = "") {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Query timeout: ${context}`)), timeoutMs)
  );

  try {
    return await Promise.race([queryPromise, timeout]);
  } catch (err) {
    if (err.message.includes("Query timeout")) {
      console.error(`[db] timeout in ${context}`);
      throw new Error("استغرق الطلب وقتاً طويلاً");
    }
    throw err;
  }
}
