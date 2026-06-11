import { calculateMonthlyCommissions } from "../services/roomAttribution.service.js";

export async function runMonthlyCommissionsJob(month) {
  const target = month || getPreviousMonth();
  console.info(`[commission-job] calculating commissions for ${target}`);

  try {
    const result = await calculateMonthlyCommissions(target);
    console.info(`[commission-job] done — processed ${result.processed} teachers`);
    return result;
  } catch (err) {
    console.error("[commission-job] failed:", err.message);
    throw err;
  }
}

function getPreviousMonth() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 7);
}
