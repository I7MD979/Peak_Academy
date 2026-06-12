import Link from "next/link";
import { CURRENT_TERMS_VERSION } from "@/lib/register-form";

export const metadata = {
  title: "سياسة الخصوصية | Peak Academy",
  description: "سياسة الخصوصية لمنصة Peak Academy"
};

export default function PrivacyPage() {
  return (
    <main dir="rtl" className="min-h-screen bg-landing-navy px-5 py-24 font-cairo text-white md:px-8">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm font-bold text-landing-orange hover:underline">
          ← العودة للرئيسية
        </Link>
        <h1 className="mt-8 text-3xl font-black">سياسة الخصوصية</h1>
        <p className="mt-3 text-sm font-semibold text-white/50">
          رقم الإصدار: {CURRENT_TERMS_VERSION} · آخر تحديث: يونيو 2026
        </p>
        <p className="mt-6 leading-relaxed text-white/65">
          نحترم خصوصية بياناتك في Peak Academy. لا نشارك معلوماتك الشخصية مع أطراف ثالثة إلا عند الضرورة
          لتشغيل الخدمة أو الامتثال للقانون. للاستفسارات:{" "}
          <a href="mailto:support@peak-academy.net" className="text-landing-orange hover:underline">
            support@peak-academy.net
          </a>
        </p>
      </div>
    </main>
  );
}
