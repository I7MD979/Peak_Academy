import { Router } from "express";
import { z } from "zod";
import { auth } from "../middleware/auth.js";
import { checkRole } from "../middleware/checkRole.js";
import { supabase } from "../lib/supabase.js";
import { isValidGrade } from "../lib/grades.js";
import { success, error } from "../utils/response.js";
import { hasRoomAccess } from "../services/trialService.js";
import {
  countActiveRoomMembers,
  getStudyRoomsOverview,
  joinStudyRoom,
  leaveRoom,
  listTeacherSubjectRooms,
  markRoomStatus,
  SUBJECT_LABELS
} from "../services/studyRoomsService.js";
import {
  getRoomMessages,
  sendMessage,
  resolveQuestion,
  assignTA,
  isActiveMember
} from "../services/studyRoomChat.service.js";
import {
  startVoiceSession,
  joinVoiceSession,
  endVoiceSession,
  raiseHand,
  grantSpeak
} from "../services/studyRoomVoice.service.js";

const router = Router();

const VALID_SUBJECT_KEYS = Object.keys(SUBJECT_LABELS).filter((k) => k !== "general");

/** Gate: students need an active trial or paid subscription; teachers/admins bypass. */
async function requireRoomAccess(req, res, next) {
  if (req.user.role !== "student") return next();
  try {
    const access = await hasRoomAccess(req.user.id);
    if (!access) {
      return error(
        res,
        "يجب تفعيل التجربة المجانية أو الاشتراك للوصول إلى غرف المذاكرة",
        403,
        null,
        "NO_ROOM_ACCESS"
      );
    }
    next();
  } catch (_err) {
    return error(res, "تعذر التحقق من صلاحية الوصول", 500);
  }
}

async function getStudentGrade(userId) {
  const { data: student, error: studentError } = await supabase
    .from("student_profiles")
    .select("grade")
    .eq("user_id", userId)
    .maybeSingle();

  if (studentError || !student?.grade) return null;
  return student.grade;
}

