"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  statusInfo,
  statusInfoSolid,
  statusWarning,
  statusWarningSolid,
  statusDanger,
  statusDangerSolid
} from "@/lib/semantic-styles";

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
          "flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between",
          statusWarning,
          className
        )}
      >
        <p className="text-sm text-auth-on-surface">
          وثّق حسابك برفع صورة بطاقتك الدراسية لمزيد من المميزات
        </p>
        <Link
          href="/student/profile/verification"
          className={cn("inline-flex shrink-0 items-center justify-center rounded-xl px-4 py-2 text-sm font-bold hover:opacity-90", statusWarningSolid)}
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
          "flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between",
          statusWarning,
          className
        )}
      >
        <div>
          <p className="text-sm font-bold text-auth-on-surface">وثّق هويتك كمدرس</p>
          <p className="mt-1 text-xs text-auth-on-surface-variant">
            ارفع صورة الرقم القومي (إلزامي) وكرت النقابة (اختياري) — لن تتمكن من إنشاء الجلسات أو دخول غرف الطلبة قبل اعتماد الإدارة
          </p>
        </div>
        <Link
          href="/teacher/profile/verification"
          className={cn("inline-flex shrink-0 items-center justify-center rounded-xl px-4 py-2 text-sm font-bold hover:opacity-90", statusWarningSolid)}
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
          "rounded-2xl border p-4 text-sm text-auth-on-surface",
          statusInfo,
          className
        )}
      >
        حسابك قيد المراجعة — لن تتمكن من إنشاء الجلسات أو دخول غرف الطلبة حتى يعتمدك فريق الإدارة.
      </div>
    );
  }

  if (role === "teacher" && verificationStatus === "rejected") {
    return (
      <div
        className={cn(
          "flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between",
          statusDanger,
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
          className={cn("inline-flex shrink-0 items-center justify-center rounded-xl px-4 py-2 text-sm font-bold hover:opacity-90", statusDangerSolid)}
        >
          إعادة الرفع
        </Link>
      </div>
    );
  }

  return null;
}
