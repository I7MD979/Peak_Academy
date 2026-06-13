import Link from "next/link";
import AuthPageLayout from "@/components/auth/AuthPageLayout";
import AuthFormCard from "@/components/auth/AuthFormCard";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

export const metadata = {
  title: "إعادة تعيين كلمة المرور",
  description: "تعيين كلمة مرور جديدة"
};

export default function ResetPasswordPage() {
  return (
    <AuthPageLayout>
      <AuthFormCard
        title="كلمة مرور جديدة"
        subtitle="اختر كلمة مرور قوية لحسابك"
        footer={
          <p className="text-sm text-on-surface-variant">
            <Link href="/auth/login" className="font-bold text-md-primary hover:underline">
              العودة لتسجيل الدخول
            </Link>
          </p>
        }
      >
        <ResetPasswordForm />
      </AuthFormCard>
    </AuthPageLayout>
  );
}
