"use client";

import Link from "next/link";
import { formatDateAr, formatGradeAr } from "@/lib/format";
import { teacherCardSolid, teacherMuted } from "@/lib/teacher-styles";
import { cn } from "@/lib/utils";

export default function TeacherProfileAccountAside({ profile, form, subjectsPreview = [] }) {
  if (!profile) return null;

  const commissionRate = Number(profile.teacher_profile?.commission_rate || 70);

  return (
    <aside className="space-y-4">
      <section className="rounded-xl border border-peak-orange/30 bg-peak-orange/10 p-5">
        <p className="text-sm text-auth-on-surface-variant">نسبة أرباحك من كل حصة</p>
        <p className="text-2xl font-black text-peak-orange">{commissionRate.toLocaleString("ar-EG")}%</p>
        <p className={cn("mt-1 text-xs", teacherMuted)}>
          المنصة تأخذ {(100 - commissionRate).toLocaleString("ar-EG")}% كرسوم خدمة
        </p>
      </section>

      <section className={cn(teacherCardSolid, "p-5")}>
        <h3 className="text-lg font-black text-auth-on-surface">ملخص الحساب</h3>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between gap-2 border-b border-auth-outline-variant/20 pb-2">
            <dt className="text-auth-on-surface-variant">الدور</dt>
            <dd className="font-bold text-auth-on-surface">مدرس</dd>
          </div>
          <div className="flex justify-between gap-2 border-b border-auth-outline-variant/20 pb-2">
            <dt className="text-auth-on-surface-variant">حالة الحساب</dt>
            <dd className={cn("font-bold", profile.is_active ? "text-success" : "text-danger")}>
              {profile.is_active ? "نشط" : "موقوف"}
            </dd>
          </div>
          <div className="flex justify-between gap-2 border-b border-auth-outline-variant/20 pb-2">
            <dt className="text-auth-on-surface-variant">عدد المواد</dt>
            <dd className="font-bold text-auth-on-surface">{subjectsPreview.length.toLocaleString("ar-EG")}</dd>
          </div>
          {form.grades?.length > 0 ? (
            <div className="border-b border-auth-outline-variant/20 pb-2">
              <dt className="text-auth-on-surface-variant">الصفوف</dt>
              <dd className="mt-1 flex flex-wrap gap-1">
                {form.grades.map((g) => (
                  <span key={g} className="rounded-full bg-auth-surface-low px-2 py-0.5 text-xs font-bold">
                    {formatGradeAr(g)}
                  </span>
                ))}
              </dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-2">
            <dt className="text-auth-on-surface-variant">تاريخ الانضمام</dt>
            <dd className="font-bold text-auth-on-surface">{formatDateAr(profile.created_at)}</dd>
          </div>
        </dl>
      </section>

      <section className={cn(teacherCardSolid, "p-5 text-sm")}>
        <p className="font-bold text-auth-on-surface">روابط سريعة</p>
        <ul className="mt-3 space-y-2">
          {[
            { href: "/teacher/sessions", label: "جلساتي" },
            { href: "/teacher/sessions/new", label: "جلسة جديدة" },
            { href: "/teacher/analytics", label: "تحليلاتي" }
          ].map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="font-bold text-peak-orange hover:underline">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}
