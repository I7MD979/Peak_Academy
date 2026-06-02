export default function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-danger/10 px-3 py-1 text-xs font-bold text-danger">
      <span className="h-2 w-2 animate-pulse rounded-full bg-danger" />
      مباشر
    </span>
  );
}
