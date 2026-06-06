import Link from "next/link";
import AuthPageLayout from "@/components/auth/AuthPageLayout";
import AuthFormCard from "@/components/auth/AuthFormCard";
import RegisterForm from "@/components/auth/RegisterForm";
import { buildPlanCheckoutPath } from "@/lib/checkout-redirect";
import { sanitizeRedirectPath } from "@/lib/safe-redirect";

export const metadata = {
  title: "إنشاء حساب | Peak Academy",
  description: "سجّل كطالب أو معلّم أو وليّ أمر في منصة Peak Academy للثانوية العامة"
};

export default function RegisterPage({ searchParams }) {
  const redirectTo =
    buildPlanCheckoutPath(searchParams?.redirect, searchParams?.plan) ||
    sanitizeRedirectPath(searchParams?.redirect);

  return (
    <AuthPageLayout>
      <AuthFormCard
        className="max-w-[min(100%,34rem)]"
        title="إنشاء حساب جديد"
        subtitle="انضم إلى Peak Academy بخطوتين: بيانات الدخول ثم اختيار دورك على المنصة"
        footer={
          <p className="text-sm text-on-surface-variant">
            لديك حساب بالفعل؟{" "}
            <Link
              href={redirectTo ? `/auth/login?redirect=${encodeURIComponent(redirectTo)}` : "/auth/login"}
              className="font-bold text-md-primary hover:underline"
            >
              سجّل الدخول
            </Link>
          </p>
        }
      >
        <RegisterForm
          redirectTo={redirectTo}
          levelParam={searchParams?.level}
          planParam={searchParams?.plan}
        />
      </AuthFormCard>
    </AuthPageLayout>
  );
}
