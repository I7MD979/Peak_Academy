import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { checkRole } from "../middleware/checkRole.js";
import { success, error } from "../utils/response.js";
import {
  getSessionForEnroll,
  getEnrollmentOptionsForSession,
  checkFreeTrialUsed
} from "../services/enrollmentService.js";

const router = Router();

/** Master prompt: GET /enrollments/trial-status */
router.get("/trial-status", auth, checkRole("student"), async (req, res) => {
  try {
    const { teacher_id, subject_id, session_id } = req.query;
    if (!teacher_id || !subject_id) {
      return error(res, "معرّف المدرس والمادة مطلوبان", 400);
    }

    const used = await checkFreeTrialUsed(req.user.id, teacher_id, subject_id);
    let options = null;
    if (session_id) {
      const session = await getSessionForEnroll(session_id);
      if (session) {
        options = await getEnrollmentOptionsForSession(req.user.id, session);
      }
    }

    return success(res, {
      used,
      free_trial_available: !used,
      ...options
    });
  } catch (err) {
    return error(res, err.message || "فشل التحقق من الحصة التجريبية", 500);
  }
});

export default router;
