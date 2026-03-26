import type { Metadata } from 'next'
import SiteHeader from './components/home/SiteHeader'
import HeroSection from './components/home/HeroSection'
import TrustStrip from './components/home/TrustStrip'
import WhyChooseUsSection from './components/home/WhyChooseUsSection'
import HowItWorksSection from './components/home/HowItWorksSection'
import TrustLegitimacySection from './components/home/TrustLegitimacySection'
import JourneyPreviewSection from './components/home/JourneyPreviewSection'
import PrivateSaleComparisonSection from './components/home/PrivateSaleComparisonSection'
import FaqSection from './components/home/FaqSection'
import FinalCtaSection from './components/home/FinalCtaSection'
import SiteFooter from './components/home/SiteFooter'

export const metadata: Metadata = {
  title: 'MCar — Sell Your Car Without the Hassle',
  description:
    'Enter your registration for a free, no-obligation valuation backed by real vehicle data. A simpler way to sell your car.',
}

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        <HeroSection />
        <TrustStrip />
        <WhyChooseUsSection />
        <HowItWorksSection />
        <TrustLegitimacySection />
        <JourneyPreviewSection />
        <PrivateSaleComparisonSection />
        <FaqSection />
        <FinalCtaSection />
      </main>
      <SiteFooter />
    </>
  )
}
