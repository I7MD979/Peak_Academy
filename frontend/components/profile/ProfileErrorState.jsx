import ErrorState from "@/components/shared/ErrorState";

export default function ProfileErrorState({ message, onRetry }) {
  return (
    <ErrorState
      message={message || "تعذر تحميل الملف الشخصي"}
      onRetry={onRetry}
      title="تعذر تحميل الملف الشخصي"
    />
  );
}
