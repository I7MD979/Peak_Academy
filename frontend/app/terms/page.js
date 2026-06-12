import LegalPageShell from "@/components/legal/LegalPageShell";

export const metadata = {
  title: "الشروط والأحكام | Peak Academy",
  description: "شروط استخدام منصة Peak Academy"
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
