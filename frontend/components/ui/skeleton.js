import { cn } from "../../lib/utils";

function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-outline-variant/15 dark:bg-surface-container-highest/70",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
