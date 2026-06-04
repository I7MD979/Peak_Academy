import Link from "next/link";
import { Button } from "@/components/ui/button";
import Icon from "@/components/shared/Icon";

export default function LandingCta() {
  return (
    <section className="px-4 py-16 md:px-6 md:py-20" aria-labelledby="cta-heading">
      <div className="page-hero mx-auto max-w-6xl text-center">
        <h2 id="cta-heading" className="text-2xl font-black md:text-3xl">
          جاهز توصّل للقمة؟
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-white/80 md:text-base">
          أنشئ حسابك الآن واختر دورك — طالب، معلّم، أو وليّ أمر — وابدأ أول جلسة في دقائق.
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/auth/register">
            <Button variant="accent" size="lg" className="min-w-[200px] shadow-lg shadow-black/20">
              إنشاء حساب مجاني
            </Button>
          </Link>
          <Link href="/auth/login">
            <Button
              size="lg"
              className="min-w-[200px] border border-white/25 bg-transparent text-white hover:bg-white/10"
            >
              لديّ حساب بالفعل
              <Icon name="arrowRight" size={18} className="rotate-180" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
