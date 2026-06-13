import ContactPageShell from "@/components/legal/ContactPageShell";

export const metadata = {
  title: "تواصل معنا",
  description: "تواصل مع فريق Peak Academy عبر البريد الإلكتروني أو العنوان الرسمي.",
  alternates: { canonical: "/contact" }
};

export default function ContactPage() {
  return <ContactPageShell />;
}
