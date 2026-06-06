"use client";

import AvatarUpload from "@/components/profile/AvatarUpload";
import ProfileSectionCard from "@/components/profile/ProfileSectionCard";
import StudentPersonalInfoFields from "@/components/student/StudentPersonalInfoFields";

export default function StudentProfilePersonalSection({
  profile,
  form,
  fieldErrors = {},
  saving = false,
  onChange,
  onAvatarUploaded
}) {
  if (!profile) return null;

  return (
    <ProfileSectionCard
      variant="student"
      title="البيانات الشخصية"
      description="الاسم ورقم الهاتف والصورة الظاهرة في المنصة."
      icon="user"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        <AvatarUpload
          name={form.full_name || profile.full_name}
          avatarUrl={form.avatar_url || profile.avatar_url}
          disabled={saving}
          onUploaded={onAvatarUploaded}
        />
        <div className="flex-1">
          <StudentPersonalInfoFields
            form={form}
            fieldErrors={fieldErrors}
            email={profile.email}
            onChange={onChange}
            disabled={saving}
          />
        </div>
      </div>
    </ProfileSectionCard>
  );
}
