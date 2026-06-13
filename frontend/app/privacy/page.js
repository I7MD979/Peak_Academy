import LegalPageShell from "@/components/legal/LegalPageShell";

export const metadata = {
  title: "سياسة الخصوصية",
  description: "سياسة الخصوصية لمنصة Peak Academy",
  alternates: { canonical: "/privacy" }
};

export default function PrivacyPage() {
  return (
    <LegalPageShell
      slug="privacy"
      title="سياسة الخصوصية"
      description="توضح هذه السياسة كيفية جمع بياناتك واستخدامها وحمايتها عند استخدامك للمنصة."
    />
  );
}
