import { isEnabled } from "../utils/featureFlags.js";

/** Master Prompt v2 schema — set FF_SCHEMA_V2=true after running 20260609 migration */
export function isSchemaV2() {
  return isEnabled("FF_SCHEMA_V2");
}

export const SCHEMA = {
  enrollmentsTable() {
    return isSchemaV2() ? "enrollments" : "session_enrollments";
  },
  paymentsTable() {
    return isSchemaV2() ? "payments" : "transactions";
  },
  parentLinksTable() {
    return isSchemaV2() ? "parent_children" : "parent_links";
  },
  confirmedEnrollmentStatuses() {
    return isSchemaV2() ? ["confirmed", "attended"] : ["enrolled", "attended"];
  },
  enrolledStatus() {
    return isSchemaV2() ? "confirmed" : "enrolled";
  },
  pendingEnrollmentStatus() {
    return isSchemaV2() ? "pending" : "enrolled";
  }
};

/** Session row field accessors (v2 columns with legacy fallbacks) */
export function sessionPrice(session) {
  return Number(session?.price ?? session?.price_per_student ?? 0);
}

export function sessionStartTime(session) {
  return session?.start_time ?? session?.scheduled_at;
}

export function sessionDuration(session) {
  return session?.duration_minutes ?? session?.duration_min ?? 60;
}

export function sessionSelectFields() {
  if (isSchemaV2()) {
    return "id, title, teacher_id, subject_id, subject, price, max_students, status, start_time, current_students, daily_room_url, daily_room_name";
  }
  return "id, title, teacher_id, subject_id, subject, price_per_student, max_students, status, scheduled_at";
}

export function mapEnrollmentResponse(enrollment, extras = {}) {
  return { enrollment, ...extras };
}

export function mapCheckoutResponse(payload) {
  const url = payload.checkout_url || payload.paymob_url || null;
  return {
    ...payload,
    checkout_url: url,
    paymob_url: url
  };
}
