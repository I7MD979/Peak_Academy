export function isSchemaError(err) {
  if (!err) return false;
  const code = err.code || err?.error?.code;
  return code === "PGRST205" || code === "PGRST200" || code === "42P01";
}

export function isMissingTableError(err) {
  if (!err) return false;
  const code = err.code || err?.error?.code;
  return code === "PGRST205" || code === "42P01";
}

/** Never use HTTP 503 — browsers and devtools treat it as "wrong server / stale API". */
export function mapDbError(err) {
  if (!err) return { status: 500, message: "خطأ في قاعدة البيانات" };

  if (err.code === "PGRST205" || err.code === "42P01") {
    return {
      status: 500,
      message:
        "جداول قاعدة البيانات غير موجودة. نفّذ ملف backend/supabase/RUN_IN_SQL_EDITOR.sql في Supabase SQL Editor ثم أعد المحاولة."
    };
  }

  if (err.code === "PGRST200") {
    return {
      status: 500,
      message:
        "علاقات الجداول غير مكتملة. نفّذ backend/supabase/RUN_IN_SQL_EDITOR.sql في Supabase ثم من الإعدادات أعد تحميل Schema."
    };
  }

  return { status: 500, message: err.message || "خطأ في قاعدة البيانات" };
}

export const SQL_SETUP_HINT =
  "نفّذ backend/supabase/RUN_IN_SQL_EDITOR.sql في Supabase → SQL Editor (الملف كاملاً).";
