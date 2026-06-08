import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { success, error } from "../utils/response.js";
import { completeOnboardingStep, getOnboardingProgress } from "../services/onboarding.service.js";

const router = Router();

router.get("/progress", auth, async (req, res) => {
  try {
    const progress = await getOnboardingProgress(req.user.id);
    return success(res, progress);
  } catch (err) {
    return error(res, err.message || "تعذر تحميل التقدم", 500);
  }
});

router.post("/complete/:stepKey", auth, async (req, res) => {
  try {
    await completeOnboardingStep(req.user.id, req.params.stepKey);
    return success(res, { completed: req.params.stepKey });
  } catch (err) {
    return error(res, err.message || "تعذر إكمال الخطوة", 500);
  }
});

export default router;
