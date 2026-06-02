export default function ProgressBar({ label, value }) {
  const clampedValue = Math.max(0, Math.min(100, Number(value) || 0));
  const widthClass =
    clampedValue >= 100
      ? "w-full"
      : clampedValue >= 90
      ? "w-11/12"
      : clampedValue >= 80
      ? "w-4/5"
      : clampedValue >= 70
      ? "w-3/4"
      : clampedValue >= 60
      ? "w-2/3"
      : clampedValue >= 50
      ? "w-1/2"
      : clampedValue >= 40
      ? "w-2/5"
      : clampedValue >= 30
      ? "w-1/3"
      : clampedValue >= 20
      ? "w-1/4"
      : clampedValue >= 10
      ? "w-1/12"
      : "w-0";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-text">{label}</span>
        <span className="font-semibold text-primary">{clampedValue}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div className={`h-full rounded-full bg-accent-blue transition-all ${widthClass}`} />
      </div>
    </div>
  );
}
