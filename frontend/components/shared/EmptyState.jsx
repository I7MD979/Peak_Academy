export default function EmptyState({ title = "لا توجد بيانات", description = "جرب لاحقاً أو غيّر الفلاتر." }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-white p-6 text-center">
      <p className="text-lg font-bold text-primary">{title}</p>
      <p className="mt-1 text-sm text-text-muted">{description}</p>
    </div>
  );
}
