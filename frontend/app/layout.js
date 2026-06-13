import { headers } from "next/headers";
import { Cairo } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import Providers from "./providers";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-cairo",
  display: "swap"
});

export const metadata = {
  title: "Peak Academy | منصة الثانوية العامة",
  description:
    "منصة تعليمية مصرية لطلاب الثانوية العامة: جلسات لايف، متابعة لوليّ الأمر، ومعلّمون معتمدون.",
  icons: {
    icon: [
      {
        url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%231e3a5f'/%3E%3Ctext x='16' y='22' font-size='16' text-anchor='middle' fill='white' font-family='sans-serif' font-weight='700'%3EP%3C/text%3E%3C/svg%3E",
        type: "image/svg+xml"
      }
    ]
  }
};

export default async function RootLayout({ children }) {
  const nonce = (await headers()).get("x-nonce") ?? "";

  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning className={cairo.variable}>
      <body className={`${cairo.className} bg-bg text-text antialiased`} suppressHydrationWarning>
        <Providers nonce={nonce}>{children}</Providers>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
