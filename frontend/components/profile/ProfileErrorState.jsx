import { Button } from "@/components/ui/button";

export default function ProfileErrorState({ message, onRetry }) {
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
      <p className="text-sm font-bold text-destructive">{message || "تعذر تحميل الملف الشخصي"}</p>
      {onRetry ? (
        <Button type="button" className="mt-3 rounded-xl" variant="outline" onClick={onRetry}>
          إعادة المحاولة
        </Button>
      ) : null}
    </div>
  );
}
