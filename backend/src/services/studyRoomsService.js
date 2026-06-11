import { randomUUID } from "crypto";
import { supabase } from "../lib/supabase.js";
import { normalizeTeacherSubjectKeys } from "../lib/subjects.js";
import { isMissingTableError } from "../utils/db-errors.js";
import { GRADE_LABELS as EXTENDED_GRADE_LABELS } from "../lib/grades.js";

function warnMissingStudyRooms(err) {
  if (process.env.NODE_ENV !== "production" && isMissingTableError(err)) {
    console.warn(
      "[study_rooms] tables missing — run backend/supabase/migrations/20260608_study_rooms.sql in Supabase SQL Editor"
    );
  }
}

export const SUBJECT_LABELS = {
  math: "رياضيات",
  physics: "فيزياء",
  chemistry: "كيمياء",
  biology: "أحياء",
  arabic: "لغة عربية",
  english: "لغة إنجليزية",
  history: "تاريخ",
  geography: "جغرافيا",
  general: "عام"
};

export const GRADE_LABELS = {
  first: "الأول الثانوي",
  second: "الثاني الثانوي",
  third: "الثالث الثانوي",
  ...EXTENDED_GRADE_LABELS
};

/** study_rooms table stores legacy first/second/third — map modern grades. */
export function normalizeStudyRoomGrade(grade) {
  const g = String(grade || "").trim();
  const map = {
    sec_first: "first",
    sec_second: "second",
    sec_third: "third",
    prep_first: "first",
    prep_second: "second",
    prep_third: "third"
  };
  return map[g] || g;
}

export function gradesMatchForStudyRoom(a, b) {
  return normalizeStudyRoomGrade(a) === normalizeStudyRoomGrade(b);
}

export const ROOM_STATUS_LABELS = {
  open: "متاحة",
  active: "نشطة",
  closed: "مغلقة"
};

export const SUBJECT_OPTIONS = Object.entries(SUBJECT_LABELS)
  .filter(([key]) => key !== "general")
  .map(([key, label]) => ({ key, label }));

function mapRoom(room, memberCount = 0) {
  if (!room) return null;
  const capacity = room.capacity ?? 6;
  return {
    ...room,
    subject_label: SUBJECT_LABELS[room.subject] || room.subject,
    grade_label: GRADE_LABELS[room.grade] || room.grade,
    status_label: ROOM_STATUS_LABELS[room.status] || room.status,
    member_count: memberCount,
    spots_left: Math.max(0, capacity - memberCount),
    is_full: memberCount >= capacity
  };
}

export async function countActiveRoomMembers(roomId) {
  const { count, error } = await supabase
    .from("study_room_members")
    .select("id", { count: "exact", head: true })
    .eq("room_id", roomId)
    .is("left_at", null);

  if (error) {
    if (isMissingTableError(error)) {
      warnMissingStudyRooms(error);
      return 0;
    }
    throw error;
  }
  return count || 0;
}

export async function findOpenStudyRoom(subject, grade) {
  const roomGrade = normalizeStudyRoomGrade(grade);
  const { data, error } = await supabase
    .from("study_rooms")
    .select("*")
    .eq("subject", subject)
    .eq("grade", roomGrade)
    .in("status", ["open", "active"])
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error)) return null;
    throw error;
  }
  return data;
}

export async function createStudyRoom(payload) {
  const { data, error } = await supabase.from("study_rooms").insert(payload).select("*").single();
  if (error) {
    if (isMissingTableError(error)) {
      throw Object.assign(
        new Error("غرف المذاكرة غير مفعّلة بعد — نفّذ migration study_rooms في Supabase"),
        { status: 503 }
      );
    }
    throw error;
  }
  return data;
}

export async function addRoomMember(payload) {
  const { data, error } = await supabase.from("study_room_members").insert(payload).select("*").single();
  if (error) throw error;
  return data;
}

export async function markRoomStatus(roomId, status) {
  const { error } = await supabase.from("study_rooms").update({ status }).eq("id", roomId);
  if (error) throw error;
}

export async function leaveRoom(roomId, userId) {
  const leftAt = new Date().toISOString();
  const { error } = await supabase
    .from("study_room_members")
    .update({ left_at: leftAt })
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .is("left_at", null);

  if (error) throw error;
  return leftAt;
}

export async function findStudentActiveMembership(userId) {
  const { data, error } = await supabase
    .from("study_room_members")
    .select("*, room:study_rooms(*)")
    .eq("user_id", userId)
    .is("left_at", null)
    .order("joined_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error)) {
      warnMissingStudyRooms(error);
      return null;
    }
    throw error;
  }
  if (!data?.room || data.room.status === "closed") return null;
  return data;
}

export async function listOpenRooms(grade, subject = null) {
  const roomGrade = normalizeStudyRoomGrade(grade);
  let query = supabase
    .from("study_rooms")
    .select("*")
    .eq("grade", roomGrade)
    .in("status", ["open", "active"])
    .order("created_at", { ascending: false })
    .limit(20);

  if (subject) query = query.eq("subject", subject);

  const { data, error } = await query;
  if (error) {
    if (isMissingTableError(error)) {
      warnMissingStudyRooms(error);
      return [];
    }
    throw error;
  }

  const rooms = data || [];
  const withCounts = await Promise.all(
    rooms.map(async (room) => {
      const count = await countActiveRoomMembers(room.id);
      return mapRoom(room, count);
    })
  );

  return withCounts.filter((room) => !room.is_full);
}

