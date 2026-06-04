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

export default function Home() {
  return (
    <div className="landing-page min-h-screen bg-white">
      <LandingHeader />
      <main>
        <LandingHero />
        <LandingPromoStrip />
        <LandingStats />
        <LandingHowItWorks />
        <LandingFeatures />
        <LandingPricing />
        <LandingJourney />
        <LandingCta />
      </main>
      <LandingFooter />
    </div>
  );
}
