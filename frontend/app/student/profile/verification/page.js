"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import VerificationUpload from "@/components/shared/VerificationUpload";
import { SectionLoader } from "@/components/shared/LoadingSkeleton";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { accountApi } from "@/lib/api";

export default function StudentVerificationPage() {
  const [userId, setUserId] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  const reload = async (uid) => {
    const res = await accountApi.verificationStatus();
    setStatus(res?.data || null);
    if (!uid) {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        setUserId(user?.id || null);
        await reload(user?.id);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8">
        <SectionLoader message="جاري التحميل..." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 md:p-8">
      <AdminPageHeader
        eyebrow="التحقق من الهوية"
        title="وثّق حسابك"
        subtitle="رفع بطاقة الطالب اختياري — يزيد ثقة حسابك على المنصة"
      />

      {status?.verification_status === "pending_review" ? (
        <p className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 text-sm">
          مستندك قيد المراجعة من الإدارة.
        </p>
      ) : null}

      {status?.verification_status === "verified" ? (
        <p className="rounded-xl border border-success/30 bg-success/10 p-4 text-sm text-success">
          حسابك موثّق ✓
        </p>
      ) : null}

      {userId && status?.verification_status !== "verified" ? (
        <VerificationUpload
          docType="student_id"
          userId={userId}
          onSubmitted={() => reload(userId)}
        />
      ) : null}
    </div>
  );
}
