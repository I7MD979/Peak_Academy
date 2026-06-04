import AuthLogoHeader from "@/components/auth/AuthLogoHeader";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

export const metadata = {
  title: "إعادة تعيين كلمة المرور | Peak Academy",
  description: "تعيين كلمة مرور جديدة"
};

export default function ResetPasswordPage() {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-gradient-to-b from-bg via-bg to-white p-4 font-cairo"
      dir="rtl"
    >
      <div className="w-full max-w-md">
        <AuthLogoHeader />
        <div className="rounded-3xl border border-border/80 bg-card p-8 shadow-[0_8px_35px_rgba(15,23,42,0.08)]">
          <h1 className="mb-1 text-2xl font-black text-text">كلمة مرور جديدة</h1>
          <p className="mb-6 text-sm text-text-muted">اختر كلمة مرور قوية لحسابك.</p>
          <ResetPasswordForm />
        </div>
      </div>
    </div>
  );
}
