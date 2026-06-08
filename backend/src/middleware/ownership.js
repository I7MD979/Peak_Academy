/**
 * Ownership & BOLA Protection Middleware
 * OWASP API1:2023 — Broken Object Level Authorization
 */

import { supabase } from "../lib/supabase.js";

export function ownedBy(table, ownerColumn = "user_id", paramName = "id") {
  return async (req, res, next) => {
    if (req.user?.role === "admin") return next();

    const resourceId = req.params[paramName];
    if (!resourceId) return next();

    try {
      const { data, error } = await supabase
        .from(table)
        .select(`id, ${ownerColumn}`)
        .eq("id", resourceId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        return res.status(404).json({
          success: false,
          error: "المورد غير موجود",
          code: "NOT_FOUND"
        });
      }

      if (data[ownerColumn] !== req.user.id) {
        return res.status(404).json({
          success: false,
          error: "المورد غير موجود",
          code: "NOT_FOUND"
        });
      }

      req.ownedResource = data;
      next();
    } catch (err) {
      console.error(`[ownership] ${table} check failed:`, err.message);
      return res.status(500).json({ success: false, error: "خطأ في التحقق من الملكية" });
    }
  };
}

export function scopeToUser(req, query, column = "user_id") {
  if (req.user?.role === "admin") return query;
  return query.eq(column, req.user.id);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function requireValidUUID(...paramNames) {
  return (req, res, next) => {
    for (const param of paramNames) {
      const val = req.params[param] || req.body?.[param];
      if (val && !UUID_RE.test(String(val))) {
        return res.status(400).json({
          success: false,
          error: `معرّف ${param} غير صالح`,
          code: "INVALID_UUID"
        });
      }
    }
    next();
  };
}

const PROTECTED_BODY_FIELDS = [
  "user_id",
  "owner_id",
  "actor_id",
  "created_by",
  "teacher_id",
  "student_id"
];

export function stripOwnershipFields(req, _res, next) {
  if (req.body && typeof req.body === "object" && !Array.isArray(req.body)) {
    if (req.user?.role !== "admin") {
      for (const field of PROTECTED_BODY_FIELDS) {
        if (field in req.body) delete req.body[field];
      }
    }
  }
  next();
}
