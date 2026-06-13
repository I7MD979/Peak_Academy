import { headers } from "next/headers";
import { Cairo } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import Providers from "./providers";
import { SpeedInsights } from "@vercel/speed-insights/next";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-cairo",
  display: "swap"
});

export const metadata = {
  metadataBase: new URL("https://peak-academy.net"),
  title: {
    default: "Peak Academy | منصة الثانوية العامة",
    template: "%s | Peak Academy"
  },
  description:
    "منصة تعليمية مصرية لطلاب الثانوية العامة: جلسات لايف، متابعة لوليّ الأمر، ومعلّمون معتمدون.",
  keywords: [
    "Peak Academy",
    "أكاديمية الذروة",
    "ثانوية عامة",
    "دروس أونلاين",
    "معلمين مصر",
    "جلسات لايف تعليمية",
    "منصة تعليمية مصرية"
  ],
  authors: [{ name: "Peak Academy" }],
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: "Peak Academy | أكاديمية الذروة",
    description:
      "منصة تعليمية مصرية لطلاب الثانوية العامة: جلسات لايف، متابعة لوليّ الأمر، ومعلّمون معتمدون.",
    url: "https://peak-academy.net",
    siteName: "Peak Academy",
    locale: "ar_EG",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Peak Academy | أكاديمية الذروة",
    description: "جلسات لايف تفاعلية لطلاب الإعدادي والثانوي"
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large"
    }
  },
  icons: {
    icon: [
      {
        url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%230c0f10'/%3E%3Cpath d='M16 6L24 22H8L16 6Z' fill='%23ff7a00'/%3E%3C/svg%3E",
        type: "image/svg+xml"
      }
    ]
  }
  // verification: { google: "ADD_SEARCH_CONSOLE_VERIFICATION_CODE_HERE" }
};

export default async function RootLayout({ children }) {
  const nonce = (await headers()).get("x-nonce") ?? "";

  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning className={cairo.variable}>
      <body className={`${cairo.className} bg-bg text-text antialiased`} suppressHydrationWarning>
        <Providers nonce={nonce}>{children}</Providers>
        <Toaster position="top-center" richColors />
        <SpeedInsights />
      </body>
    </html>
  );
}