router.get("/", auth, requireRoomAccess, async (req, res) => {
  try {
    const gradeParam = String(req.query.grade || "").trim();
    const grade = (gradeParam && isValidGrade(gradeParam))
      ? gradeParam
      : await getStudentGrade(req.user.id);

    if (!grade && req.user.role === "student") {
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

router.get("/teacher", auth, checkRole("teacher"), async (req, res) => {
  try {
    const { rooms, subjects } = await listTeacherSubjectRooms(req.user.id);
    if (!subjects.length) {
      return success(res, { rooms: [], subjects: [] }, "لم يتم تحديد مواد بعد");
    }
    return success(res, { rooms, subjects });
  } catch (err) {
    if (process.env.NODE_ENV !== "production") console.error("GET /study-rooms/teacher", err);
    return error(res, "تعذر تحميل الغرف", 500);
  }
});

router.post("/join-random", auth, async (req, res) => {
  // students require active trial or subscription; teachers/admins bypass
  if (req.user.role === "student") {
    const access = await hasRoomAccess(req.user.id).catch(() => false);
    if (!access) return error(res, "يجب الاشتراك للوصول للغرف", 403, null, "NO_ROOM_ACCESS");
  }

  const parsed = z
    .object({
      subject: z.string().min(1).max(32),
      grade:   z.string().optional()
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
      userId:   req.user.id,
      subject:  subjectKey,
      grade,
      userRole: req.user.role
    });

    const message = result.already_member
      ? "أنت بالفعل في غرفة مذاكرة نشطة"
      : "تم الانضمام للغرفة بنجاح";

    return success(res, result, message);
  } catch (err) {
    return error(res, err.message || "تعذر الانضمام للغرفة", err.status || 500);
  }
});

router.post("/:roomId/join", auth, async (req, res) => {
  const roomId = String(req.params.roomId || "").trim();
  if (!roomId || roomId.length > 64) {
    return error(res, "معرّف الغرفة غير صالح", 400);
  }

  // students require active trial or subscription; teachers/admins bypass
  if (req.user.role === "student") {
    const access = await hasRoomAccess(req.user.id).catch(() => false);
    if (!access) return error(res, "يجب الاشتراك للوصول للغرف", 403, null, "NO_ROOM_ACCESS");
  }

  try {
    let grade = null;
    if (req.user.role === "student") {
      grade = await getStudentGrade(req.user.id);
      if (!grade || !isValidGrade(grade)) {
        return error(res, "حدد صفك الدراسي في الملف الشخصي أولاً", 400);
      }
    } else {
      const { data: room } = await supabase
        .from("study_rooms")
        .select("grade")
        .eq("id", roomId)
        .maybeSingle();
      grade = room?.grade || "first";
    }

    const result = await joinStudyRoom({
      userId: req.user.id,
      grade,
      roomId,
      userRole: req.user.role
    });

    const message = result.already_member ? "أنت بالفعل في هذه الغرفة" : "تم الانضمام للغرفة";
    return success(res, result, message);
  } catch (err) {
    return error(res, err.message || "تعذر الانضمام للغرفة", err.status || 500);
  }
});

router.post("/:roomId/leave", auth, async (req, res) => {
  const roomId = String(req.params.roomId || "").trim();
  if (!roomId || roomId.length > 64) {
    return error(res, "معرّف الغرفة غير صالح", 400);
  }

  try {
    const isMember = await isActiveMember(roomId, req.user.id);
    if (!isMember) return error(res, "لست عضواً في هذه الغرفة", 403);

    const leftAt = await leaveRoom(roomId, req.user.id);
    const activeMembers = await countActiveRoomMembers(roomId);
    if (activeMembers === 0) await markRoomStatus(roomId, "closed");

    return success(
      res,
      { room_id: roomId, left_at: leftAt, active_members: activeMembers },
      "تم مغادرة الغرفة"
    );
  } catch (err) {
    if (process.env.NODE_ENV !== "production") console.error("POST /study-rooms/leave", err);
    return error(res, "تعذر مغادرة الغرفة", 500);
  }
});

// ── Chat Routes ──────────────────────────────────────────────────────────────

router.get("/:roomId/messages", auth, async (req, res) => {
  const { roomId } = req.params;
  const channel = ["general", "qa"].includes(req.query.channel) ? req.query.channel : "general";
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);
  const before = req.query.before || null;

  try {
    const member = await isActiveMember(roomId, req.user.id);
    if (!member) return error(res, "لست عضواً في هذه الغرفة", 403);

    const messages = await getRoomMessages(roomId, channel, limit, before);
    return success(res, { messages, channel });
  } catch (_err) {
    return error(res, "تعذر تحميل الرسائل", 500);
  }
});

const sendMessageSchema = z.object({
  channel:   z.enum(["general", "qa"]).default("general"),
  type:      z.enum(["text", "image", "voice_note", "question", "official_reply"]).default("text"),
  content:   z.string().min(1).max(4000).optional(),
  voice_url: z.string().url().optional(),
  image_url: z.string().url().optional(),
  reply_to:  z.string().uuid().optional()
}).refine(d => d.content || d.voice_url || d.image_url, {
  message: "الرسالة يجب أن تحتوي على نص أو ملف"
});

router.post("/:roomId/messages", auth, async (req, res) => {
  const { roomId } = req.params;
  const parsed = sendMessageSchema.safeParse(req.body);
  if (!parsed.success) return error(res, parsed.error.errors[0].message, 400);

  try {
    const member = await isActiveMember(roomId, req.user.id);
    if (!member) return error(res, "لست عضواً في هذه الغرفة", 403);

    const msg = await sendMessage({
      roomId,
      senderId:  req.user.id,
      channel:   parsed.data.channel,
      type:      parsed.data.type,
      content:   parsed.data.content,
      voiceUrl:  parsed.data.voice_url,
      imageUrl:  parsed.data.image_url,
      replyTo:   parsed.data.reply_to
    });
    return success(res, { message: msg }, "تم إرسال الرسالة");
  } catch (err) {
    return error(res, err.message || "تعذر إرسال الرسالة", err.status || 500);
  }
});

router.patch("/:roomId/messages/:messageId/resolve", auth, async (req, res) => {
  const { roomId, messageId } = req.params;
  try {
    await resolveQuestion(messageId, req.user.id, roomId);
    return success(res, null, "تم إغلاق السؤال");
  } catch (err) {
    return error(res, err.message || "تعذر إغلاق السؤال", err.status || 500);
  }
});

router.post("/:roomId/assign-ta", auth, async (req, res) => {
  const { roomId } = req.params;
  const parsed = z.object({ user_id: z.string().uuid() }).safeParse(req.body);
  if (!parsed.success) return error(res, "بيانات غير صالحة", 400);

  try {
    await assignTA(roomId, parsed.data.user_id, req.user.id);
    return success(res, null, "تم تعيين المساعد بنجاح");
  } catch (err) {
    return error(res, err.message || "تعذر تعيين المساعد", err.status || 500);
  }
});

// ── Voice Routes ──────────────────────────────────────────────────────────────

router.post("/:roomId/voice/start", auth, requireRoomAccess, async (req, res) => {
  const { roomId } = req.params;
  try {
    const session = await startVoiceSession(roomId, req.user.id);
    return success(res, { session }, "تم بدء الجلسة الصوتية");
  } catch (err) {
    return error(res, err.message || "تعذر بدء الجلسة", err.status || 500);
  }
});

router.post("/voice/:sessionId/join", auth, requireRoomAccess, async (req, res) => {
  const { sessionId } = req.params;
  const userName = req.user.full_name || req.user.email || req.user.id;
  try {
    const result = await joinVoiceSession(sessionId, req.user.id, userName);
    return success(res, result);
  } catch (err) {
    return error(res, err.message || "تعذر الانضمام للجلسة", err.status || 500);
  }
});

router.post("/voice/:sessionId/end", auth, requireRoomAccess, async (req, res) => {
  const { sessionId } = req.params;
  try {
    await endVoiceSession(sessionId, req.user.id);
    return success(res, null, "تم إنهاء الجلسة الصوتية");
  } catch (err) {
    return error(res, err.message || "تعذر إنهاء الجلسة", err.status || 500);
  }
});

router.post("/voice/:sessionId/raise-hand", auth, requireRoomAccess, async (req, res) => {
  const { sessionId } = req.params;
  try {
    await raiseHand(sessionId, req.user.id);
    return success(res, null, "تم رفع يدك");
  } catch (err) {
    return error(res, err.message || "تعذر رفع اليد", err.status || 500);
  }
});

router.post("/voice/:sessionId/grant-speak", auth, requireRoomAccess, async (req, res) => {
  const { sessionId } = req.params;
  const parsed = z.object({ user_id: z.string().uuid() }).safeParse(req.body);
  if (!parsed.success) return error(res, "بيانات غير صالحة", 400);

  try {
    await grantSpeak(sessionId, parsed.data.user_id, req.user.id);
    return success(res, null, "تم منح إذن الكلام");
  } catch (err) {
    return error(res, err.message || "تعذر منح إذن الكلام", err.status || 500);
  }
});

export default router;
