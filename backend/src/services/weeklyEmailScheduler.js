const { listDueWeeklySubscriptions, bumpWeeklySubscription, createNotification } = require("../data/mediumStore");
const { publish } = require("./notificationHub");

async function runWeeklyDigestTick() {
  const due = await listDueWeeklySubscriptions(new Date().toISOString());
  for (const sub of due) {
    const notification = await createNotification({
      id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      user_id: sub.parent_id,
      type: "weekly_report",
      title: "Weekly student report is ready",
      body: `Weekly digest generated for student ${sub.student_id}`,
      is_read: false,
      created_at: new Date().toISOString()
    });
    publish(sub.parent_id, notification);
    await bumpWeeklySubscription(sub.id, sub.day_of_week, sub.hour_utc);
  }
  return due.length;
}

function startWeeklyEmailScheduler() {
  const enabled = process.env.FF_WEEKLY_EMAILS !== "false";
  if (!enabled) return;

  setInterval(async () => {
    try {
      await runWeeklyDigestTick();
    } catch (error) {
      console.error("weekly scheduler tick failed", error.message);
    }
  }, 60 * 1000);
}

module.exports = { startWeeklyEmailScheduler, runWeeklyDigestTick };
