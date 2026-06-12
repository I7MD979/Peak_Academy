import LegalPageShell from "@/components/legal/LegalPageShell";

export const metadata = {
  title: "سياسة الخصوصية | Peak Academy",
  description: "سياسة الخصوصية لمنصة Peak Academy"
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
