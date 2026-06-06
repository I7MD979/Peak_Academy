"use client";

import AvatarUpload from "@/components/profile/AvatarUpload";
import TeacherPersonalInfoFields from "@/components/teacher/TeacherPersonalInfoFields";
import { teacherCardSolid, teacherMuted } from "@/lib/teacher-styles";
import { cn } from "@/lib/utils";

export default function TeacherProfilePersonalSection({
  profile,
  form,
  fieldErrors = {},
  saving = false,
  onChange
}) {
  if (!profile) return null;

  return (
    <section className={cn(teacherCardSolid, "space-y-4 p-5 md:p-6")}>
      <div>
        <h2 className="text-lg font-black text-auth-on-surface">البيانات الأساسية</h2>
        <p className={cn("mt-1 text-sm", teacherMuted)}>معلومات التواصل والهوية الظاهرة للطلاب.</p>
      </div>
      <AvatarUpload
        name={form.full_name || profile.full_name}
        avatarUrl={form.avatar_url || profile.avatar_url}
        disabled={saving}
        onUploaded={(url) => onChange?.("avatar_url")({ target: { value: url } })}
      />
      <TeacherPersonalInfoFields
        form={form}
        fieldErrors={fieldErrors}
        email={profile.email}
        onChange={onChange}
        disabled={saving}
      />
    </section>
  );
}
