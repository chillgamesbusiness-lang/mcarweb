import type { Metadata } from 'next'
import SiteHeader from './components/home/SiteHeader'
import HeroSection from './components/home/HeroSection'
import DataMarquee from './components/home/DataMarquee'
import RealitySection from './components/home/RealitySection'
import WhyChooseUsSection from './components/home/WhyChooseUsSection'
import HowItWorksSection from './components/home/HowItWorksSection'
import PrivateSaleComparisonSection from './components/home/PrivateSaleComparisonSection'
import FaqSection from './components/home/FaqSection'
import FinalCtaSection from './components/home/FinalCtaSection'
import SiteFooter from './components/home/SiteFooter'
import BackToTop from './components/home/BackToTop'

export const metadata: Metadata = {
  title: 'MCar — See What Your Car Is Actually Worth',
  description:
    'Enter your reg. We pull DVLA records, MOT history, and live market data to show you what buyers are actually paying — before anyone tries to lowball you.',
}

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="bg-background dark:bg-[#111111]">
        <HeroSection />
        <DataMarquee />
        <RealitySection />
        <WhyChooseUsSection />
        <HowItWorksSection />
        <PrivateSaleComparisonSection />
        <FaqSection />
        <FinalCtaSection />
      </main>
      <SiteFooter />
      <BackToTop />
    </>
  )
}
