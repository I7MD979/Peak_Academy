import { supabase } from "../lib/supabase.js";

const DOC_TYPES_BY_ROLE = {
  student: new Set(["student_id"]),
  teacher: new Set(["national_id", "syndicate_card"])
};

export function assertDocTypeForRole(role, docType) {
  const allowed = DOC_TYPES_BY_ROLE[role];
  if (!allowed?.has(docType)) {
    throw Object.assign(new Error("نوع المستند غير مسموح لهذا الدور"), { status: 400 });
  }
}

export function assertOwnedFilePath(userId, filePath) {
  const prefix = `${userId}/`;
  if (!filePath || typeof filePath !== "string" || !filePath.startsWith(prefix)) {
    throw Object.assign(new Error("مسار الملف غير صالح"), { status: 400 });
  }
  if (filePath.includes("..")) {
    throw Object.assign(new Error("مسار الملف غير صالح"), { status: 400 });
  }
}

async function logAccess(documentId, actorId, action) {
  const { error } = await supabase.from("verification_audit_log").insert({
    document_id: documentId,
    actor_id: actorId,
    action
  });
  if (error) throw error;
}

export const VerificationService = {
  logAccess,

  async recordSubmission(userId, docType, filePath) {
    assertOwnedFilePath(userId, filePath);

    const { data, error: insertErr } = await supabase
      .from("verification_documents")
      .insert({
        user_id: userId,
        doc_type: docType,
        file_path: filePath,
        status: "pending"
      })
      .select()
      .single();
    if (insertErr) throw insertErr;

    await supabase
      .from("users")
      .update({ verification_status: "pending_review" })
      .eq("id", userId)
      .in("verification_status", ["unverified", "rejected"]);

    return data;
  },

  async getStatus(userId) {
    const [{ data: user, error: userErr }, { data: docs, error: docsErr }] = await Promise.all([
      supabase.from("users").select("verification_status").eq("id", userId).maybeSingle(),
      supabase
        .from("verification_documents")
        .select("id, doc_type, file_path, status, reject_reason, reviewed_at, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20)
    ]);

    if (userErr) throw userErr;
    if (docsErr) throw docsErr;

    return {
      verification_status: user?.verification_status || "unverified",
      documents: docs || []
    };
  },

  async listPending({ docType, page = 1, limit = 20 } = {}) {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const from = (safePage - 1) * safeLimit;

    let query = supabase
      .from("verification_documents")
      .select(
        "id, user_id, doc_type, status, created_at, users(full_name, email, role)",
        { count: "exact" }
      )
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (docType) query = query.eq("doc_type", docType);

    const { data, error: listErr, count } = await query.range(from, from + safeLimit - 1);
    if (listErr) throw listErr;

    return { data: data || [], total: count || 0, page: safePage, limit: safeLimit };
  },

  async getSignedUrl(documentId, adminId) {
    const { data: doc, error: docErr } = await supabase
      .from("verification_documents")
      .select("file_path")
      .eq("id", documentId)
      .single();
    if (docErr) throw docErr;
    if (!doc.file_path) {
      throw Object.assign(new Error("المستند غير متاح"), { status: 404 });
    }

    const { data, error } = await supabase.storage
      .from("verification-docs")
      .createSignedUrl(doc.file_path, 300);
    if (error) throw error;

    try {
      await logAccess(documentId, adminId, "viewed");
    } catch (err) {
      console.warn("[verification] audit log (viewed) failed:", err.message || err);
    }

    return data.signedUrl;
  },

  async approve(documentId, adminId) {
    const { data: existing, error: fetchErr } = await supabase
      .from("verification_documents")
      .select("user_id, file_path")
      .eq("id", documentId)
      .single();
    if (fetchErr) throw fetchErr;

    const { data: doc, error: docErr } = await supabase
      .from("verification_documents")
      .update({
        status: "approved",
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString()
      })
      .eq("id", documentId)
      .select("user_id")
      .single();
    if (docErr) throw docErr;

    await supabase
      .from("users")
      .update({ verification_status: "verified", is_verified: true })
      .eq("id", doc.user_id);

    await supabase
      .from("teacher_profiles")
      .update({ id_verified: true })
      .eq("user_id", doc.user_id);

    if (existing.file_path) {
      const { error: removeErr } = await supabase.storage
        .from("verification-docs")
        .remove([existing.file_path]);
      if (removeErr) {
        console.warn("[verification] storage remove failed:", removeErr.message || removeErr);
      }

      const { error: clearErr } = await supabase
        .from("verification_documents")
        .update({ file_path: null })
        .eq("id", documentId);
      if (clearErr) {
        console.warn("[verification] clear file_path failed:", clearErr.message || clearErr);
      }
    }

    try {
      await logAccess(documentId, adminId, "approved");
    } catch (err) {
      console.warn("[verification] audit log (approved) failed:", err.message || err);
    }

    return { ok: true };
  },

  async reject(documentId, adminId, reason) {
    const { data: doc, error: docErr } = await supabase
      .from("verification_documents")
      .update({
        status: "rejected",
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
        reject_reason: reason || null
      })
      .eq("id", documentId)
      .select("user_id")
      .single();
    if (docErr) throw docErr;

    await supabase
      .from("users")
      .update({ verification_status: "rejected" })
      .eq("id", doc.user_id);

    try {
      await logAccess(documentId, adminId, "rejected");
    } catch (err) {
      console.warn("[verification] audit log (rejected) failed:", err.message || err);
    }

    return { ok: true };
  }
};
