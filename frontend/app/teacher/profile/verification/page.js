"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import VerificationUpload from "@/components/shared/VerificationUpload";
import { SectionLoader } from "@/components/shared/LoadingSkeleton";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { accountApi } from "@/lib/api";
import { teacherBtnPrimary } from "@/lib/teacher-styles";
import { cn } from "@/lib/utils";

export default function TeacherVerificationPage() {
  const [userId, setUserId] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nationalUploaded, setNationalUploaded] = useState(false);

  const reload = async () => {
    const res = await accountApi.verificationStatus();
    const payload = res?.data || null;
    setStatus(payload);
    const hasNational = (payload?.documents || []).some(
      (doc) => doc.doc_type === "national_id" && doc.status !== "rejected"
    );
    setNationalUploaded(hasNational);
    return payload;
  };

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setUserId(user?.id || null);
        await reload();
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

  const verificationStatus = status?.verification_status || "unverified";
  const canUpload = verificationStatus !== "verified";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <AdminPageHeader
        eyebrow="التحقق من الهوية"
        title="وثّق حسابك كمدرس"
        subtitle="ارفع مستنداتك لاعتماد حسابك — لن تتمكن من بدء الجلسات أو إنشاء حصص قبل موافقة الإدارة"
      />

      {verificationStatus === "pending_review" ? (
        <p className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 text-sm text-auth-on-surface">
          مستنداتك قيد المراجعة من الإدارة. ستصلك رسالة عند الاعتماد أو في حال طلب مستندات جديدة.
        </p>
      ) : null}

      {verificationStatus === "verified" ? (
        <p className="rounded-xl border border-success/30 bg-success/10 p-4 text-sm text-success">
          حسابك موثّق — يمكنك بدء الجلسات وإنشاء الحصص.
        </p>
      ) : null}

      {verificationStatus === "rejected" ? (
        <p className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-auth-on-surface">
          تم رفض المستندات السابقة. ارفع نسخة أوضح أو مستنداً محدّثاً.
        </p>
      ) : null}

      {userId && canUpload ? (
        <div className="space-y-4">
          <VerificationUpload
            docType="national_id"
            userId={userId}
            required
            onSubmitted={async () => {
              await reload();
            }}
          />
          <VerificationUpload
            docType="syndicate_card"
            userId={userId}
            onSubmitted={async () => {
              await reload();
            }}
          />
        </div>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Link href="/teacher/dashboard" className={cn(teacherBtnPrimary, "text-center no-underline")}>
          {nationalUploaded || verificationStatus === "pending_review" || verificationStatus === "verified"
            ? "العودة للوحة التحكم"
            : "تخطي الآن — العودة للوحة"}
        </Link>
      </div>

      {!nationalUploaded && canUpload ? (
        <p className="text-center text-xs text-auth-on-surface-variant">
          الرقم القومي مطلوب لإرسال طلب المراجعة للإدارة
        </p>
      ) : null}
    </div>
  );
}
