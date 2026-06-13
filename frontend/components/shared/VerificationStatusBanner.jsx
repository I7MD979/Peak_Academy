"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

export function VerificationStatusBanner({
  role,
  verificationStatus,
  rejectReason = "",
  className
}) {
  if (role === "student" && verificationStatus === "unverified") {
    return (
      <div
        className={cn(
          "flex flex-col gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 sm:flex-row sm:items-center sm:justify-between",
          className
        )}
      >
        <p className="text-sm text-auth-on-surface">
          وثّق حسابك برفع صورة بطاقتك الدراسية لمزيد من المميزات
        </p>
        <Link
          href="/student/profile/verification"
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-amber-500/20 px-4 py-2 text-sm font-bold text-amber-200 hover:bg-amber-500/30"
        >
          رفع الآن
        </Link>
      </div>
    );
  }

  if (role === "teacher" && verificationStatus === "unverified") {
    return (
      <div
        className={cn(
          "flex flex-col gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 sm:flex-row sm:items-center sm:justify-between",
          className
        )}
      >
        <div>
          <p className="text-sm font-bold text-auth-on-surface">وثّق هويتك كمدرس</p>
          <p className="mt-1 text-xs text-auth-on-surface-variant">
            ارفع صورة الرقم القومي (إلزامي) وكرت النقابة (اختياري) — لن تتمكن من بدء الجلسات قبل اعتماد الإدارة
          </p>
        </div>
        <Link
          href="/teacher/profile/verification"
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-amber-500/20 px-4 py-2 text-sm font-bold text-amber-200 hover:bg-amber-500/30"
        >
          رفع المستندات
        </Link>
      </div>
    );
  }

  if (role === "teacher" && verificationStatus === "pending_review") {
    return (
      <div
        className={cn(
          "rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4 text-sm text-auth-on-surface",
          className
        )}
      >
        حسابك قيد المراجعة — لن تتمكن من بدء جلسات صوتية أو إنشاء حصص حتى يعتمدك فريق الإدارة.
      </div>
    );
  }

  if (role === "teacher" && verificationStatus === "rejected") {
    return (
      <div
        className={cn(
          "flex flex-col gap-3 rounded-2xl border border-danger/30 bg-danger/10 p-4 sm:flex-row sm:items-center sm:justify-between",
          className
        )}
      >
        <div>
          <p className="text-sm font-bold text-auth-on-surface">تم رفض مستندات التحقق</p>
          {rejectReason ? (
            <p className="mt-1 text-xs text-auth-on-surface-variant">السبب: {rejectReason}</p>
          ) : null}
        </div>
        <Link
          href="/teacher/profile/verification"
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-danger/20 px-4 py-2 text-sm font-bold text-danger hover:bg-danger/30"
        >
          إعادة الرفع
        </Link>
      </div>
    );
  }

  return null;
}
