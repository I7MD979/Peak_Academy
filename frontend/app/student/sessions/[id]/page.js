"use client";

import { useCallback, useEffect, useState } from "react";
import PaymentModal from "@/components/shared/PaymentModal";
import { PageLoader } from "@/components/shared/LoadingSkeleton";
import StudentSessionDetailView from "@/components/student/StudentSessionDetailPage";
import { studentApi, sessionsApi } from "@/lib/api";
import { pollTransactionFulfillment } from "@/lib/paymob";
import { mapSessionForCard } from "@/lib/session-mapper";
import { sessionDetailTxKey } from "@/lib/student-session-detail";

export default function StudentSessionDetailsRoute({ params }) {
  const [showPayment, setShowPayment] = useState(false);
  const [raw, setRaw] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadSession = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await studentApi.session(params.id);
      const data = res?.data;
      setRaw(data);
      setSession(mapSessionForCard(data, { isEnrolled: data?.is_enrolled }));
    } catch (err) {
      setRaw(null);
      setSession(null);
      setError(err.message || "تعذر تحميل الجلسة");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  useEffect(() => {
    let active = true;

    async function verifyPendingPayment() {
      const txId = sessionStorage.getItem(sessionDetailTxKey(params.id));
      if (!txId) return;

      try {
        const fulfilled = await pollTransactionFulfillment(txId, {
          kind: "session",
          sessionId: params.id
        });
        if (!active) return;
        sessionStorage.removeItem(sessionDetailTxKey(params.id));
        if (fulfilled) await loadSession();
      } catch {
        sessionStorage.removeItem(sessionDetailTxKey(params.id));
      }
    }

    verifyPendingPayment();

    return () => {
      active = false;
    };
  }, [params.id, loadSession]);

  const handleCancelEnrollment = async () => {
    if (!session || !confirm("هل تريد إلغاء التسجيل؟")) return;
    try {
      await sessionsApi.cancelEnrollment(session.id);
      await loadSession();
    } catch (err) {
      alert(err.message || "تعذر الإلغاء");
    }
  };

  if (loading) {
    return <PageLoader />;
  }

  return (
    <StudentSessionDetailView
      session={session}
      raw={raw}
      error={error}
      showPayment={showPayment}
      onShowPayment={() => setShowPayment(true)}
      onClosePayment={() => setShowPayment(false)}
      onCancelEnrollment={handleCancelEnrollment}
      onReload={loadSession}
      paymentModal={
        session ? (
          <PaymentModal
            session={session}
            checkoutOptions={{
              free_trial_available: raw?.free_trial_available,
              active_subscription: raw?.active_subscription,
              seats_left: raw?.seats_left,
              low_seats: raw?.low_seats
            }}
            onClose={() => setShowPayment(false)}
            onSuccess={() => loadSession()}
          />
        ) : null
      }
    />
  );
}
