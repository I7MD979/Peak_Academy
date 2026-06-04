import Link from "next/link";
import AuthLogoHeader from "@/components/auth/AuthLogoHeader";
import RegisterForm from "@/components/auth/RegisterForm";

export const metadata = {
  title: "إنشاء حساب | Peak Academy",
  description: "سجّل كطالب أو معلّم أو وليّ أمر في منصة Peak Academy للثانوية العامة"
};

export default function RegisterPage() {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-gradient-to-b from-bg via-bg to-white p-4 font-cairo"
      dir="rtl"
    >
      <div className="w-full max-w-lg">
        <AuthLogoHeader />

        <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-[0_8px_35px_rgba(15,23,42,0.08)] md:p-8">
          <h1 className="mb-1 text-2xl font-black text-text">إنشاء حساب جديد</h1>
          <p className="mb-6 text-sm leading-relaxed text-text-muted">
            انضم إلى Peak Academy بخطوتين: بيانات الدخول ثم اختيار دورك على المنصة.
          </p>

          <RegisterForm />
        </div>

        <p className="mt-5 text-center text-sm text-text-muted">
          لديك حساب بالفعل؟{" "}
          <Link href="/auth/login" className="font-bold text-accent hover:underline">
            سجّل الدخول
          </Link>
        </p>

        <p className="mt-3 text-center text-xs text-text-muted">
          <Link href="/" className="hover:text-primary hover:underline">
            العودة للصفحة الرئيسية
          </Link>
        </p>
      </div>
    </div>
  );
}
