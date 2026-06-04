import LandingHeader from "@/components/landing/LandingHeader";
import LandingHero from "@/components/landing/LandingHero";
import LandingStats from "@/components/landing/LandingStats";
import LandingHowItWorks from "@/components/landing/LandingHowItWorks";
import LandingFeatures from "@/components/landing/LandingFeatures";
import LandingPricing from "@/components/landing/LandingPricing";
import LandingPromoStrip from "@/components/landing/LandingPromoStrip";
import LandingJourney from "@/components/landing/LandingJourney";
import LandingCta from "@/components/landing/LandingCta";
import LandingFooter from "@/components/landing/LandingFooter";

export default function LandingPage() {
  return (
    <div className="landing-page min-h-screen scroll-smooth bg-white text-text">
      <LandingHeader />
      <main className="relative z-[1]">
        <LandingHero />
        <LandingStats />
        <LandingHowItWorks />
        <LandingFeatures />
        <LandingPricing />
        <LandingPromoStrip />
        <LandingJourney />
        <LandingCta />
      </main>
      <LandingFooter />
    </div>
  );
}
