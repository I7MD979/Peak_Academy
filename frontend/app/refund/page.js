import LegalPageShell from "@/components/legal/LegalPageShell";
import { LEGAL_PAGES } from "@/lib/legal-pages";

export const metadata = {
  title: LEGAL_PAGES.refund.title,
  description: LEGAL_PAGES.refund.description,
  alternates: { canonical: LEGAL_PAGES.refund.href }
};

export default function RefundPage() {
  return (
    <LegalPageShell
      slug="refund"
      title={LEGAL_PAGES.refund.title}
      description={LEGAL_PAGES.refund.description}
    />
  );
}
