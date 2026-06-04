import Link from "next/link";
import AuthLogoHeader from "@/components/auth/AuthLogoHeader";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

export const metadata = {
  title: "نسيت كلمة المرور | Peak Academy",
  description: "إعادة تعيين كلمة المرور"
};

export default function ForgotPasswordPage() {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-gradient-to-b from-bg via-bg to-white p-4 font-cairo"
      dir="rtl"
    >
      <div className="w-full max-w-md">
        <AuthLogoHeader />
        <div className="rounded-3xl border border-border/80 bg-card p-8 shadow-[0_8px_35px_rgba(15,23,42,0.08)]">
          <h1 className="mb-1 text-2xl font-black text-text">نسيت كلمة المرور؟</h1>
          <p className="mb-6 text-sm text-text-muted">
            أدخل بريدك وسنرسل لك رابطًا لإعادة تعيين كلمة المرور.
          </p>
          <ForgotPasswordForm />
        </div>
        <p className="mt-5 text-center text-sm text-text-muted">
          <Link href="/auth/login" className="font-bold text-accent hover:underline">
            العودة لتسجيل الدخول
          </Link>
        </p>
      </div>
    </div>
  );
}
