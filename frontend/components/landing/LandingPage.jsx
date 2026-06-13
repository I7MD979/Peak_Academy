import LandingHeader from "@/components/landing/LandingHeader";
import LandingHero from "@/components/landing/LandingHero";
import LandingStats from "@/components/landing/LandingStats";
import LandingLevels from "@/components/landing/LandingLevels";
import LandingHowItWorks from "@/components/landing/LandingHowItWorks";
import LandingFeatures from "@/components/landing/LandingFeatures";
import LandingPricing from "@/components/landing/LandingPricing";
import LandingPromoStrip from "@/components/landing/LandingPromoStrip";
import LandingTestimonials from "@/components/landing/LandingTestimonials";
import LandingCTA from "@/components/landing/LandingCta";
import LandingFooter from "@/components/landing/LandingFooter";
import LandingScrollEffects from "@/components/landing/LandingScrollEffects";

export default function LandingPage({ platformStats, stats, plans }) {
  return (
    <main dir="rtl" className="landing-page overflow-x-hidden font-cairo">
      <LandingScrollEffects />
      <LandingHeader />
      <LandingHero platformStats={platformStats} />
      <LandingStats stats={stats} />
      <LandingLevels />
      <LandingHowItWorks />
      <LandingFeatures />
      <LandingPricing plans={plans} />
      <LandingPromoStrip />
      <LandingTestimonials />
      <LandingCTA />
      <LandingFooter />
    </main>
  );
}
