/**
 * Refund tiers per spec §7.
 * @param {{ amount: number }} payment
 * @param {{ start_time?: string, scheduled_at?: string, status?: string }} session
 * @param {string|Date} cancelledAt
 * @param {{ teacherCancelled?: boolean }} options
 */
export function calculateRefundAmount(payment, session, cancelledAt, options = {}) {
  if (options.teacherCancelled || session?.status === "cancelled") {
    return Number(payment?.amount || 0);
  }

  const sessionStart = new Date(session?.scheduled_at || session?.start_time);
  const cancellationTime = new Date(cancelledAt);
  if (Number.isNaN(sessionStart.getTime())) return 0;

  const hoursUntilSession = (sessionStart - cancellationTime) / (1000 * 60 * 60);
  const amount = Number(payment?.amount || 0);

  if (hoursUntilSession >= 24) return amount;
  if (hoursUntilSession >= 2) return amount * 0.5;
  return 0;
}
