import Icon from "@/components/shared/Icon";
import { cn } from "@/lib/utils";

/** يعرض اسم المادة؛ إذا كان icon نص إيموجي من DB يُعرض كنص، وإلا أيقونة كتاب افتراضية */
export default function SubjectBadge({ name, icon, className }) {
  const isEmoji = icon && /\p{Extended_Pictographic}/u.test(icon);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-accent-blue/10 px-3 py-1 text-xs font-bold text-accent-blue",
        className
      )}
    >
      {isEmoji ? (
        <span aria-hidden="true">{icon}</span>
      ) : (
        <Icon name="book" size={14} strokeWidth={2.25} />
      )}
      {name || "مادة"}
    </span>
  );
}
