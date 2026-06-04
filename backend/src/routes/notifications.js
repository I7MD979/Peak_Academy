import { Router } from "express";
import { auth, resolveAuthUserFromToken } from "../middleware/auth.js";
import { checkRole } from "../middleware/checkRole.js";
import { success, error } from "../utils/response.js";
import { subscribe, unsubscribe } from "../services/notificationHub.js";
import {
  countUnreadNotifications,
  createUserNotification,
  listUserNotifications,
  markAllNotificationsRead,
  markNotificationRead
} from "../services/notification.service.js";

const router = Router();

async function authenticateStream(req) {
  const token =
    req.headers.authorization?.replace("Bearer ", "") ||
    (typeof req.query.token === "string" ? req.query.token : "");

  const resolved = await resolveAuthUserFromToken(token);
  if (!resolved?.user) return null;
  const staff = resolved.user.role === "admin" || resolved.user.role === "parent";
  if (!resolved.profileReady && !staff) return null;
  return resolved.user;
}

router.get("/stream", async (req, res) => {
  const user = await authenticateStream(req);
  if (!user) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  subscribe(user.id, res);
  res.write(`event: connected\ndata: ${JSON.stringify({ ok: true })}\n\n`);

  const heartbeat = setInterval(() => {
    res.write(`: ping ${Date.now()}\n\n`);
  }, 25000);

  req.on("close", () => {
    clearInterval(heartbeat);
    unsubscribe(user.id, res);
  });
});

router.get("/unread-count", auth, async (req, res) => {
  try {
    const count = await countUnreadNotifications(req.user.id);
    return success(res, { count });
  } catch (_err) {
    return error(res, "تعذر تحميل عدد الإشعارات", 500);
  }
});

router.get("/", auth, async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const data = await listUserNotifications(req.user.id, { limit });
    return success(res, data);
  } catch (err) {
    if (process.env.NODE_ENV !== "production") console.error("GET /notifications", err);
    return error(res, "تعذر تحميل الإشعارات", 500);
  }
});

router.post("/", auth, checkRole("admin"), async (req, res) => {
  try {
    const { user_id, type, title, body } = req.body;
    if (!user_id || !title) {
      return error(res, "user_id و title مطلوبان", 400);
    }

    const notification = await createUserNotification({
      userId: user_id,
      type: type || "info",
      title,
      body: body || ""
    });

    return success(res, notification, "تم إرسال الإشعار", 201);
  } catch (_err) {
    return error(res, "تعذر إرسال الإشعار", 500);
  }
});

router.patch("/read-all", auth, async (req, res) => {
  try {
    await markAllNotificationsRead(req.user.id);
    return success(res, { read: true });
  } catch (_err) {
    return error(res, "تعذر تحديث الإشعارات", 500);
  }
});

router.patch("/:id/read", auth, async (req, res) => {
  try {
    const notification = await markNotificationRead(req.params.id, req.user.id);
    if (!notification) return error(res, "الإشعار غير موجود", 404);
    return success(res, notification);
  } catch (_err) {
    return error(res, "تعذر تحديث الإشعار", 500);
  }
});

export default router;
