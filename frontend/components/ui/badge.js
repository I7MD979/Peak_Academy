import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva("inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold", {
  variants: {
    variant: {
      default: "border border-auth-outline-variant/40 bg-auth-surface-highest text-auth-on-surface",
      success: "border border-success/30 bg-success/10 text-success",
      warning: "border border-warning/30 bg-warning/10 text-warning",
      destructive: "border border-danger/30 bg-danger/10 text-danger",
      info: "border border-accent-blue/30 bg-accent-blue/10 text-accent-blue"
    }
  },
  defaultVariants: {
    variant: "default"
  }
});

function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}

export { Badge, badgeVariants };
