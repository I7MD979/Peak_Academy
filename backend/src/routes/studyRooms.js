import { Router } from "express";
import { z } from "zod";
import { auth } from "../middleware/auth.js";
import { checkRole } from "../middleware/checkRole.js";
import { supabase } from "../lib/supabase.js";
import { success, error } from "../utils/response.js";
import {
  countActiveRoomMembers,
  getStudyRoomsOverview,
  joinStudyRoom,
  leaveRoom,
  markRoomStatus
} from "../services/studyRoomsService.js";

const router = Router();

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
    if (!grade) return error(res, "أكمل ملفك الدراسي (الصف) قبل الانضمام لغرف المذاكرة", 400);

    const overview = await getStudyRoomsOverview(req.user.id, grade);
    return success(res, { grade, ...overview });
  } catch (err) {
    if (process.env.NODE_ENV !== "production") console.error("GET /study-rooms", err);
    return error(res, "تعذر تحميل غرف المذاكرة", 500);
  }
});

router.post("/join-random", auth, checkRole("student"), async (req, res) => {
  const parsed = z
    .object({
      subject: z.string().min(2),
      grade: z.enum(["first", "second", "third"]).optional()
    })
    .safeParse(req.body);

  if (!parsed.success) return error(res, "بيانات غير صالحة — اختر المادة والصف", 400);

  try {
    const grade = parsed.data.grade || (await getStudentGrade(req.user.id));
    if (!grade) return error(res, "حدد صفك الدراسي في الملف الشخصي أولاً", 400);

    const result = await joinStudyRoom({
      userId: req.user.id,
      subject: parsed.data.subject,
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
  try {
    const grade = await getStudentGrade(req.user.id);
    if (!grade) return error(res, "حدد صفك الدراسي في الملف الشخصي أولاً", 400);

    const result = await joinStudyRoom({
      userId: req.user.id,
      grade,
      roomId: req.params.roomId
    });

    const message = result.already_member ? "أنت بالفعل في هذه الغرفة" : "تم الانضمام للغرفة";
    return success(res, result, message);
  } catch (err) {
    return error(res, err.message || "تعذر الانضمام للغرفة", err.status || 500);
  }
});

router.post("/:roomId/leave", auth, checkRole("student"), async (req, res) => {
  try {
    const leftAt = await leaveRoom(req.params.roomId, req.user.id);
    const activeMembers = await countActiveRoomMembers(req.params.roomId);
    if (activeMembers === 0) await markRoomStatus(req.params.roomId, "closed");

    return success(res, {
      room_id: req.params.roomId,
      left_at: leftAt,
      active_members: activeMembers
    }, "تم مغادرة الغرفة");
  } catch (_err) {
    return error(res, "تعذر مغادرة الغرفة", 500);
  }
});

export default router;
