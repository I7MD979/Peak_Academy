import Link from "next/link";
import AuthPageLayout from "@/components/auth/AuthPageLayout";
import AuthFormCard from "@/components/auth/AuthFormCard";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

export const metadata = {
  title: "نسيت كلمة المرور",
  description: "إعادة تعيين كلمة المرور"
};

export default function ForgotPasswordPage() {
  return (
    <AuthPageLayout>
      <AuthFormCard
        title="نسيت كلمة المرور؟"
        subtitle="أدخل بريدك وسنرسل لك رابطًا لإعادة تعيين كلمة المرور"
        footer={
          <p className="text-sm text-on-surface-variant">
            <Link href="/auth/login" className="font-bold text-md-primary hover:underline">
              العودة لتسجيل الدخول
            </Link>
          </p>
        }
      >
        <ForgotPasswordForm />
      </AuthFormCard>
    </AuthPageLayout>
  );
}
