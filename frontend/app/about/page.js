import LegalPageShell from "@/components/legal/LegalPageShell";
import { LEGAL_PAGES } from "@/lib/legal-pages";

export const metadata = {
  title: LEGAL_PAGES.about.title,
  description: LEGAL_PAGES.about.description,
  alternates: { canonical: LEGAL_PAGES.about.href }
};

export default function AboutPage() {
  return (
    <LegalPageShell
      slug="about"
      title={LEGAL_PAGES.about.title}
      description={LEGAL_PAGES.about.description}
    />
  );
}
