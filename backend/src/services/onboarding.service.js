import { supabase } from "../lib/supabase.js";
import { createUserNotification } from "./notification.service.js";
import { isMissingTableError } from "../utils/db-errors.js";

export async function completeOnboardingStep(userId, stepKey) {
  try {
    await supabase.from("user_onboarding").upsert(
      {
        user_id: userId,
        step_key: stepKey,
        completed_at: new Date().toISOString()
      },
      { onConflict: "user_id,step_key", ignoreDuplicates: true }
    );

    const { data: requiredSteps } = await supabase
      .from("onboarding_steps")
      .select("key")
      .eq("is_required", true);

    const { data: completedSteps } = await supabase
      .from("user_onboarding")
      .select("step_key")
      .eq("user_id", userId);

    const completedKeys = new Set((completedSteps || []).map((s) => s.step_key));
    const allDone = (requiredSteps || []).every((s) => completedKeys.has(s.key));

    if (allDone) {
      await createUserNotification({
        userId,
        type: "onboarding_complete",
        title: "🎉 أكملت الإعداد بنجاح!",
        body: "أنت الآن جاهز للبدء. استمتع بتجربة Peak Academy",
        titleAr: "🎉 أكملت الإعداد بنجاح!",
        bodyAr: "أنت الآن جاهز للبدء. استمتع بتجربة Peak Academy",
        actionUrl: "/student"
      });
    }
  } catch (err) {
    if (!isMissingTableError(err)) throw err;
  }
}

export async function getOnboardingProgress(userId) {
  try {
    const [{ data: steps }, { data: completed }] = await Promise.all([
      supabase.from("onboarding_steps").select("*").order("sort_order"),
      supabase.from("user_onboarding").select("step_key, completed_at").eq("user_id", userId)
    ]);

    const completedMap = Object.fromEntries((completed || []).map((c) => [c.step_key, c.completed_at]));

    const result = (steps || []).map((step) => ({
      ...step,
      completed: !!completedMap[step.key],
      completedAt: completedMap[step.key] || null
    }));

    const total = result.length;
    const done = result.filter((s) => s.completed).length;
    const progress = total ? Math.round((done / total) * 100) : 0;

    return { steps: result, total, done, progress };
  } catch (err) {
    if (isMissingTableError(err)) {
      return { steps: [], total: 0, done: 0, progress: 0 };
    }
    throw err;
  }
}
