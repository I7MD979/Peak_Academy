import { Router } from "express";
import { z } from "zod";
import { auth } from "../middleware/auth.js";
import { checkRole } from "../middleware/checkRole.js";
import { supabase } from "../lib/supabase.js";
import { isValidGrade } from "../lib/grades.js";
import { success, error } from "../utils/response.js";
import {
  countActiveRoomMembers,
  getStudyRoomsOverview,
  joinStudyRoom,
  leaveRoom,
  markRoomStatus,
  SUBJECT_LABELS
} from "../services/studyRoomsService.js";

const router = Router();

const VALID_SUBJECT_KEYS = Object.keys(SUBJECT_LABELS).filter((k) => k !== "general");

async function getStudentGrade(userId) {
  const { data: student, error: studentError } = await supabase
    .from("student_profiles")
    .select("grade")
    .eq("user_id", userId)
    .maybeSingle();

  if (studentError || !student?.grade) return null;
  return student.grade;
}

router.get("/", auth, checkRole("student"), async (req, res) => {
  try {
    const grade = await getStudentGrade(req.user.id);
    if (!grade) {
      return error(res, "أكمل ملفك الدراسي (الصف) قبل الانضمام لغرف المذاكرة", 400);
    }

    const subjectRaw = String(req.query.subject || "").trim().toLowerCase();
    if (subjectRaw && !VALID_SUBJECT_KEYS.includes(subjectRaw)) {
      return error(res, "المادة غير صالحة", 400);
    }

    const overview = await getStudyRoomsOverview(req.user.id, grade, {
      subject: subjectRaw || null
    });
    return success(res, { grade, ...overview });
  } catch (err) {
    if (process.env.NODE_ENV !== "production") console.error("GET /study-rooms", err);
    return error(res, "تعذر تحميل غرف المذاكرة", 500);
  }
});

router.post("/join-random", auth, checkRole("student"), async (req, res) => {
  const parsed = z
    .object({
      subject: z.string().min(1).max(32),
      grade: z.string().optional()
    })
    .safeParse(req.body);

  if (!parsed.success) return error(res, "بيانات غير صالحة — اختر المادة", 400);

  const subjectKey = String(parsed.data.subject).trim().toLowerCase();
  if (!VALID_SUBJECT_KEYS.includes(subjectKey)) {
    return error(res, "المادة غير صالحة", 400);
  }

  try {
    const grade = parsed.data.grade || (await getStudentGrade(req.user.id));
    if (!grade || !isValidGrade(grade)) {
      return error(res, "حدد صفك الدراسي في الملف الشخصي أولاً", 400);
    }

    const result = await joinStudyRoom({
      userId: req.user.id,
      subject: subjectKey,
      grade
    });

    const message = result.already_member
      ? "أنت بالفعل في غرفة مذاكرة نشطة"
      : "تم الانضمام للغرفة بنجاح";

    return success(res, result, message);
  } catch (err) {
    return error(res, err.message || "تعذر الانضمام للغرفة", err.status || 500);
  }
});

router.post("/:roomId/join", auth, checkRole("student"), async (req, res) => {
  const roomId = String(req.params.roomId || "").trim();
  if (!roomId || roomId.length > 64) {
    return error(res, "معرّف الغرفة غير صالح", 400);
  }

  try {
    const grade = await getStudentGrade(req.user.id);
    if (!grade || !isValidGrade(grade)) {
      return error(res, "حدد صفك الدراسي في الملف الشخصي أولاً", 400);
    }

    const result = await joinStudyRoom({
      userId: req.user.id,
      grade,
      roomId
    });

    const message = result.already_member ? "أنت بالفعل في هذه الغرفة" : "تم الانضمام للغرفة";
    return success(res, result, message);
  } catch (err) {
    return error(res, err.message || "تعذر الانضمام للغرفة", err.status || 500);
  }
});

router.post("/:roomId/leave", auth, checkRole("student"), async (req, res) => {
  const roomId = String(req.params.roomId || "").trim();
  if (!roomId || roomId.length > 64) {
    return error(res, "معرّف الغرفة غير صالح", 400);
  }

  try {
    const leftAt = await leaveRoom(roomId, req.user.id);
    const activeMembers = await countActiveRoomMembers(roomId);
    if (activeMembers === 0) await markRoomStatus(roomId, "closed");

    return success(
      res,
      {
        room_id: roomId,
        left_at: leftAt,
        active_members: activeMembers
      },
      "تم مغادرة الغرفة"
    );
  } catch (err) {
    if (process.env.NODE_ENV !== "production") console.error("POST /study-rooms/leave", err);
    return error(res, "تعذر مغادرة الغرفة", 500);
  }
});

export default router;
