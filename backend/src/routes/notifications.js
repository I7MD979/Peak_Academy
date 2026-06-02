import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { supabase } from "../lib/supabase.js";
import { success, error } from "../utils/response.js";

const router = Router();

router.get("/", auth, async (req, res) => {
  try {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false });
    return success(res, data || []);
  } catch (_err) {
    return error(res, "Failed to fetch notifications", 500);
  }
});

export default router;
