import LegalPageShell from "@/components/legal/LegalPageShell";

export const metadata = {
  title: "الشروط والأحكام",
  description: "شروط استخدام منصة Peak Academy",
  alternates: { canonical: "/terms" }
};

export default function TermsPage() {
  return (
    <LegalPageShell
      slug="terms"
      title="الشروط والأحكام"
      description="باستخدامك لمنصة Peak Academy فإنك توافق على الالتزام بهذه الشروط والأحكام."
    />
  );
}
