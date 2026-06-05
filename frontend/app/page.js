import { getLandingData, mapPlansToLanding } from "@/lib/landing-api";
import { landingPricingPlans, landingStats, demoPromoCodes } from "@/lib/landing-content";
import LandingHeader from "@/components/landing/LandingHeader";
import LandingHero from "@/components/landing/LandingHero";
import LandingPromoStrip from "@/components/landing/LandingPromoStrip";
import LandingStats from "@/components/landing/LandingStats";
import LandingHowItWorks from "@/components/landing/LandingHowItWorks";
import LandingFeatures from "@/components/landing/LandingFeatures";
import LandingPricing from "@/components/landing/LandingPricing";
import LandingJourney from "@/components/landing/LandingJourney";
import LandingCta from "@/components/landing/LandingCta";
import LandingFooter from "@/components/landing/LandingFooter";

export const metadata = {
  title: "Peak Academy | منصة الثانوية العامة",
  description:
    "منصة تعليمية مصرية لطلاب الثانوية العامة: جلسات لايف، متابعة لوليّ الأمر، ومعلّمون معتمدون."
};

export const revalidate = 300;

export default async function Home() {
  const liveData = await getLandingData();

  const stats = liveData?.stats?.length ? liveData.stats : landingStats;
  const plans = liveData?.plans?.length ? mapPlansToLanding(liveData.plans) : landingPricingPlans;
  const promoCodes = liveData?.promos?.length
    ? Object.fromEntries(liveData.promos.map((p) => [p.code, p.label]))
    : demoPromoCodes;

  return (
    <div className="landing-page min-h-screen bg-white">
      <LandingHeader />
      <main>
        <LandingHero />
        <LandingPromoStrip promoCodes={promoCodes} />
        <LandingStats stats={stats} />
        <LandingHowItWorks />
        <LandingFeatures />
        <LandingPricing plans={plans} />
        <LandingJourney />
        <LandingCta />
      </main>
      <LandingFooter />
    </div>
  );
}
