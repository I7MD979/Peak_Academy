import Link from "next/link";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-white shadow-sm hover:bg-primary/90 hover:shadow-md",
        accent: "bg-accent text-white shadow-sm hover:bg-orange-500 hover:shadow-md",
        outline: "border border-border bg-card text-text hover:bg-bg",
        ghost: "text-text-muted hover:bg-bg hover:text-text",
        destructive: "bg-danger text-white shadow-sm hover:bg-red-500"
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