export async function getRoomMembersPreview(roomId, limit = 5) {
  const { data, error } = await supabase
    .from("study_room_members")
    .select("user_id, joined_at, user:users(id, full_name, avatar_url)")
    .eq("room_id", roomId)
    .is("left_at", null)
    .order("joined_at", { ascending: true })
    .limit(limit);

  if (error) throw error;

  return (data || []).map((row) => ({
    user_id: row.user_id,
    full_name: row.user?.full_name || "طالب",
    avatar_url: row.user?.avatar_url || null,
    joined_at: row.joined_at
  }));
}

export async function joinStudyRoom({ userId, subject, grade, roomId = null, userRole = "student" }) {
  const existing = await findStudentActiveMembership(userId);
  if (existing?.room) {
    const count = await countActiveRoomMembers(existing.room_id);
    return {
      already_member: true,
      room: mapRoom(existing.room, count),
      member: existing
    };
  }

  let room = null;

  if (roomId) {
    const { data, error } = await supabase.from("study_rooms").select("*").eq("id", roomId).single();
    if (error || !data) throw Object.assign(new Error("الغرفة غير موجودة"), { status: 404 });
    if (data.status === "closed") throw Object.assign(new Error("هذه الغرفة مغلقة"), { status: 400 });

    if (userRole === "teacher" && data.teacher_id && data.teacher_id !== userId) {
      throw Object.assign(new Error("هذه الغرفة لديها مدرس آخر"), { status: 403 });
    }

    if (userRole === "student" && !gradesMatchForStudyRoom(data.grade, grade)) {
      throw Object.assign(new Error("هذه الغرفة ليست لصفك"), { status: 403 });
    }

    if (userRole === "teacher" && !data.teacher_id) {
      await supabase.from("study_rooms").update({ teacher_id: userId }).eq("id", roomId);
      data.teacher_id = userId;
    }

    room = data;
  } else {
    if (!subject) throw Object.assign(new Error("اختر المادة أولاً"), { status: 400 });
    const subjectKey = String(subject).trim().toLowerCase();
    if (!SUBJECT_LABELS[subjectKey]) {
      throw Object.assign(new Error("المادة غير صالحة"), { status: 400 });
    }
    room = await findOpenStudyRoom(subjectKey, grade);
    if (!room) {
      room = await createStudyRoom({
        id:         randomUUID(),
        subject:    subjectKey,
        grade:      normalizeStudyRoomGrade(grade),
        status:     "open",
        capacity:   6,
        teacher_id: userRole === "teacher" ? userId : null
      });
    }
  }

  const count = await countActiveRoomMembers(room.id);
  if (userRole !== "teacher" && count >= room.capacity) {
    throw Object.assign(new Error("الغرفة ممتلئة حالياً"), { status: 409 });
  }

  const member = await addRoomMember({
    id:      randomUUID(),
    room_id: room.id,
    user_id: userId,
    role:    userRole === "teacher" ? "owner" : "student"
  });

  if (count + 1 >= 2) await markRoomStatus(room.id, "active");

  return {
    already_member: false,
    room: mapRoom(room, count + 1),
    member
  };
}

function normalizeTeacherSubjects(raw) {
  if (!Array.isArray(raw)) return [];
  const flattened = raw
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object") {
        return String(item.key || item.id || item.subject || item.label || "").trim();
      }
      return "";
    })
    .filter(Boolean);

  return normalizeTeacherSubjectKeys(flattened);
}

export async function listTeacherSubjectRooms(teacherUserId) {
  const { data: profile, error: profileErr } = await supabase
    .from("teacher_profiles")
    .select("subjects")
    .eq("user_id", teacherUserId)
    .maybeSingle();

  if (profileErr) throw profileErr;

  const subjects = normalizeTeacherSubjects(profile?.subjects);
  if (!subjects.length) {
    return { rooms: [], subjects: [] };
  }

  const { data: rooms, error: roomsErr } = await supabase
    .from("study_rooms")
    .select("*")
    .in("subject", subjects)
    .neq("status", "closed")
    .or(`teacher_id.is.null,teacher_id.eq.${teacherUserId}`)
    .order("created_at", { ascending: false });

  if (roomsErr) {
    if (isMissingTableError(roomsErr)) {
      warnMissingStudyRooms(roomsErr);
      return { rooms: [], subjects };
    }
    throw roomsErr;
  }

  const mapped = await Promise.all(
    (rooms || []).map(async (room) => {
      const memberCount = await countActiveRoomMembers(room.id);
      return {
        ...mapRoom(room, memberCount),
        is_mine: room.teacher_id === teacherUserId
      };
    })
  );

  return { rooms: mapped, subjects };
}

export async function getStudyRoomsOverview(userId, grade, { subject = null } = {}) {
  const membership = await findStudentActiveMembership(userId);
  let activeRoom = null;

  if (membership?.room) {
    const count = await countActiveRoomMembers(membership.room_id);
    const members = await getRoomMembersPreview(membership.room_id);
    activeRoom = {
      ...mapRoom(membership.room, count),
      is_member: true,
      joined_at: membership.joined_at,
      members
    };
  }

  const subjectFilter = subject ? String(subject).trim().toLowerCase() : null;
  const openRooms = grade ? await listOpenRooms(grade, subjectFilter) : [];

  return {
    grade_label: GRADE_LABELS[grade] || grade,
    subjects: SUBJECT_OPTIONS,
    active_room: activeRoom,
    open_rooms: openRooms,
    stats: {
      open_rooms_count: openRooms.length,
      in_room: Boolean(activeRoom),
      active_members: activeRoom?.member_count ?? 0
    }
  };
}
