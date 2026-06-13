import Link from "next/link";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peak-orange/40 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-peak-orange text-white shadow-sm shadow-peak-orange/20 hover:brightness-110",
        accent: "bg-peak-orange text-white hover:brightness-110 shadow-sm shadow-peak-orange/20",
        outline:
          "border border-auth-outline-variant bg-auth-surface-highest text-auth-on-surface hover:bg-auth-surface-bright",
        ghost: "text-auth-on-surface-variant hover:bg-auth-surface-highest hover:text-auth-on-surface",
        destructive: "bg-danger text-white shadow-sm hover:bg-danger/90"
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-lg px-3 text-xs",
        lg: "h-11 rounded-xl px-6"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

function Button({ className, variant, size, href, type = "button", ...props }) {
  const classes = cn(buttonVariants({ variant, size, className }));

  if (href) {
    const { type: _ignored, ...linkProps } = props;
    return <Link href={href} className={classes} {...linkProps} />;
  }

  return <button type={type} className={classes} {...props} />;
}

export { Button, buttonVariants };
