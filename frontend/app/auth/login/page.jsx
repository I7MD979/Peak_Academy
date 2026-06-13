import Link from "next/link";
import AuthPageLayout from "@/components/auth/AuthPageLayout";
import AuthFormCard from "@/components/auth/AuthFormCard";
import LoginForm from "@/components/auth/LoginForm";
import { buildPlanCheckoutPath } from "@/lib/checkout-redirect";
import { sanitizeRedirectPath } from "@/lib/safe-redirect";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "تسجيل الدخول",
  description: "سجّل دخولك لمتابعة الجلسات، الأداء، والتقارير على منصة Peak Academy",
  alternates: { canonical: "/auth/login" }
};

export default function LoginPage({ searchParams }) {
  const redirectTo =
    buildPlanCheckoutPath(searchParams?.redirect, searchParams?.plan) ||
    sanitizeRedirectPath(searchParams?.redirect);

  return (
    <AuthPageLayout>
      <AuthFormCard
        title="أهلاً بك"
        subtitle="سجّل دخولك لمتابعة الجلسات، الأداء، والتقارير"
        footer={
          <p className="text-sm text-on-surface-variant">
            ليس لديك حساب؟{" "}
            <Link href="/auth/register" className="font-bold text-md-primary hover:underline">
              أنشئ حساباً الآن
            </Link>
          </p>
        }
      >
        <LoginForm redirectTo={redirectTo} oauthError={searchParams?.error === "oauth_failed"} />
      </AuthFormCard>
    </AuthPageLayout>
  );
}
