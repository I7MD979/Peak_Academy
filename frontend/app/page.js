import LandingPage from "@/components/landing/LandingPage";
import { getLandingData, resolveHeroPromoLabel } from "@/lib/landing-api";

export const revalidate = 60;

export const metadata = {
  title: {
    absolute: "Peak Academy | مش بس حصص — ده مستقبلك"
  },
  description: "تجربة تعليمية تفاعلية حديثة للمرحلة الإعدادية والثانوية",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Peak Academy | أكاديمية الذروة",
    description: "جلسات لايف تفاعلية لطلاب الإعدادي والثانوي",
    url: "https://peak-academy.net",
    siteName: "Peak Academy",
    locale: "ar_EG",
    type: "website"
  }
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: "Peak Academy",
  alternateName: "أكاديمية الذروة",
  url: "https://peak-academy.net",
  logo: "https://peak-academy.net/brand/peak_academy_professional_logo.png",
  description: "تجربة تعليمية تفاعلية حديثة للمرحلة الإعدادية والثانوية",
  areaServed: "EG",
  inLanguage: "ar"
  // sameAs: ["https://www.facebook.com/...", "https://www.instagram.com/..."]
};

export default async function HomePage() {
  const landingData = await getLandingData();
  const heroPromo = resolveHeroPromoLabel(landingData?.promos);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingPage
        heroPromo={heroPromo}
        platformStats={landingData?.stats}
        stats={landingData?.stats}
        plans={landingData?.plans}
      />
    </>
  );
}
