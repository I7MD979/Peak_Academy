import Link from "next/link";
import Icon from "@/components/shared/Icon";
import { FOOTER_LEGAL_LINKS } from "@/lib/legal-pages";
import {
  SITE_ADDRESS_AR,
  SITE_ADDRESS_EN,
  SITE_BRAND_AR,
  SITE_EMAIL,
  SITE_PHONE
} from "@/lib/site-contact";

export default function ContactPageShell() {
  return (
    <main dir="rtl" className="min-h-screen bg-landing-navy px-5 py-24 font-cairo text-white md:px-8">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm font-bold text-landing-orange hover:underline">
          ← العودة للرئيسية
        </Link>

        <header className="mt-8 border-b border-white/10 pb-6">
          <h1 className="text-3xl font-black md:text-4xl">تواصل معنا</h1>
          <p className="mt-3 text-sm leading-relaxed text-white/60">
            فريق {SITE_BRAND_AR} جاهز لمساعدتك في الحساب، الاشتراك، الدفع، أو أي استفسار تقني.
          </p>
        </header>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <a
            href={`mailto:${SITE_EMAIL}`}
            className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition-colors hover:border-landing-orange/40"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-landing-orange/15 text-landing-orange">
              <Icon name="description" size={20} />
            </div>
            <h2 className="text-base font-bold text-white">البريد الإلكتروني</h2>
            <p className="mt-2 text-sm text-landing-orange" dir="ltr">
              {SITE_EMAIL}
            </p>
          </a>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-landing-orange/15 text-landing-orange">
              <Icon name="smartphone" size={20} />
            </div>
            <h2 className="text-base font-bold text-white">رقم الهاتف</h2>
            {SITE_PHONE ? (
              <a href={`tel:${SITE_PHONE.replace(/\s/g, "")}`} className="mt-2 block text-sm text-landing-orange" dir="ltr">
                {SITE_PHONE}
              </a>
            ) : (
              <p className="mt-2 text-sm leading-relaxed text-white/60">
                للدعم السريع، راسلنا على البريد الإلكتروني أعلاه — نرد خلال أوقات العمل.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 sm:col-span-2">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-landing-orange/15 text-landing-orange">
              <Icon name="globe" size={20} />
            </div>
            <h2 className="text-base font-bold text-white">العنوان</h2>
            <p className="mt-2 text-sm text-white/75">{SITE_ADDRESS_AR}</p>
            <p className="mt-1 text-sm text-white/50" dir="ltr">
              {SITE_ADDRESS_EN}
            </p>
          </div>
        </div>

        <section className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="text-lg font-black text-white">صفحات مفيدة</h2>
          <ul className="mt-4 space-y-2">
            {FOOTER_LEGAL_LINKS.map((page) => (
              <li key={page.href}>
                <Link href={page.href} className="text-sm text-white/70 transition-colors hover:text-landing-orange">
                  {page.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
