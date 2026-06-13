import LegalPageShell from "@/components/legal/LegalPageShell";
import { LEGAL_PAGES } from "@/lib/legal-pages";

export const metadata = {
  title: LEGAL_PAGES.delivery.title,
  description: LEGAL_PAGES.delivery.description,
  alternates: { canonical: LEGAL_PAGES.delivery.href }
};

export default function DeliveryPage() {
  return (
    <LegalPageShell
      slug="delivery"
      title={LEGAL_PAGES.delivery.title}
      description={LEGAL_PAGES.delivery.description}
    />
  );
}
