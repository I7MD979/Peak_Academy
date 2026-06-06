import Icon from "@/components/shared/Icon";
import { authSelectClass } from "@/components/auth/auth-styles";
import { cn } from "@/lib/utils";

export default function AuthNativeSelect({ id, className, children, ...props }) {
  return (
    <div className="relative">
      <select id={id} className={cn(authSelectClass, "appearance-none pe-10", className)} {...props}>
        {children}
      </select>
      <Icon
        name="chevronDown"
        size={18}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-auth-on-surface-variant"
      />
    </div>
  );
}
