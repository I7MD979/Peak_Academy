"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AuthPageLayout from "@/components/auth/AuthPageLayout";
import AuthFormCard from "@/components/auth/AuthFormCard";
import VerificationUpload from "@/components/shared/VerificationUpload";
import { createClient } from "@/lib/supabase/client";
import { studentBtnPrimary } from "@/lib/student-styles";
import { cn } from "@/lib/utils";

export default function TeacherVerificationPage() {
  const router = useRouter();
  const [userId, setUserId] = useState(null);
  const [nationalUploaded, setNationalUploaded] = useState(false);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data: { user } }) => {
        if (!user) {
          router.replace("/auth/login");
          return;
        }
        setUserId(user.id);
      });
  }, [router]);

  return (
    <AuthPageLayout>
      <AuthFormCard
        title="تحقق من هويتك"
        subtitle="ارفع مستنداتك لاعتماد حسابك كمدرس — لن تتمكن من بدء الجلسات حتى يوافق فريق الإدارة"
      >
        <p className="mb-4 text-sm text-on-surface-variant">
          حسابك قيد المراجعة من الإدارة. ستتمكن من بدء الجلسات الصوتية وإنشاء الحصص بعد الاعتماد.
        </p>

        {userId ? (
          <div className="space-y-4">
            <VerificationUpload
              docType="national_id"
              userId={userId}
              required
              onSubmitted={() => setNationalUploaded(true)}
            />
            <VerificationUpload docType="syndicate_card" userId={userId} />
          </div>
        ) : null}

        <button
          type="button"
          disabled={!nationalUploaded}
          onClick={() => router.replace("/teacher/dashboard")}
          className={cn(studentBtnPrimary, "mt-6 w-full disabled:opacity-50")}
        >
          متابعة إلى لوحة التحكم
        </button>
        {!nationalUploaded ? (
          <p className="mt-2 text-center text-xs text-on-surface-variant">
            ارفع صورة الرقم القومي على الأقل للمتابعة
          </p>
        ) : null}
      </AuthFormCard>
    </AuthPageLayout>
  );
}
