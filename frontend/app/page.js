import LandingPage from "@/components/landing/LandingPage";
import {
  getLandingData,
  mapPromosToRecord,
  resolveHeroPromoLabel
} from "@/lib/landing-api";

export const metadata = {
  title: "Peak Academy | مش بس حصص — ده مستقبلك",
  description: "تجربة تعليمية تفاعلية حديثة للمرحلة الإعدادية والثانوية",
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
  description: "تجربة تعليمية تفاعلية حديثة للمرحلة الإعدادية والثانوية",
  areaServed: "EG",
  inLanguage: "ar"
};

export default async function HomePage() {
  const landingData = await getLandingData();
  const promoCodes = mapPromosToRecord(landingData?.promos);
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
        promoCodes={promoCodes}
      />
    </>
  );
}
