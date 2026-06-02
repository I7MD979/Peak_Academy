import { cn } from "@/lib/utils";

export default function ProfileAvatar({ name, avatarUrl, size = "lg", className }) {
  const initial = (name || "م").trim().slice(0, 1);
  const sizes = {
    md: "h-14 w-14 text-lg rounded-xl",
    lg: "h-20 w-20 text-2xl rounded-2xl",
    xl: "h-24 w-24 text-3xl rounded-2xl"
  };

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden border-2 border-white/30 bg-white/10 font-black text-white",
        sizes[size] || sizes.lg,
        className
      )}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt={name || "الصورة الشخصية"} className="h-full w-full object-cover" />
      ) : (
        initial
      )}
    </div>
  );
}
