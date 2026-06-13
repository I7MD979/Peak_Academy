import OnboardingClient from "@/components/auth/OnboardingClient";
import { readNextParam } from "@/lib/auth-redirect";

export const metadata = {
  title: "إكمال الملف الشخصي",
  description: "أكمل بيانات حسابك على منصة Peak Academy — خطوتك الأولى نحو التفوق الأكاديمي"
};

export const dynamic = "force-dynamic";

export default function OnboardingPage({ searchParams }) {
  const deferredReturn = readNextParam(searchParams);
  const levelParam = searchParams?.level ?? null;

  return <OnboardingClient deferredReturn={deferredReturn} levelParam={levelParam} />;
}
