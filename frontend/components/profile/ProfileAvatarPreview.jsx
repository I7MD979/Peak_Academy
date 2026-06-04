import ProfileAvatar from "@/components/profile/ProfileAvatar";

export default function ProfileAvatarPreview({ name, avatarUrl }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-bg/60 p-5 text-center">
      <ProfileAvatar
        name={name}
        avatarUrl={avatarUrl}
        size="xl"
        className="border-border bg-primary/10 text-primary"
      />
      <div>
        <p className="text-sm font-bold text-text">{name || "—"}</p>
        <p className="mt-1 text-xs text-text-muted">معاينة الصورة كما تظهر في المنصة</p>
      </div>
    </div>
  );
}
