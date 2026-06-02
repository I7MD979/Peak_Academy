import "./globals.css";
import { Toaster } from "sonner";
import { Cairo } from "next/font/google";
import Providers from "./providers";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "600", "700", "900"]
});

export const metadata = {
  title: "Peak Academy",
  description: "Peak Academy - منصة تعليمية لطلاب الثانوية العامة",
  icons: {
    icon: [
      {
        url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%231e3a5f'/%3E%3Ctext x='16' y='22' font-size='16' text-anchor='middle' fill='white' font-family='sans-serif' font-weight='700'%3EP%3C/text%3E%3C/svg%3E",
        type: "image/svg+xml"
      }
    ]
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body
        className={`${cairo.className} bg-bg font-cairo text-text antialiased`}
        suppressHydrationWarning
      >
        <Providers>{children}</Providers>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
