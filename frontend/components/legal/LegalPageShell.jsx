import Link from "next/link";
import { CURRENT_TERMS_VERSION } from "@/lib/register-form";
import { LegalMarkdownBody, loadLegalMarkdown } from "@/lib/legal-markdown";

export default function LegalPageShell({ slug, title, description }) {
  const markdown = loadLegalMarkdown(slug);

  return (
    <main dir="rtl" className="min-h-screen bg-landing-navy px-5 py-24 font-cairo text-white md:px-8">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm font-bold text-landing-orange hover:underline">
          ← العودة للرئيسية
        </Link>

        <header className="mt-8 border-b border-white/10 pb-6">
          <h1 className="text-3xl font-black md:text-4xl">{title}</h1>
          <p className="mt-3 text-sm font-semibold text-white/50">
            رقم الإصدار: {CURRENT_TERMS_VERSION} · آخر تحديث: يونيو 2026
          </p>
          {description ? (
            <p className="mt-4 text-sm leading-relaxed text-white/60">{description}</p>
          ) : null}
        </header>

        <div className="mt-8">
          <LegalMarkdownBody markdown={markdown} />
        </div>
      </div>
    </main>
  );
}
