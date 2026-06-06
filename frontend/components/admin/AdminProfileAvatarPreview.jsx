import ProfileAvatar from "@/components/profile/ProfileAvatar";
import { adminCardSolid } from "@/lib/admin-styles";
import { cn } from "@/lib/utils";

export default function AdminProfileAvatarPreview({ name, avatarUrl }) {
  return (
    <div
      className={cn(
        adminCardSolid,
        "flex flex-col items-center gap-3 border border-dashed border-outline-variant bg-surface-container-low/40 p-5 text-center"
      )}
    >
      <ProfileAvatar
        name={name}
        avatarUrl={avatarUrl}
        size="xl"
        className="border-outline-variant bg-md-primary/15 text-md-primary"
      />
      <div>
        <p className="text-sm font-bold text-on-surface">{name || "—"}</p>
        <p className="mt-1 text-xs text-on-surface-variant">معاينة الصورة في القائمة والشريط العلوي</p>
      </div>
    </div>
  );
}
